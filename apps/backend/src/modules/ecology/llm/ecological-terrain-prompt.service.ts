import { env } from "../../../config/env";
import { logger } from "../../../logging/logger";
import { createLlmProvider } from "../../llm/llm.provider";
import { biomePresetService } from "../simulation/biome-preset.service";
import { terrainGeneratorService } from "../simulation/terrain-generator.service";
import type { ReliefStyle, TerrainGrid } from "../simulation/terrain-generator.service";
import type { TerrainFeatureHints } from "../simulation/terrain-features.service";

const terrainPromptLogger = logger.child({ module: "ecological-terrain-prompt" });

export interface TerrainPromptInput {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface TerrainPromptResult {
  biomeName: string;
  biomeSlug: string;
  interpretation: string;
  terrainParams: {
    baseTemperatureC: number;
    basePrecipitationMm: number;
    baseHumidityPct: number;
    width: number;
    height: number;
    seed: number;
    reliefStyle?: ReliefStyle;
    seaLevel?: number;
  };
  terrain: TerrainGrid;
  source: "llm" | "keyword" | "default";
}

interface LlmBiomeExtraction {
  biomeSlug: string;
  displayName: string;
  interpretation: string;
}

// Classification (independente de width/height/seed) — derivada do bioma canônico.
interface BiomeClassification {
  source: TerrainPromptResult["source"];
  biomeSlug: string;
  biomeName: string;
  interpretation: string;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  baseHumidityPct: number;
  reliefStyle?: ReliefStyle;
  seaLevel?: number;
  featureHints?: TerrainFeatureHints;
}

// Vocabulário FECHADO + descrições, construídos a partir dos presets (fonte única da verdade).
// O LLM só pode escolher um slug desta lista; o clima nunca é inventado por ele.
function buildSystemPrompt(): string {
  const catalog = biomePresetService
    .listAll()
    .map((p) => `- ${p.slug}${p.description ? ` — ${p.description}` : ""}`)
    .join("\n");

  return `You are an ecosystem classifier for a 3D terrain generator.
Given a user description (in any language), pick the single closest biome from the closed list below.

Return ONLY a raw JSON object (no markdown, no code blocks), with this exact shape:
{"biomeSlug":"<slug>","displayName":"<name>","interpretation":"<one sentence in the same language as the user>"}

Choose biomeSlug EXACTLY from this list (do NOT invent slugs, do NOT use any other vocabulary):
${catalog}

Rules:
- biomeSlug MUST be exactly one of the slugs above.
- Prefer the most specific match: snowy peaks → montanha-nevada (never tundra/montanha); polar coast or sea ice → antartida; open sea or archipelago → oceano.
- displayName is the human-readable name in the user's language.
- interpretation is a single sentence in the user's language.
- Never include anything outside the JSON object.`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

// Cache por prompt normalizado: mesmo texto → mesma classificação, sem re-bater no LLM
// (reduz consumo de quota e reforça o determinismo). Não depende de width/height/seed.
const classificationCache = new Map<string, BiomeClassification>();
const MAX_CACHE_ENTRIES = 200;

function normalizePrompt(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizePromptAscii(text: string): string {
  return normalizePrompt(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function featureHintsFromPrompt(prompt: string): TerrainFeatureHints | undefined {
  const text = normalizePromptAscii(prompt);
  const mentionsCave = /\b(caverna|cavernas|gruta|grutas|cave|caves)\b/.test(text);
  const mentionsMany = /\b(muitas|muitos|varias|varios|bastantes|many|several)\b/.test(text);
  const mentionsFew = /\b(algumas|alguns|poucas|poucos|few|some)\b/.test(text);
  const mentionsDeep = /\b(profunda|profundas|profundo|profundos|subterranea|subterraneas|deep)\b/.test(text);
  const mentionsRockyRelief =
    /\b(rocha|rochas|rochosa|rochoso|penhasco|penhascos|escarpa|escarpas|falésia|falesia|montanha|montanhas|serra|serras|ledge|cliff|mountain)\b/.test(
      text
    );

  if (!mentionsCave && !mentionsRockyRelief) return undefined;

  return {
    caveQuantity: mentionsCave ? (mentionsMany ? "many" : mentionsFew ? "few" : "few") : undefined,
    requireVisibleCaves: mentionsCave || undefined,
    preferDeepCave: mentionsDeep || undefined,
    rockyOutcrops: mentionsCave || mentionsRockyRelief || undefined,
  };
}

function cacheClassification(key: string, value: BiomeClassification): void {
  if (classificationCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = classificationCache.keys().next().value;
    if (oldest !== undefined) classificationCache.delete(oldest);
  }
  classificationCache.set(key, value);
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

// Defesa: garante que a temperatura base seja plausível para a classe de bioma classificada.
// Os presets já são corretos; este guard impede que qualquer valor absurdo (ex.: +33 °C para
// um bioma polar) chegue ao gerador, qualquer que seja a origem da classificação.
function clampTemperatureForBiome(
  tempC: number,
  reliefStyle: ReliefStyle | undefined,
  biomeSlug: string
): number {
  const isPolar = reliefStyle === "polar" || biomeSlug === "antartida";
  const isSnowyMountain = reliefStyle === "mountain" && biomeSlug === "montanha-nevada";
  if (isPolar && tempC > -5) {
    terrainPromptLogger.warn({ tempC, biomeSlug }, "Temperatura implausível para bioma polar — corrigida");
    return -22;
  }
  if (isSnowyMountain && tempC > 0) {
    terrainPromptLogger.warn({ tempC, biomeSlug }, "Temperatura implausível para montanha nevada — corrigida");
    return -8;
  }
  return tempC;
}

// Deterministic seed derived from the prompt: same description → same terrain (no Math.random).
function seedFromPrompt(text: string): number {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (Math.imul(hash, 31) + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 99999;
}

function tryParseLlmJson(text: string): LlmBiomeExtraction | null {
  try {
    const cleaned = text.replace(/```[a-z]*\n?/g, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const json = JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    if (
      typeof json === "object" &&
      json !== null &&
      "biomeSlug" in json &&
      "displayName" in json &&
      "interpretation" in json &&
      typeof (json as Record<string, unknown>).biomeSlug === "string" &&
      typeof (json as Record<string, unknown>).displayName === "string" &&
      typeof (json as Record<string, unknown>).interpretation === "string"
    ) {
      return json as LlmBiomeExtraction;
    }
    return null;
  } catch {
    return null;
  }
}

export class EcologicalTerrainPromptService {
  async generate(input: TerrainPromptInput): Promise<TerrainPromptResult> {
    const width = input.width ?? 48;
    const height = input.height ?? 36;
    const seed = input.seed ?? seedFromPrompt(input.prompt);

    const classification = await this.classify(input.prompt);

    // Defesa: temperatura sempre plausível para a classe de bioma antes de chegar ao gerador.
    const baseTemperatureC = clampTemperatureForBiome(
      classification.baseTemperatureC,
      classification.reliefStyle,
      classification.biomeSlug
    );

    const terrainParams = {
      baseTemperatureC,
      basePrecipitationMm: classification.basePrecipitationMm,
      baseHumidityPct: classification.baseHumidityPct,
      width,
      height,
      seed,
      reliefStyle: classification.reliefStyle,
      seaLevel: classification.seaLevel,
    };

    const terrain = terrainGeneratorService.generate({
      ...terrainParams,
      featureHints: classification.featureHints,
    });

    return {
      biomeName: classification.biomeName,
      biomeSlug: classification.biomeSlug,
      interpretation: classification.interpretation,
      terrainParams,
      terrain,
      source: classification.source,
    };
  }

  /**
   * Classifica o bioma a partir do texto. Constrangido ao enum canônico (presets): o LLM só
   * escolhe um slug e o clima/relevo vêm SEMPRE da definição canônica — nunca inventados.
   * Caminho: cache → LLM (slug validado contra o enum) → keyword (mesmo enum) → default coerente.
   */
  private async classify(prompt: string): Promise<BiomeClassification> {
    const cacheKey = normalizePrompt(prompt);
    const cached = classificationCache.get(cacheKey);
    if (cached) return cached;

    const fromPreset = (
      source: BiomeClassification["source"],
      slug: string,
      biomeName: string,
      interpretation: string,
      preset: { baseTemperatureC: number; basePrecipitationMm: number; baseHumidityPct: number; reliefStyle?: ReliefStyle; seaLevel?: number }
    ): BiomeClassification => ({
      source,
      biomeSlug: slug,
      biomeName,
      interpretation,
      baseTemperatureC: preset.baseTemperatureC,
      basePrecipitationMm: preset.basePrecipitationMm,
      baseHumidityPct: preset.baseHumidityPct,
      reliefStyle: preset.reliefStyle,
      seaLevel: preset.seaLevel,
      featureHints: featureHintsFromPrompt(prompt),
    });

    // 1. LLM constrangido ao enum (slug rejeitado se não houver preset correspondente).
    const provider = createLlmProvider(env.llmProvider);
    if (provider && env.llmApiKey) {
      try {
        const generation = await provider.generateText({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: prompt,
          model: env.llmModel || provider.defaultModel,
          apiKey: env.llmApiKey,
          baseUrl: normalizeBaseUrl(env.llmBaseUrl ?? provider.defaultBaseUrl),
          timeoutMs: Math.min(env.llmTimeoutMs, 15_000),
        });

        const parsed = tryParseLlmJson(generation.text);
        if (parsed) {
          const preset = biomePresetService.findBySlug(parsed.biomeSlug);
          if (preset) {
            terrainPromptLogger.info({ biomeSlug: parsed.biomeSlug, source: "llm" }, "Biome extracted via LLM");
            const result = fromPreset("llm", parsed.biomeSlug, parsed.displayName, parsed.interpretation, preset);
            cacheClassification(cacheKey, result);
            return result;
          }
          terrainPromptLogger.warn({ biomeSlug: parsed.biomeSlug }, "LLM returned an unknown biome slug — rejected, falling back to keyword");
        }
      } catch (err) {
        terrainPromptLogger.warn({ err }, "LLM biome extraction failed, falling back to keyword match");
      }
    }

    // 2. Keyword no MESMO enum canônico.
    const match = biomePresetService.findByKeyword(prompt);
    if (match) {
      terrainPromptLogger.info({ biomeSlug: match.slug, source: "keyword" }, "Biome matched via keyword");
      const result = fromPreset(
        "keyword",
        match.slug,
        match.preset.displayName,
        `Ecossistema identificado como "${match.preset.displayName}" por correspondência de palavras-chave.`,
        match.preset
      );
      cacheClassification(cacheKey, result);
      return result;
    }

    // 3. Default coerente (floresta tropical genérica), nunca uma "salada".
    terrainPromptLogger.info({ prompt }, "No biome matched, using coherent default (floresta-tropical)");
    const fallbackPreset = biomePresetService.findBySlug("floresta-tropical");
    const result: BiomeClassification = fallbackPreset
      ? fromPreset(
          "default",
          "floresta-tropical",
          "Ecossistema Genérico",
          "Ecossistema genérico com parâmetros padrão.",
          fallbackPreset
        )
      : {
          source: "default",
          biomeSlug: "floresta-tropical",
          biomeName: "Ecossistema Genérico",
          interpretation: "Ecossistema genérico com parâmetros padrão.",
          baseTemperatureC: 22,
          basePrecipitationMm: 1400,
          baseHumidityPct: 65,
        };
    cacheClassification(cacheKey, result);
    return result;
  }
}

export const ecologicalTerrainPromptService = new EcologicalTerrainPromptService();
