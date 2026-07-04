import type { ResourceType } from "./resource-base";

// ─── Curated ecosystem profiles (deterministic reference data) ──────────────────
//
// Small, versioned, source-noted profiles for ecologically relevant ecosystems (Brazil-first).
// These are NOT a full external import: they are a curated MVP layer that documents the expected
// climate, substrate, water and resource/fauna context of each ecosystem, so the report and the
// plausibility evaluator can reason against a grounded reference instead of ad-hoc constants.
//
// `compatibleBiomes` uses the terrain generator's biomeSuggestion vocabulary, so a profile can be
// cross-checked against the deterministic fauna/resource resolution.

export type EcosystemMedium = "terrestrial" | "aquatic" | "mixed" | "cave" | "coastal";
export type WaterPresence = "none" | "freshwater" | "brackish" | "marine";

export interface EcosystemProfile {
  slug: string;
  displayName: string;
  medium: EcosystemMedium;
  /** Terrain biomeSuggestion slugs that realize this ecosystem. */
  compatibleBiomes: string[];
  climate: {
    temperatureRangeC: [number, number];
    rainfallMmYear: [number, number];
    humidityPct: [number, number];
  };
  substrateNotes: string;
  water: { presence: WaterPresence; salinityRangePsu: [number, number] };
  /** Basal resource types expected to dominate the productive base. */
  dominantResources: ResourceType[];
  /** Coarse fauna groups expected (taxon/functional tags, for reporting). */
  compatibleFaunaGroups: string[];
  /** Conditions that make the ecosystem implausible if present. */
  incompatibleConditions: string[];
  sourceNotes: string;
  confidence: number;
}

