import type { FaunaCategory, FeedingStrategy } from "./fauna-definition.service";
import type { TerrainGrid } from "./terrain-generator.service";

// ─── Plant / basal resource layer (MVP) ─────────────────────────────────────────
//
// Herbivores and omnivores no longer exist only as prey: each consumer declares a
// dependency on one or more basal resources, and every scenario derives a grid-level
// availability for each resource from biome coverage, water and cave context. This is
// a deterministic, grid-level heuristic — not per-plant botany — but it lets the
// report answer "what supports this herbivore?" and flag consumers with no resource base.

export type ResourceType =
  | "pastagem" // grass / herbaceous ground cover
  | "folhagem-arbustiva" // shrub / understory foliage
  | "folhagem-dossel" // canopy foliage / browse
  | "frutos-sementes" // fruits and seeds
  | "raizes-tuberculos" // roots and tubers
  | "vegetacao-aquatica" // aquatic macrophytes
  | "plancton" // plankton (aquatic base)
  | "algas" // algae / periphyton
  | "detrito" // detritus / organic litter
  | "materia-organica-cavernicola" // cave organic matter (guano, roots, drip-fed)
  | "carnica" // carrion (supports scavengers/decomposers)
  | "nectar-polen" // nectar and pollen (pollinators)
  | "recurso-agricola"; // crops / agricultural resource (relevant to invasive pressure)

export const RESOURCE_TYPES: ResourceType[] = [
  "pastagem",
  "folhagem-arbustiva",
  "folhagem-dossel",
  "frutos-sementes",
  "raizes-tuberculos",
  "vegetacao-aquatica",
  "plancton",
  "algas",
  "detrito",
  "materia-organica-cavernicola",
  "carnica",
  "nectar-polen",
  "recurso-agricola",
];

export const RESOURCE_LABELS: Record<ResourceType, string> = {
  pastagem: "Pastagem herbácea",
  "folhagem-arbustiva": "Folhagem arbustiva",
  "folhagem-dossel": "Folhagem de dossel",
  "frutos-sementes": "Frutos e sementes",
  "raizes-tuberculos": "Raízes e tubérculos",
  "vegetacao-aquatica": "Vegetação aquática",
  plancton: "Plâncton",
  algas: "Algas / perifíton",
  detrito: "Detrito orgânico",
  "materia-organica-cavernicola": "Matéria orgânica cavernícola",
  carnica: "Carniça",
  "nectar-polen": "Néctar e pólen",
  "recurso-agricola": "Recurso agrícola",
};

// ─── Curated basal-resource catalog (metadata / provenance) ─────────────────────
// Descriptive metadata for each resource. Availability at runtime is still derived from
// biome coverage (FAMILY_RESOURCES); this catalog documents ecological meaning, supported
// contexts, productivity and provenance/confidence for reporting and the thesis.

export type ResourceProductivity = "baixa" | "moderada" | "alta";

export interface ResourceProfile {
  resourceType: ResourceType;
  label: string;
  description: string;
  /** Biome families that typically supply the resource. */
  supportedFamilies: string[];
  /** Feeding strategies that can draw on the resource. */
  supportedFeedingStrategies: FeedingStrategy[];
  productivity: ResourceProductivity;
  sourceNotes: string;
  confidence: number;
}

