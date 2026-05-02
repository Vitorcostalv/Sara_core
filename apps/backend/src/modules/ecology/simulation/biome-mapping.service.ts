/**
 * Biome mapping service — MVP implementation.
 * Assigns an ecosystem slug based on simplified Whittaker + Köppen rules.
 * SIMPLIFICATION: thresholds are heuristic, not from calibrated ecological models.
 * Real biome assignment requires continuous spatial data, soil maps, and disturbance history.
 */

export interface BiomeInput {
  temperatureC: number;
  precipitationMmYear: number;
  humidityPct: number;
  elevationNorm: number;  // 0–1 normalised
  salinityPsu?: number;
  disturbanceLevel?: number; // 0–1
}

export interface BiomeMappingResult {
  ecosystemSlug: string;
  ecosystemTitle: string;
  confidence: number;           // 0–1 heuristic confidence
  matchedCriteria: string[];
  warningNotes: string[];
  simulationNote: string;
}

// ─── Rule table ───────────────────────────────────────────────────────────────

interface BiomeRule {
  slug: string;
  title: string;
  minTempC: number;
  maxTempC: number;
  minPrecipMm: number;
  maxPrecipMm: number;
  maxElevationNorm: number;
  requiresSalinity: boolean;
  criteria: string[];
}

const BIOME_RULES: BiomeRule[] = [
  {
    slug: "tundra",
    title: "Tundra",
    minTempC: -50, maxTempC: 2,
    minPrecipMm: 0, maxPrecipMm: 600,
    maxElevationNorm: 1,
    requiresSalinity: false,
    criteria: ["temperature < 2°C"],
  },
  {
    slug: "taiga",
    title: "Taiga",
    minTempC: -20, maxTempC: 8,
    minPrecipMm: 300, maxPrecipMm: 1500,
    maxElevationNorm: 0.9,
    requiresSalinity: false,
    criteria: ["temperature -20–8°C", "precipitation 300–1500mm"],
  },
  {
    slug: "deserto-frio",
    title: "Deserto frio",
    minTempC: -20, maxTempC: 15,
    minPrecipMm: 0, maxPrecipMm: 300,
    maxElevationNorm: 1,
    requiresSalinity: false,
    criteria: ["temperature < 15°C", "precipitation < 300mm"],
  },
  {
    slug: "deserto-quente",
    title: "Deserto quente",
    minTempC: 15, maxTempC: 50,
    minPrecipMm: 0, maxPrecipMm: 250,
    maxElevationNorm: 0.7,
    requiresSalinity: false,
    criteria: ["temperature > 15°C", "precipitation < 250mm"],
  },
  {
    slug: "caatinga",
    title: "Caatinga",
    minTempC: 18, maxTempC: 35,
    minPrecipMm: 250, maxPrecipMm: 800,
    maxElevationNorm: 0.6,
    requiresSalinity: false,
    criteria: ["temperature 18–35°C", "precipitation 250–800mm", "semiarid tropical"],
  },
  {
    slug: "pradaria-estepe",
    title: "Pradaria e estepe",
    minTempC: -5, maxTempC: 22,
    minPrecipMm: 300, maxPrecipMm: 700,
    maxElevationNorm: 0.7,
    requiresSalinity: false,
    criteria: ["temperate", "precipitation 300–700mm"],
  },
  {
    slug: "chaparral",
    title: "Chaparral",
    minTempC: 10, maxTempC: 25,
    minPrecipMm: 300, maxPrecipMm: 800,
    maxElevationNorm: 0.6,
    requiresSalinity: false,
    criteria: ["mediterranean temp", "dry summer"],
  },
  {
    slug: "savana-tropical",
    title: "Savana tropical",
    minTempC: 18, maxTempC: 35,
    minPrecipMm: 700, maxPrecipMm: 1500,
    maxElevationNorm: 0.5,
    requiresSalinity: false,
    criteria: ["tropical", "precipitation 700–1500mm", "seasonal"],
  },
  {
    slug: "cerrado",
    title: "Cerrado",
    minTempC: 18, maxTempC: 28,
    minPrecipMm: 800, maxPrecipMm: 1800,
    maxElevationNorm: 0.5,
    requiresSalinity: false,
    criteria: ["neotropical savanna", "precipitation 800–1800mm", "acid soils"],
  },
  {
    slug: "floresta-tropical-seca",
    title: "Floresta tropical seca",
    minTempC: 20, maxTempC: 35,
    minPrecipMm: 500, maxPrecipMm: 1500,
    maxElevationNorm: 0.5,
    requiresSalinity: false,
    criteria: ["tropical", "seasonal dry", "precipitation 500–1500mm"],
  },
  {
    slug: "mata-atlantica",
    title: "Mata Atlântica",
    minTempC: 16, maxTempC: 28,
    minPrecipMm: 1200, maxPrecipMm: 2000,
    maxElevationNorm: 0.7,
    requiresSalinity: false,
    criteria: ["humid atlantic coast", "precipitation 1200–2000mm"],
  },
  {
    slug: "floresta-tropical-umida",
    title: "Floresta tropical úmida",
    minTempC: 22, maxTempC: 35,
    minPrecipMm: 2000, maxPrecipMm: 8000,
    maxElevationNorm: 0.4,
    requiresSalinity: false,
    criteria: ["temperature > 22°C", "precipitation > 2000mm"],
  },
  {
    slug: "manguezal",
    title: "Manguezal",
    minTempC: 15, maxTempC: 35,
    minPrecipMm: 500, maxPrecipMm: 8000,
    maxElevationNorm: 0.15,
    requiresSalinity: true,
    criteria: ["coastal", "salinity > 0", "low elevation"],
  },
  {
    slug: "pantanal",
    title: "Pantanal",
    minTempC: 18, maxTempC: 30,
    minPrecipMm: 800, maxPrecipMm: 1500,
    maxElevationNorm: 0.2,
    requiresSalinity: false,
    criteria: ["tropical", "seasonal floodplain", "low elevation"],
  },
  {
    slug: "oceano-pelagico",
    title: "Oceano pelágico",
    minTempC: -5, maxTempC: 35,
    minPrecipMm: 0, maxPrecipMm: 8000,
    maxElevationNorm: 0.15,
    requiresSalinity: true,
    criteria: ["marine", "salinity > 30 PSU"],
  },
];

