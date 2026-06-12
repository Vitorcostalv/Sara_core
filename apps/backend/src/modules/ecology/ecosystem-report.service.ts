import { ecologicalContextBuilderService } from "./grounding/ecological-context-builder.service";
import { faunaDefinitionService } from "./simulation/fauna-definition.service";
import type { SpeciesDefinition } from "./simulation/fauna-definition.service";
import {
  ecologicalTerrainPromptService,
  type TerrainPromptResult,
} from "./llm/ecological-terrain-prompt.service";
import type { TerrainGrid } from "./simulation/terrain-generator.service";

// Slugs de bioma do prompt-terrain que não batem 1:1 com o slug de ecossistema no banco.
const ECOSYSTEM_SLUG_ALIASES: Record<string, string[]> = {
  mangue: ["manguezal"],
  amazonia: ["floresta-amazonica", "floresta-tropical-umida"],
  "floresta-tropical": ["floresta-tropical-umida"],
};

export interface EcosystemReportInput {
  prompt: string;
  width?: number;
  height?: number;
  seed?: number;
}

export interface ClimateSummary {
  baseTemperatureC: number;
  basePrecipitationMm: number;
  baseHumidityPct: number;
  temperatureRangeC: [number, number];
  precipitationRangeMm: [number, number];
  humidityRangePct: [number, number];
  dominantClimateCode: string;
  climateCodes: Array<{ code: string; pct: number }>;
}

export interface ReliefSummary {
  elevationMin: number;
  elevationMax: number;
  elevationMean: number;
  ruggedness: number;
  waterCoveragePct: number;
  cellCount: number;
  width: number;
  height: number;
}

export interface VegetationSummary {
  dominantBiomes: Array<{ biome: string; pct: number }>;
  description: string;
}

export interface FaunaSummary {
  totalSpecies: number;
  totalPopulation: number;
  byCategory: Array<{ category: string; count: number }>;
  species: Array<{ commonName: string; scientificName: string; category: string }>;
}

export interface AbioticFactor {
  label: string;
  value: number;
  unit: string;
}

export interface ScientificFact {
  title: string;
  text: string;
  category: string;
  citationKey: string | null;
  year: number | null;
}

export interface ScientificExplanation {
  grounded: boolean;
  coverage: "sufficient" | "insufficient";
  facts: ScientificFact[];
  sources: string[];
}

export interface EcosystemReport {
  climate: ClimateSummary;
  relief: ReliefSummary;
  vegetation: VegetationSummary;
  fauna: FaunaSummary;
  abioticFactors: AbioticFactor[];
  scientificExplanation: ScientificExplanation;
  limitations: string[];
}

