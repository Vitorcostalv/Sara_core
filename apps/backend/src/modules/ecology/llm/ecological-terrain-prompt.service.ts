import { env } from "../../../config/env";
import { logger } from "../../../logging/logger";
import { createLlmProvider } from "../../llm/llm.provider";
import { biomePresetService } from "../simulation/biome-preset.service";
import { terrainGeneratorService } from "../simulation/terrain-generator.service";
import type { ReliefStyle, TerrainGrid } from "../simulation/terrain-generator.service";

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

const SYSTEM_PROMPT = `You are an ecosystem classifier for a 3D terrain generator.
Given a user description (in any language), identify which biome they want to generate.

Return ONLY a raw JSON object (no markdown, no code blocks), with this exact shape:
{"biomeSlug":"<slug>","displayName":"<name>","interpretation":"<one sentence in the same language as the user>"}

Available biome slugs (pick the closest match):
cerrado, pantanal, amazonia, caatinga, mata-atlantica, pampa, mangue,
deserto, tundra, taiga, floresta-temperada, pradaria, floresta-tropical, mediterraneo,
oceano, montanha, montanha-nevada, antartida, deserto-frio

Rules:
- biomeSlug must be one of the slugs listed above
- displayName is the human-readable name (in the user's language)
- interpretation is a single sentence describing your interpretation (in the user's language)
- Never include anything outside the JSON object`;

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

    let source: TerrainPromptResult["source"] = "default";
    let biomeName = "Ecossistema Genérico";
    let biomeSlug = "floresta-tropical";
    let interpretation = "Ecossistema genérico com parâmetros padrão.";
    let baseTemperatureC = 22;
    let basePrecipitationMm = 1400;
    let baseHumidityPct = 65;
    let reliefStyle: ReliefStyle | undefined;
    let seaLevel: number | undefined;

    // 1. Try LLM extraction
    const provider = createLlmProvider(env.llmProvider);
    if (provider && env.llmApiKey) {
      try {
        const generation = await provider.generateText({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt: input.prompt,
          model: env.llmModel || provider.defaultModel,
          apiKey: env.llmApiKey,
          baseUrl: normalizeBaseUrl(env.llmBaseUrl ?? provider.defaultBaseUrl),
          timeoutMs: Math.min(env.llmTimeoutMs, 15_000),
        });

        const parsed = tryParseLlmJson(generation.text);
        if (parsed) {
          const preset = biomePresetService.findBySlug(parsed.biomeSlug);
          if (preset) {
            source = "llm";
            biomeSlug = parsed.biomeSlug;
            biomeName = parsed.displayName;
            interpretation = parsed.interpretation;
            baseTemperatureC = preset.baseTemperatureC;
            basePrecipitationMm = preset.basePrecipitationMm;
            baseHumidityPct = preset.baseHumidityPct;
            reliefStyle = preset.reliefStyle;
            seaLevel = preset.seaLevel;
            terrainPromptLogger.info({ biomeSlug, source: "llm" }, "Biome extracted via LLM");
          }
        }
      } catch (err) {
        terrainPromptLogger.warn({ err }, "LLM biome extraction failed, falling back to keyword match");
      }
    }

    // 2. Fall back to keyword matching if LLM didn't work
    if (source === "default") {
      const match = biomePresetService.findByKeyword(input.prompt);
      if (match) {
        source = "keyword";
        biomeSlug = match.slug;
        biomeName = match.preset.displayName;
        interpretation = `Ecossistema identificado como "${match.preset.displayName}" por correspondência de palavras-chave.`;
        baseTemperatureC = match.preset.baseTemperatureC;
        basePrecipitationMm = match.preset.basePrecipitationMm;
        baseHumidityPct = match.preset.baseHumidityPct;
        reliefStyle = match.preset.reliefStyle;
        seaLevel = match.preset.seaLevel;
        terrainPromptLogger.info({ biomeSlug, source: "keyword" }, "Biome matched via keyword");
      } else {
        terrainPromptLogger.info({ prompt: input.prompt }, "No biome matched, using defaults");
      }
    }

    // 3. Generate terrain with resolved params
    baseTemperatureC = clampTemperatureForBiome(baseTemperatureC, reliefStyle, biomeSlug);
    const terrainParams = {
      baseTemperatureC,
      basePrecipitationMm,
      baseHumidityPct,
      width,
      height,
      seed,
      reliefStyle,
      seaLevel,
    };

    const terrain = terrainGeneratorService.generate(terrainParams);

    return {
      biomeName,
      biomeSlug,
      interpretation,
      terrainParams,
      terrain,
      source,
    };
  }
}

export const ecologicalTerrainPromptService = new EcologicalTerrainPromptService();