export const ECOSYSTEM_PROFILES: EcosystemProfile[] = [
  {
    slug: "amazonia",
    displayName: "Floresta Amazônica",
    medium: "terrestrial",
    compatibleBiomes: ["floresta-tropical-umida", "lago"],
    climate: { temperatureRangeC: [24, 30], rainfallMmYear: [2000, 3500], humidityPct: [80, 95] },
    substrateNotes: "Latossolos ácidos e pobres; ciclagem rápida de nutrientes na serapilheira.",
    water: { presence: "freshwater", salinityRangePsu: [0, 1] },
    dominantResources: ["folhagem-dossel", "frutos-sementes", "folhagem-arbustiva", "detrito"],
    compatibleFaunaGroups: ["mamíferos-arborícolas", "aves-frugívoras", "peixes-de-rio", "predadores-de-topo"],
    incompatibleConditions: ["clima-frio", "salinidade-marinha", "aridez"],
    sourceNotes: "WWF/IBGE biomas; Köppen Af. Curadoria MVP.",
    confidence: 0.7,
  },
  {
    slug: "cerrado",
    displayName: "Cerrado",
    medium: "terrestrial",
    compatibleBiomes: ["savana-tropical", "pradaria-estepe"],
    climate: { temperatureRangeC: [20, 28], rainfallMmYear: [900, 1600], humidityPct: [45, 70] },
    substrateNotes: "Solos profundos, ácidos e bem drenados; vegetação com xeromorfismo e estação seca marcada.",
    water: { presence: "freshwater", salinityRangePsu: [0, 1] },
    dominantResources: ["pastagem", "folhagem-arbustiva", "frutos-sementes", "raizes-tuberculos"],
    compatibleFaunaGroups: ["herbívoros-de-campo", "aves-de-campo", "predadores-médios"],
    incompatibleConditions: ["salinidade-marinha", "clima-polar", "inundação-permanente"],
    sourceNotes: "Savana neotropical; Köppen Aw. Curadoria MVP.",
    confidence: 0.7,
  },
  {
    slug: "pantanal",
    displayName: "Pantanal",
    medium: "mixed",
    compatibleBiomes: ["pantanal", "lago", "savana-tropical"],
    climate: { temperatureRangeC: [22, 32], rainfallMmYear: [1000, 1400], humidityPct: [60, 85] },
    substrateNotes: "Planície sazonalmente alagável; pulso de inundação define recursos e fauna.",
    water: { presence: "freshwater", salinityRangePsu: [0, 2] },
    dominantResources: ["vegetacao-aquatica", "pastagem", "detrito", "algas"],
    compatibleFaunaGroups: ["fauna-aquática", "aves-aquáticas", "répteis-aquáticos", "grandes-herbívoros"],
    incompatibleConditions: ["aridez-extrema", "salinidade-marinha", "clima-frio"],
    sourceNotes: "Maior planície alagável tropical; pulso de inundação. Curadoria MVP.",
    confidence: 0.65,
  },
  {
    slug: "mata-atlantica",
    displayName: "Mata Atlântica",
    medium: "terrestrial",
    compatibleBiomes: ["mata-atlantica", "floresta-tropical-umida"],
    climate: { temperatureRangeC: [18, 27], rainfallMmYear: [1200, 2500], humidityPct: [70, 90] },
    substrateNotes: "Relevo acidentado; alta endemicidade; fragmentação intensa.",
    water: { presence: "freshwater", salinityRangePsu: [0, 1] },
    dominantResources: ["folhagem-dossel", "frutos-sementes", "folhagem-arbustiva", "detrito"],
    compatibleFaunaGroups: ["mamíferos-arborícolas", "aves-endêmicas", "predadores-médios"],
    incompatibleConditions: ["aridez", "clima-polar", "salinidade-marinha"],
    sourceNotes: "Hotspot de biodiversidade; Köppen Af/Cfa. Curadoria MVP.",
    confidence: 0.7,
  },
  {
    slug: "caatinga",
    displayName: "Caatinga",
    medium: "terrestrial",
    compatibleBiomes: ["caatinga", "deserto-quente"],
    climate: { temperatureRangeC: [24, 33], rainfallMmYear: [300, 800], humidityPct: [30, 55] },
    substrateNotes: "Semiárido; solos rasos e pedregosos; vegetação decídua espinhosa.",
    water: { presence: "freshwater", salinityRangePsu: [0, 2] },
    dominantResources: ["folhagem-arbustiva", "frutos-sementes", "pastagem"],
    compatibleFaunaGroups: ["roedores-caatinga", "aves-de-rapina", "predadores-médios", "répteis"],
    incompatibleConditions: ["clima-frio", "inundação-permanente", "salinidade-marinha"],
    sourceNotes: "Único bioma exclusivamente brasileiro; Köppen BSh. Curadoria MVP.",
    confidence: 0.65,
  },
  {
    slug: "pampa",
    displayName: "Pampa",
    medium: "terrestrial",
    compatibleBiomes: ["pradaria-estepe"],
    climate: { temperatureRangeC: [12, 24], rainfallMmYear: [1000, 1600], humidityPct: [60, 80] },
    substrateNotes: "Campos temperados; solos férteis; predomínio de gramíneas.",
    water: { presence: "freshwater", salinityRangePsu: [0, 1] },
    dominantResources: ["pastagem", "raizes-tuberculos", "frutos-sementes"],
    compatibleFaunaGroups: ["herbívoros-de-campo", "aves-campestres", "predadores-médios"],
    incompatibleConditions: ["aridez-extrema", "clima-tropical-úmido", "salinidade-marinha"],
    sourceNotes: "Campos sulinos temperados; Köppen Cfa/Cfb. Curadoria MVP.",
    confidence: 0.6,
  },
  {
    slug: "manguezal",
    displayName: "Manguezal",
    medium: "coastal",
    compatibleBiomes: ["manguezal", "lago"],
    climate: { temperatureRangeC: [22, 30], rainfallMmYear: [1200, 2500], humidityPct: [75, 95] },
    substrateNotes: "Sedimento lodoso anóxico; zona entremarés; raízes-escora.",
    water: { presence: "brackish", salinityRangePsu: [5, 30] },
    dominantResources: ["detrito", "vegetacao-aquatica", "algas", "plancton"],
    compatibleFaunaGroups: ["fauna-estuarina", "aves-limícolas", "peixes-e-crustáceos"],
    incompatibleConditions: ["clima-frio", "água-doce-pura", "aridez"],
    sourceNotes: "Ecossistema entremarés; detritívoro-dependente. Curadoria MVP.",
    confidence: 0.6,
  },
  {
    slug: "rio-lago-dulcicola",
    displayName: "Rio / lago dulcícola",
    medium: "aquatic",
    compatibleBiomes: ["lago"],
    climate: { temperatureRangeC: [15, 30], rainfallMmYear: [800, 3000], humidityPct: [60, 95] },
    substrateNotes: "Corpos d'água continentais; produção por macrófitas, algas e plâncton.",
    water: { presence: "freshwater", salinityRangePsu: [0, 1] },
    dominantResources: ["vegetacao-aquatica", "plancton", "algas", "detrito"],
    compatibleFaunaGroups: ["peixes-dulcícolas", "predadores-aquáticos", "aves-piscívoras"],
    incompatibleConditions: ["salinidade-marinha", "aridez-extrema"],
    sourceNotes: "Ecossistema lêntico/lótico; base autotrófica aquática. Curadoria MVP.",
    confidence: 0.65,
  },
  {
    slug: "costeiro-marinho",
    displayName: "Ecossistema costeiro/marinho",
    medium: "coastal",
    compatibleBiomes: ["oceano-pelagico"],
    climate: { temperatureRangeC: [16, 29], rainfallMmYear: [500, 2000], humidityPct: [70, 95] },
    substrateNotes: "Coluna d'água marinha e substratos costeiros; produção planctônica.",
    water: { presence: "marine", salinityRangePsu: [30, 38] },
    dominantResources: ["plancton", "algas", "vegetacao-aquatica"],
    compatibleFaunaGroups: ["peixes-marinhos", "aves-marinhas", "predadores-marinhos"],
    incompatibleConditions: ["água-doce-pura", "clima-desértico-continental"],
    sourceNotes: "Zona costeira/pelágica; base planctônica. Curadoria MVP.",
    confidence: 0.55,
  },
  {
    slug: "caverna-tropical",
    displayName: "Caverna tropical",
    medium: "cave",
    compatibleBiomes: ["caverna"],
    climate: { temperatureRangeC: [18, 24], rainfallMmYear: [0, 100], humidityPct: [85, 100] },
    substrateNotes: "Ambiente afótico, térmica estável; base trófica alóctone (guano, matéria carreada).",
    water: { presence: "freshwater", salinityRangePsu: [0, 1] },
    dominantResources: ["materia-organica-cavernicola", "detrito"],
    compatibleFaunaGroups: ["troglóbios", "morcegos", "peixes-cavernícolas", "invertebrados"],
    incompatibleConditions: ["luz-solar", "vegetação-fotossintética", "salinidade-marinha"],
    sourceNotes: "Ecologia de cavernas; ausência de produção primária in situ. Curadoria MVP.",
    confidence: 0.55,
  },
];