export interface EcosystemReportResult extends TerrainPromptResult {
  species: SpeciesDefinition[];
  report: EcosystemReport;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function describeTemperature(c: number): string {
  if (c < 0) return "muito frio";
  if (c < 10) return "frio";
  if (c < 18) return "temperado";
  if (c < 26) return "quente";
  return "muito quente";
}

function describePrecipitation(mm: number): string {
  if (mm < 400) return "árida";
  if (mm < 900) return "baixa";
  if (mm < 1800) return "moderada";
  return "alta";
}

function summarizeClimate(grid: TerrainGrid, baseHumidityPct: number): ClimateSummary {
  let tMin = Infinity;
  let tMax = -Infinity;
  let pMin = Infinity;
  let pMax = -Infinity;
  let hMin = Infinity;
  let hMax = -Infinity;
  const codeCounts = new Map<string, number>();
  let total = 0;

  for (const row of grid.cells) {
    for (const cell of row) {
      total += 1;
      tMin = Math.min(tMin, cell.temperatureC);
      tMax = Math.max(tMax, cell.temperatureC);
      pMin = Math.min(pMin, cell.precipitationMmYear);
      pMax = Math.max(pMax, cell.precipitationMmYear);
      hMin = Math.min(hMin, cell.humidityPct);
      hMax = Math.max(hMax, cell.humidityPct);
      codeCounts.set(cell.climateCode, (codeCounts.get(cell.climateCode) ?? 0) + 1);
    }
  }

  const climateCodes = Array.from(codeCounts.entries())
    .map(([code, count]) => ({ code, pct: round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);

  return {
    baseTemperatureC: grid.baseTemperatureC,
    basePrecipitationMm: grid.basePrecipitationMm,
    baseHumidityPct,
    temperatureRangeC: [round(tMin), round(tMax)],
    precipitationRangeMm: [Math.round(pMin), Math.round(pMax)],
    humidityRangePct: [Math.round(hMin), Math.round(hMax)],
    dominantClimateCode: climateCodes[0]?.code ?? "—",
    climateCodes: climateCodes.slice(0, 5),
  };
}

function summarizeRelief(grid: TerrainGrid): ReliefSummary {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let sumSq = 0;
  let water = 0;
  let total = 0;

  for (const row of grid.cells) {
    for (const cell of row) {
      total += 1;
      min = Math.min(min, cell.elevation);
      max = Math.max(max, cell.elevation);
      sum += cell.elevation;
      sumSq += cell.elevation * cell.elevation;
      if (cell.isWater) water += 1;
    }
  }

  const mean = total > 0 ? sum / total : 0;
  const variance = total > 0 ? Math.max(0, sumSq / total - mean * mean) : 0;

  return {
    elevationMin: round(min, 2),
    elevationMax: round(max, 2),
    elevationMean: round(mean, 2),
    ruggedness: round(Math.sqrt(variance), 2),
    waterCoveragePct: round((water / total) * 100),
    cellCount: total,
    width: grid.width,
    height: grid.height,
  };
}

function summarizeVegetation(grid: TerrainGrid, climate: ClimateSummary): VegetationSummary {
  const counts = new Map<string, number>();
  let total = 0;
  for (const row of grid.cells) {
    for (const cell of row) {
      total += 1;
      counts.set(cell.biomeSuggestion, (counts.get(cell.biomeSuggestion) ?? 0) + 1);
    }
  }

  const dominantBiomes = Array.from(counts.entries())
    .map(([biome, count]) => ({ biome, pct: round((count / total) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  const top = dominantBiomes[0];
  const tempWord = describeTemperature(climate.baseTemperatureC);
  const precipWord = describePrecipitation(climate.basePrecipitationMm);
  const description = top
    ? `Cobertura dominada por "${top.biome}" (${top.pct}%), consistente com clima ${tempWord} e precipitação ${precipWord}.`
    : "Sem cobertura de vegetação identificável no grid gerado.";

  return { dominantBiomes, description };
}

function summarizeFauna(species: SpeciesDefinition[]): FaunaSummary {
  const byCategoryMap = new Map<string, number>();
  let totalPopulation = 0;
  for (const s of species) {
    byCategoryMap.set(s.category, (byCategoryMap.get(s.category) ?? 0) + 1);
    totalPopulation += s.populationTarget;
  }

  return {
    totalSpecies: species.length,
    totalPopulation,
    byCategory: Array.from(byCategoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count),
    species: species.map((s) => ({
      commonName: s.commonName,
      scientificName: s.scientificName,
      category: s.category,
    })),
  };
}

function buildAbioticFactors(climate: ClimateSummary, relief: ReliefSummary, avgSalinity: number): AbioticFactor[] {
  return [
    { label: "Temperatura base", value: climate.baseTemperatureC, unit: "°C" },
    { label: "Precipitação base", value: climate.basePrecipitationMm, unit: "mm/ano" },
    { label: "Umidade base", value: climate.baseHumidityPct, unit: "%" },
    { label: "Cobertura de água", value: relief.waterCoveragePct, unit: "%" },
    { label: "Elevação média", value: relief.elevationMean, unit: "0–1" },
    { label: "Salinidade média", value: round(avgSalinity), unit: "PSU" },
  ];
}

function averageSalinity(grid: TerrainGrid): number {
  let sum = 0;
  let total = 0;
  for (const row of grid.cells) {
    for (const cell of row) {
      sum += cell.salinityPsu;
      total += 1;
    }
  }
  return total > 0 ? sum / total : 0;
}

export class EcosystemReportService {
  async generate(input: EcosystemReportInput): Promise<EcosystemReportResult> {
    // 1. Texto → bioma + terreno (reaproveita o serviço existente)
    const terrainResult = await ecologicalTerrainPromptService.generate({
      prompt: input.prompt,
      width: input.width,
      height: input.height,
      seed: input.seed,
    });

    // 2. Fauna compatível com os biomas do grid
    const { species } = faunaDefinitionService.resolve(terrainResult.terrain);

    // 3. Grounding científico para o bioma identificado
    const ecosystemSlugs = [
      terrainResult.biomeSlug,
      ...(ECOSYSTEM_SLUG_ALIASES[terrainResult.biomeSlug] ?? []),
    ];
    const context = await ecologicalContextBuilderService.buildContext({
      prompt: `${terrainResult.biomeName}. ${input.prompt}`,
      ecosystems: ecosystemSlugs,
      maxFacts: 12,
    });

    // 4. Compõe o relatório
    const climate = summarizeClimate(terrainResult.terrain, terrainResult.terrainParams.baseHumidityPct);
    const relief = summarizeRelief(terrainResult.terrain);
    const vegetation = summarizeVegetation(terrainResult.terrain, climate);
    const fauna = summarizeFauna(species);
    const abioticFactors = buildAbioticFactors(climate, relief, averageSalinity(terrainResult.terrain));

    const scientificExplanation: ScientificExplanation = {
      grounded: context.facts.length > 0,
      coverage: context.coverage.sufficient ? "sufficient" : "insufficient",
      facts: context.facts.map((f) => ({
        title: f.title,
        text: f.valuePreview,
        category: f.category,
        citationKey: f.sourceCitationKey,
        year: f.sourceYear,
      })),
      sources: Array.from(
        new Set(context.facts.map((f) => f.sourceCitationKey).filter((k): k is string => Boolean(k)))
      ),
    };

    const limitations = buildLimitations(terrainResult, context.facts.length, context.coverage.sufficient, species.length);

    return {
      ...terrainResult,
      species,
      report: {
        climate,
        relief,
        vegetation,
        fauna,
        abioticFactors,
        scientificExplanation,
        limitations,
      },
    };
  }
}

function buildLimitations(
  terrain: TerrainPromptResult,
  factCount: number,
  coverageSufficient: boolean,
  speciesCount: number
): string[] {
  const limitations: string[] = [];

  if (terrain.source === "default") {
    limitations.push(
      "Não foi possível identificar o bioma a partir da descrição; foram usados parâmetros genéricos."
    );
  } else if (terrain.source === "keyword") {
    limitations.push(
      "Bioma inferido por correspondência de palavras-chave, sem interpretação por IA (provider LLM desabilitado)."
    );
  }

  if (factCount === 0) {
    limitations.push("Nenhum fato científico do banco cobre este bioma; a explicação fica sem grounding.");
  } else if (!coverageSufficient) {
    limitations.push("Cobertura científica parcial no banco para este bioma — a explicação é limitada.");
  }

  if (speciesCount === 0) {
    limitations.push("Nenhuma espécie do catálogo é compatível com os biomas gerados.");
  }

  limitations.push(
    "O terreno é uma simulação procedural sintética (ruído de valor determinístico), não dados geográficos reais."
  );

  return limitations;
}

export const ecosystemReportService = new EcosystemReportService();