export const RESOURCE_CATALOG: ResourceProfile[] = [
  {
    resourceType: "pastagem",
    label: RESOURCE_LABELS.pastagem,
    description: "Cobertura herbácea rasteira; base de pastadores em campos e savanas.",
    supportedFamilies: ["grassland", "freshwater", "cold", "mountain", "forest"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "alta",
    sourceNotes: "Definição funcional (grassland forage); EltonTraits/estrutura trófica.",
    confidence: 0.7,
  },
  {
    resourceType: "folhagem-arbustiva",
    label: RESOURCE_LABELS["folhagem-arbustiva"],
    description: "Folhagem de arbustos e sub-bosque; ramoneio de herbívoros de médio porte.",
    supportedFamilies: ["forest", "grassland", "desert", "cold", "mountain"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "moderada",
    sourceNotes: "Definição funcional de browse.",
    confidence: 0.65,
  },
  {
    resourceType: "folhagem-dossel",
    label: RESOURCE_LABELS["folhagem-dossel"],
    description: "Folhas e brotos do dossel florestal; folívoros arborícolas.",
    supportedFamilies: ["forest"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "alta",
    sourceNotes: "Estrutura de florestas tropicais úmidas.",
    confidence: 0.65,
  },
  {
    resourceType: "frutos-sementes",
    label: RESOURCE_LABELS["frutos-sementes"],
    description: "Frutos e sementes; frugívoros/granívoros e onívoros.",
    supportedFamilies: ["forest", "grassland", "desert", "cold", "mountain"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "moderada",
    sourceNotes: "Guildas frugívoras neotropicais.",
    confidence: 0.65,
  },
  {
    resourceType: "raizes-tuberculos",
    label: RESOURCE_LABELS["raizes-tuberculos"],
    description: "Raízes, rizomas e tubérculos; escavadores e onívoros de solo.",
    supportedFamilies: ["grassland", "forest", "freshwater"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "moderada",
    sourceNotes: "Recurso funcional para escavadores (ex.: queixadas, tatus).",
    confidence: 0.55,
  },
  {
    resourceType: "vegetacao-aquatica",
    label: RESOURCE_LABELS["vegetacao-aquatica"],
    description: "Macrófitas aquáticas; herbívoros aquáticos e ribeirinhos.",
    supportedFamilies: ["freshwater", "ocean"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "moderada",
    sourceNotes: "Vegetação de zonas úmidas/rios.",
    confidence: 0.65,
  },
  {
    resourceType: "plancton",
    label: RESOURCE_LABELS.plancton,
    description: "Fito/zooplâncton; base de teias tróficas aquáticas.",
    supportedFamilies: ["ocean", "freshwater"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "alta",
    sourceNotes: "Base pelágica (ex.: krill/peixes filtradores).",
    confidence: 0.7,
  },
  {
    resourceType: "algas",
    label: RESOURCE_LABELS.algas,
    description: "Algas e perifíton em substratos aquáticos; raspadores e peixes onívoros.",
    supportedFamilies: ["freshwater", "ocean"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "moderada",
    sourceNotes: "Produção primária bentônica.",
    confidence: 0.6,
  },
  {
    resourceType: "detrito",
    label: RESOURCE_LABELS.detrito,
    description: "Serapilheira e matéria orgânica morta; detritívoros e decompositores.",
    supportedFamilies: ["forest", "grassland", "freshwater", "cold", "cave"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "moderada",
    sourceNotes: "Via de decomposição; recurso implícito de manguezal/floresta.",
    confidence: 0.6,
  },
  {
    resourceType: "materia-organica-cavernicola",
    label: RESOURCE_LABELS["materia-organica-cavernicola"],
    description: "Guano, raízes e material carreado; base trófica de cavernas.",
    supportedFamilies: ["cave"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "baixa",
    sourceNotes: "Ecologia de cavernas (troglóbios).",
    confidence: 0.55,
  },
  {
    resourceType: "carnica",
    label: RESOURCE_LABELS.carnica,
    description: "Carcaças disponíveis a necrófagos/decompositores; presente onde há fauna.",
    supportedFamilies: ["forest", "grassland", "desert", "freshwater", "cold", "mountain"],
    supportedFeedingStrategies: ["carnivore", "omnivore"],
    productivity: "baixa",
    sourceNotes: "Recurso de necrofagia (ex.: urubus); ligado à mortalidade da fauna.",
    confidence: 0.5,
  },
  {
    resourceType: "nectar-polen",
    label: RESOURCE_LABELS["nectar-polen"],
    description: "Recurso floral para polinizadores; extensão futura de guildas.",
    supportedFamilies: ["forest", "grassland"],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "baixa",
    sourceNotes: "Guildas de polinização (abelhas, beija-flores).",
    confidence: 0.45,
  },
  {
    resourceType: "recurso-agricola",
    label: RESOURCE_LABELS["recurso-agricola"],
    description:
      "Culturas/pastagens manejadas; não gerado por biomas naturais — relevante como alvo de pressão de invasoras.",
    supportedFamilies: [],
    supportedFeedingStrategies: ["herbivore", "omnivore"],
    productivity: "alta",
    sourceNotes: "Conceitual para impacto de invasoras (não produzido pelo grid natural).",
    confidence: 0.4,
  },
];

/** Availability below this fraction means the resource cannot sustain a dependent consumer. */
const SUPPORT_THRESHOLD = 0.12;

// ─── Biome families → resource contribution ─────────────────────────────────────
// Coarse families keep the mapping small and auditable instead of a per-biome table.

type BiomeFamily = "forest" | "grassland" | "desert" | "freshwater" | "ocean" | "cold" | "mountain" | "cave";

function biomeFamily(biome: string): BiomeFamily | null {
  if (biome === "caverna") return "cave";
  if (biome.startsWith("floresta") || biome === "mata-atlantica" || biome === "amazonia" || biome === "taiga") {
    return "forest";
  }
  if (["savana-tropical", "pradaria-estepe", "cerrado", "caatinga", "pampa"].includes(biome)) return "grassland";
  if (biome.startsWith("deserto")) return "desert";
  if (["lago", "pantanal", "manguezal"].includes(biome)) return "freshwater";
  if (["oceano-pelagico", "oceano-polar"].includes(biome)) return "ocean";
  if (["tundra", "antartida", "montanha-nevada"].includes(biome)) return "cold";
  if (biome === "montanha") return "mountain";
  return null;
}

// How strongly each biome family supplies each resource (0–1 per cell of that family).
const FAMILY_RESOURCES: Record<BiomeFamily, Partial<Record<ResourceType, number>>> = {
  forest: {
    "folhagem-dossel": 1,
    "frutos-sementes": 0.9,
    "folhagem-arbustiva": 0.75,
    detrito: 0.7,
    "raizes-tuberculos": 0.4,
    "nectar-polen": 0.5,
    carnica: 0.3,
    pastagem: 0.25,
  },
  grassland: {
    pastagem: 1,
    "folhagem-arbustiva": 0.5,
    "frutos-sementes": 0.5,
    "raizes-tuberculos": 0.5,
    "nectar-polen": 0.45,
    detrito: 0.4,
    carnica: 0.3,
  },
  desert: { "folhagem-arbustiva": 0.4, "frutos-sementes": 0.3, pastagem: 0.2, carnica: 0.25 },
  freshwater: {
    "vegetacao-aquatica": 1,
    plancton: 0.7,
    algas: 0.6,
    detrito: 0.6,
    "raizes-tuberculos": 0.3,
    pastagem: 0.4,
    carnica: 0.2,
  },
  ocean: { plancton: 1, algas: 0.6, "vegetacao-aquatica": 0.4 },
  cold: { pastagem: 0.45, "folhagem-arbustiva": 0.4, "frutos-sementes": 0.2, detrito: 0.3, carnica: 0.3 },
  mountain: { pastagem: 0.5, "folhagem-arbustiva": 0.5, "frutos-sementes": 0.3, carnica: 0.25 },
  cave: { "materia-organica-cavernicola": 1, detrito: 0.5 },
};

// ─── Species-level resource needs ───────────────────────────────────────────────

export interface ResourceNeedsInput {
  category: FaunaCategory;
  feedingStrategy: FeedingStrategy;
  habitableBiomes: string[];
}

/**
 * Derives the basal resources a consumer depends on. Pure carnivores return an empty
 * list: their sustenance is modeled through `preySpeciesIds`, not the plant base.
 */
export function resourceNeedsFor(input: ResourceNeedsInput): ResourceType[] {
  const { category, feedingStrategy, habitableBiomes } = input;
  if (feedingStrategy === "carnivore") return [];

  const needs = new Set<ResourceType>();
  const inCave = habitableBiomes.includes("caverna");
  const nearForest = habitableBiomes.some((b) => biomeFamily(b) === "forest");

  if (inCave) {
    needs.add("materia-organica-cavernicola");
    if (feedingStrategy === "omnivore") needs.add("detrito");
    return [...needs];
  }

  if (category === "fish") {
    needs.add("vegetacao-aquatica");
    needs.add("plancton");
    if (feedingStrategy === "omnivore") needs.add("detrito");
    return [...needs];
  }

  if (category === "bird") {
    needs.add("frutos-sementes");
    if (feedingStrategy === "omnivore") needs.add("detrito");
    return [...needs];
  }

  // Land mammals.
  if (category === "herbivore-large") {
    needs.add("pastagem");
    needs.add("folhagem-arbustiva");
    if (nearForest) needs.add("folhagem-dossel");
  } else if (category === "herbivore-small") {
    needs.add("pastagem");
    needs.add("frutos-sementes");
  }

  if (feedingStrategy === "omnivore") {
    needs.add("frutos-sementes");
    needs.add("detrito");
  }

  return [...needs];
}

// ─── Grid-level resource availability + consumer support ─────────────────────────

export interface ResourceAvailability {
  type: ResourceType;
  label: string;
  /** 0–1 heuristic availability derived from biome coverage / water / caves. */
  availability: number;
  /** Biome families that contribute to this resource in the scenario. */
  sources: string[];
}

interface SupportSpecies {
  id: string;
  commonName: string;
  feedingStrategy: FeedingStrategy;
  populationTarget: number;
  resourceNeeds: ResourceType[];
}

export interface ConsumerSupport {
  speciesId: string;
  commonName: string;
  needs: ResourceType[];
  satisfiedBy: ResourceType[];
  supported: boolean;
}

export interface HerbivorePressure {
  level: "baixa" | "moderada" | "alta";
  /** Consumer population per unit of available basal resource. */
  ratio: number;
  detail: string;
}

export interface ResourceBaseAssessment {
  resourceBase: ResourceAvailability[];
  consumers: ConsumerSupport[];
  /** Common names of consumers whose whole resource need is below the support threshold. */
  unsupportedConsumers: string[];
  resourceWarnings: string[];
  herbivorePressure: HerbivorePressure;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Deterministic resource evaluator. Availability is derived either from a full terrain
 * grid (coverage-weighted) or from a plain biome list (presence-based fallback for the
 * /fauna biome-only path).
 */
export class ResourceAvailabilityEvaluator {
  assessFromGrid(grid: TerrainGrid, species: SupportSpecies[]): ResourceBaseAssessment {
    const coverage = new Map<string, number>();
    let total = 0;
    let caveCells = 0;
    for (const row of grid.cells) {
      for (const cell of row) {
        total += 1;
        coverage.set(cell.biomeSuggestion, (coverage.get(cell.biomeSuggestion) ?? 0) + 1);
        if (cell.cave && cell.cave.type !== "none") caveCells += 1;
      }
    }
    const safeTotal = Math.max(1, total);
    const fractions = new Map<string, number>();
    for (const [biome, count] of coverage) fractions.set(biome, count / safeTotal);
    // Cave organic matter is a *local* within-habitat resource, not a surface-area coverage: a real
    // cave system supports its troglobites regardless of how little of the map it occupies. So a
    // meaningful cave (>= 2 cells) floors the "caverna" weight instead of using the tiny areal
    // fraction — otherwise cave herbivores are always flagged unsupported (the demo's 64/100 bug).
    if (caveCells >= 2) fractions.set("caverna", Math.max(fractions.get("caverna") ?? 0, 0.5));

    return this.assess(fractions, species);
  }

  assessFromBiomes(biomes: string[], species: SupportSpecies[]): ResourceBaseAssessment {
    // Presence-based: each present biome contributes with equal weight.
    const fractions = new Map<string, number>();
    const weight = biomes.length > 0 ? 1 / biomes.length : 0;
    for (const biome of biomes) fractions.set(biome, (fractions.get(biome) ?? 0) + weight);
    return this.assess(fractions, species);
  }

  private assess(biomeFractions: Map<string, number>, species: SupportSpecies[]): ResourceBaseAssessment {
    const totals = new Map<ResourceType, number>();
    const sources = new Map<ResourceType, Set<string>>();

    for (const [biome, fraction] of biomeFractions) {
      const family = biomeFamily(biome);
      if (!family) continue;
      for (const [resource, strength] of Object.entries(FAMILY_RESOURCES[family]) as Array<[ResourceType, number]>) {
        totals.set(resource, (totals.get(resource) ?? 0) + fraction * strength);
        if (!sources.has(resource)) sources.set(resource, new Set());
        sources.get(resource)!.add(family);
      }
    }

    const resourceBase: ResourceAvailability[] = RESOURCE_TYPES.map((type) => ({
      type,
      label: RESOURCE_LABELS[type],
      availability: round(Math.min(1, totals.get(type) ?? 0)),
      sources: Array.from(sources.get(type) ?? []).sort(),
    })).filter((r) => r.availability > 0);

    const availabilityOf = (type: ResourceType) => round(Math.min(1, totals.get(type) ?? 0));

    const consumers: ConsumerSupport[] = species
      .filter((s) => s.resourceNeeds.length > 0)
      .map((s) => {
        const satisfiedBy = s.resourceNeeds.filter((need) => availabilityOf(need) >= SUPPORT_THRESHOLD);
        return {
          speciesId: s.id,
          commonName: s.commonName,
          needs: s.resourceNeeds,
          satisfiedBy,
          supported: satisfiedBy.length > 0,
        };
      });

    const unsupported = consumers.filter((c) => !c.supported);
    const resourceWarnings = unsupported.map(
      (c) =>
        `${c.commonName} depende de ${c.needs.map((n) => RESOURCE_LABELS[n]).join(", ")}, mas o cenário não oferece base de recurso suficiente.`
    );

    return {
      resourceBase,
      consumers,
      unsupportedConsumers: unsupported.map((c) => c.commonName),
      resourceWarnings,
      herbivorePressure: computeHerbivorePressure(species, totals),
    };
  }
}

function computeHerbivorePressure(
  species: SupportSpecies[],
  totals: Map<ResourceType, number>
): HerbivorePressure {
  const consumerPop = species
    .filter((s) => s.resourceNeeds.length > 0)
    .reduce((sum, s) => sum + s.populationTarget, 0);
  // Sum only the plant/basal resources herbivores actually graze (exclude cave/detritus noise
  // by weighting every present resource equally — availability is already 0–1 per resource).
  const resourceCapacity = RESOURCE_TYPES.reduce((sum, type) => sum + Math.min(1, totals.get(type) ?? 0), 0);
  const ratio = resourceCapacity > 0 ? round(consumerPop / (resourceCapacity * 10)) : consumerPop > 0 ? 99 : 0;

  const level: HerbivorePressure["level"] = ratio >= 1.5 ? "alta" : ratio >= 0.8 ? "moderada" : "baixa";
  const detail =
    resourceCapacity <= 0
      ? "Sem base de recurso vegetal detectável para os consumidores presentes."
      : `${consumerPop} indivíduo(s) consumidor(es) sobre capacidade de recurso ${round(resourceCapacity)} (índice ${ratio}).`;

  return { level, ratio, detail };
}

export const resourceAvailabilityEvaluator = new ResourceAvailabilityEvaluator();