const PROFILE_BY_SLUG = new Map(ECOSYSTEM_PROFILES.map((p) => [p.slug, p]));
const PROFILE_BY_BIOME = (() => {
  const map = new Map<string, EcosystemProfile>();
  for (const profile of ECOSYSTEM_PROFILES) {
    for (const biome of profile.compatibleBiomes) {
      if (!map.has(biome)) map.set(biome, profile);
    }
  }
  return map;
})();

// Prompt-level biome slugs (EcologicalTerrainPromptService) don't always equal a profile slug or a
// terrain biomeSuggestion, so a few explicit aliases keep matching robust.
const PROMPT_SLUG_ALIASES: Record<string, string> = {
  mangue: "manguezal",
  "floresta-tropical": "amazonia",
  "floresta-amazonica": "amazonia",
  oceano: "costeiro-marinho",
  "oceano-pelagico": "costeiro-marinho",
  lago: "rio-lago-dulcicola",
  caverna: "caverna-tropical",
};

/** Observed grid conditions used to score a profile match (all optional/defensive). */
export interface ObservedEcosystemConditions {
  temperatureC: number;
  precipitationMmYear: number;
  humidityPct: number;
  waterCoveragePct: number;
  avgSalinityPsu: number;
  caveCells: number;
  /** Resource types that the grid actually makes available (availability > 0). */
  presentResources: Set<string>;
}

export interface ProfileConsistencyResult {
  /** Human-readable mismatches between expected profile and observed grid. */
  mismatches: string[];
  /** 0–1 consistency; 1 = fully consistent. */
  consistencyScore: number;
}