export class BiomeMappingService {
  map(input: BiomeInput): BiomeMappingResult {
    const salinity = input.salinityPsu ?? 0;
    const elevation = input.elevationNorm ?? 0.5;

    const candidates: Array<{ rule: BiomeRule; score: number }> = [];

    for (const rule of BIOME_RULES) {
      if (input.temperatureC < rule.minTempC || input.temperatureC > rule.maxTempC) continue;
      if (input.precipitationMmYear < rule.minPrecipMm || input.precipitationMmYear > rule.maxPrecipMm) continue;
      if (elevation > rule.maxElevationNorm) continue;
      if (rule.requiresSalinity && salinity < 1) continue;
      if (!rule.requiresSalinity && salinity > 5) continue;

      // Score: temperature and precipitation fit quality
      const tempRange = rule.maxTempC - rule.minTempC || 1;
      const precipRange = rule.maxPrecipMm - rule.minPrecipMm || 1;
      const tempScore = 1 - Math.abs(input.temperatureC - (rule.minTempC + rule.maxTempC) / 2) / tempRange;
      const precipScore = 1 - Math.abs(input.precipitationMmYear - (rule.minPrecipMm + rule.maxPrecipMm) / 2) / precipRange;
      candidates.push({ rule, score: (tempScore + precipScore) / 2 });
    }

    if (candidates.length === 0) {
      return {
        ecosystemSlug: "pradaria-estepe",
        ecosystemTitle: "Pradaria e estepe (fallback)",
        confidence: 0.1,
        matchedCriteria: [],
        warningNotes: [
          "Nenhuma regra de bioma foi satisfeita com os parâmetros fornecidos. Fallback para pradaria-estepe.",
        ],
        simulationNote: "MVP biome mapping. Thresholds are heuristic, not calibrated ecological models.",
      };
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0]!;
    const confidence = Math.min(0.95, Math.max(0.1, best.score));

    const warnings: string[] = [];
    if (confidence < 0.4) warnings.push("Baixa confiança no mapeamento. Parâmetros ambíguos.");
    if (input.disturbanceLevel && input.disturbanceLevel > 0.6) {
      warnings.push("Alto nível de distúrbio — bioma pode estar em transição ou degradado.");
    }

    return {
      ecosystemSlug: best.rule.slug,
      ecosystemTitle: best.rule.title,
      confidence: Math.round(confidence * 100) / 100,
      matchedCriteria: best.rule.criteria,
      warningNotes: warnings,
      simulationNote:
        "MVP biome mapping based on simplified Whittaker + Köppen rules. " +
        "Real biome assignment requires spatial soil data, land use history, and disturbance regimes.",
    };
  }

  mapGrid(cells: Array<{ temperatureC: number; precipitationMmYear: number; humidityPct: number; elevationNorm: number; salinityPsu: number }>): BiomeMappingResult[] {
    return cells.map((cell) =>
      this.map({
        temperatureC: cell.temperatureC,
        precipitationMmYear: cell.precipitationMmYear,
        humidityPct: cell.humidityPct,
        elevationNorm: cell.elevationNorm,
        salinityPsu: cell.salinityPsu,
      })
    );
  }
}

export const biomeMappingService = new BiomeMappingService();