export class EcosystemProfileService {
  list(): EcosystemProfile[] {
    return ECOSYSTEM_PROFILES;
  }

  getBySlug(slug: string): EcosystemProfile | undefined {
    return PROFILE_BY_SLUG.get(slug);
  }

  /** First profile whose compatibleBiomes contains the given terrain biome slug. */
  findByBiome(biome: string): EcosystemProfile | undefined {
    return PROFILE_BY_BIOME.get(biome);
  }

  /**
   * Best-effort match for a generated report: tries the prompt biome slug (with aliases), then the
   * dominant grid biomes. Returns undefined when nothing plausible matches (pipeline stays working).
   */
  matchForReport(biomeSlug: string, dominantBiomes: string[]): EcosystemProfile | undefined {
    const direct = this.getBySlug(biomeSlug) ?? this.getBySlug(PROMPT_SLUG_ALIASES[biomeSlug] ?? "");
    if (direct) return direct;
    for (const biome of dominantBiomes) {
      const byBiome = this.findByBiome(biome) ?? this.getBySlug(PROMPT_SLUG_ALIASES[biome] ?? "");
      if (byBiome) return byBiome;
    }
    return undefined;
  }

  /**
   * Deterministic, heuristic consistency between a matched profile and the observed grid. Each
   * detected mismatch lowers the score by a fixed step; the result feeds a plausibility component
   * and warnings. This is educational scoring, not a validated ecological forecast.
   */
  assessConsistency(profile: EcosystemProfile, observed: ObservedEcosystemConditions): ProfileConsistencyResult {
    const mismatches: string[] = [];
    const withinTolerance = (value: number, [min, max]: [number, number], tol: number) =>
      value >= min - tol && value <= max + tol;

    if (!withinTolerance(observed.temperatureC, profile.climate.temperatureRangeC, 4)) {
      mismatches.push(
        `Temperatura ${Math.round(observed.temperatureC)}°C fora do esperado para ${profile.displayName} (${profile.climate.temperatureRangeC[0]}–${profile.climate.temperatureRangeC[1]}°C).`
      );
    }
    if (!withinTolerance(observed.precipitationMmYear, profile.climate.rainfallMmYear, 400)) {
      mismatches.push(
        `Precipitação ${Math.round(observed.precipitationMmYear)} mm/ano fora do esperado (${profile.climate.rainfallMmYear[0]}–${profile.climate.rainfallMmYear[1]}).`
      );
    }

    // Water expectation: any non-terrestrial medium or non-"none" water presence expects water cover.
    const expectsWater =
      profile.medium === "aquatic" ||
      profile.medium === "coastal" ||
      profile.medium === "mixed" ||
      profile.water.presence !== "none";
    if (expectsWater && observed.waterCoveragePct < 5) {
      mismatches.push(`${profile.displayName} espera corpos d'água, mas o grid tem ${observed.waterCoveragePct}% de água.`);
    }

    // Salinity band by expected water presence.
    if (profile.water.presence === "marine" && observed.waterCoveragePct >= 5 && observed.avgSalinityPsu < 15) {
      mismatches.push(`Perfil marinho espera salinidade alta, mas a média é ${Math.round(observed.avgSalinityPsu)} PSU.`);
    }
    if (profile.water.presence === "freshwater" && observed.avgSalinityPsu > 5) {
      mismatches.push(`Perfil dulcícola espera água doce, mas a salinidade média é ${Math.round(observed.avgSalinityPsu)} PSU.`);
    }

    if (profile.medium === "cave" && observed.caveCells === 0) {
      mismatches.push(`${profile.displayName} espera cavernas, mas nenhuma célula de caverna foi gerada.`);
    }

    // Dominant expected resources should be at least partially present.
    if (profile.dominantResources.length > 0) {
      const present = profile.dominantResources.filter((r) => observed.presentResources.has(r)).length;
      if (present / profile.dominantResources.length < 0.5) {
        mismatches.push("Maioria dos recursos dominantes esperados do perfil está ausente no grid.");
      }
    }

    const consistencyScore = Math.max(0.1, 1 - mismatches.length * 0.18);
    return { mismatches, consistencyScore };
  }
}

export const ecosystemProfileService = new EcosystemProfileService();
