import { logger } from "../../../logging/logger";
import type { TerrainGrid } from "./terrain-generator.service";
import { resourceNeedsFor, type ResourceType } from "./resource-base";

const faunaLogger = logger.child({ module: "fauna-definition" });

export type FaunaCategory =
  | "herbivore-small"
  | "herbivore-large"
  | "predator-medium"
  | "predator-large"
  | "bird"
  | "fish";

export type TrophicLevel = "producer" | "herbivore" | "mesopredator" | "apex";
export type FeedingStrategy = "herbivore" | "carnivore" | "omnivore";

/** Coarse taxonomic group for reporting (não é rank taxonômico formal). */
export type TaxonGroup = "mamífero" | "ave" | "peixe" | "réptil" | "anfíbio" | "invertebrado";

/** Biogeographic status of a species within a resolved scenario. */
export type NativeStatus = "native" | "introduced" | "unknown";

// ─── Habitat / behaviour profiles (richer micro-habitat metadata) ───────────────

export type HabitatType =
  | "forest"
  | "grassland"
  | "riverbank"
  | "lake"
  | "wetland"
  | "mountain"
  | "cliff"
  | "cave"
  | "deep-cave"
  | "desert"
  | "tundra"
  | "canopy"
  | "underground"
  | "ocean";

export type ActivityPeriod = "diurnal" | "nocturnal" | "crepuscular";

export type SocialBehavior = "solitary" | "pair" | "small-group" | "herd" | "pack" | "swarm";

export type CaveAffinity = "none" | "shelter" | "nesting" | "primary";

export interface HabitatProfile {
  primary: HabitatType[];
  secondary: HabitatType[];
  avoids: HabitatType[];
  altitudePreference: "low" | "medium" | "high" | "any";
  waterDependency: "none" | "low" | "medium" | "high";
  caveAffinity: CaveAffinity;
}

export interface BehaviorProfile {
  activityPeriod: ActivityPeriod;
  socialBehavior: SocialBehavior;
  aggression: number;
  curiosity: number;
  fear: number;
  territoriality: number;
  migration: number;
}

export interface MovementProfile {
  maxSpeed: number;
  turnRate: number;
  fleeMultiplier: number;
}

export interface FlockProfile {
  formsFlocks: boolean;
  flockRadius: number;
  separationDistance: number;
}

export interface PredationProfile {
  /** Distance needed to apply damage to a prey agent. */
  attackRange?: number;
  /** Health drained per simulated second while prey is inside attackRange. */
  damageRate?: number;
  /** Detection/chase radius for prey. */
  huntRange?: number;
  /** Hunger accumulated per simulated second. */
  hungerRate?: number;
  /** Hunger level at which the hunter starves. */
  starvationThreshold?: number;
  /** Time after a kill where hunt steering is skipped. */
  satiationCooldownMs?: number;
  /** Relative preference by prey species id; missing ids use weight 1. */
  preyPreference?: Record<string, number>;
}

export interface SpeciesDefinition {
  id: string;
  commonName: string;
  scientificName: string;
  category: FaunaCategory;
  habitableBiomes: string[];
  /** Generalised diet: ids of species this one consumes (drives the trophic chain). */
  diet: string[];
  /** Alias of `diet`, kept for the boids simulation and existing consumers. */
  preySpeciesIds: string[];
  trophicLevel: TrophicLevel;
  /** Display/behavior diet class: controls polygon color and future species customization. */
  feedingStrategy: FeedingStrategy;
  /** Relative body mass used by predation energy and trophic balance. */
  mass: number;
  /** Distance at which this species reacts to a predator. */
  awarenessRange: number;
  /** Species-level hunting parameters; present only when preySpeciesIds is non-empty. */
  predation?: PredationProfile;
  populationTarget: number;
  movementProfile: MovementProfile;
  flockProfile: FlockProfile;
  /** Micro-habitat preferences; derived from category/biomes when not declared. */
  habitatProfile: HabitatProfile;
  /** Activity period and temperament; derived from category when not declared. */
  behaviorProfile: BehaviorProfile;
  /** Coarse taxonomic group for reporting; derived from category unless overridden. */
  taxonGroup: TaxonGroup;
  /** Biogeographic status; catalog species are native by default. */
  nativeStatus: NativeStatus;
  /** Basal (plant/detritus/plankton) resources this consumer depends on; carnivores are empty. */
  resourceNeeds: ResourceType[];
  /** Heuristic curation confidence (0–1) for the species' ecological metadata. */
  confidence: number;
}

export interface FaunaResult {
  species: SpeciesDefinition[];
}

// The raw catalog omits the derived fields (diet, and usually trophicLevel — derived from
// category). trophicLevel can be overridden when category doesn't imply it (e.g. a "fish"-category
// marine apex like the orca), so each entry still declares its prey once via preySpeciesIds.
type RawSpecies = Omit<
  SpeciesDefinition,
  | "trophicLevel"
  | "diet"
  | "feedingStrategy"
  | "mass"
  | "awarenessRange"
  | "predation"
  | "habitatProfile"
  | "behaviorProfile"
  | "taxonGroup"
  | "nativeStatus"
  | "resourceNeeds"
  | "confidence"
> & {
  trophicLevel?: TrophicLevel;
  feedingStrategy?: FeedingStrategy;
  mass?: number;
  awarenessRange?: number;
  predation?: PredationProfile;
  /** Partial override; missing fields are derived from category/biomes. */
  habitatProfile?: Partial<HabitatProfile>;
  /** Partial override; missing fields are derived from category. */
  behaviorProfile?: Partial<BehaviorProfile>;
  /** Override for non-mammal catalog entries (bats, invertebrates, snakes, fish). */
  taxonGroup?: TaxonGroup;
  /** Biogeographic status override; defaults to "native". */
  nativeStatus?: NativeStatus;
};

/** Fauna-only pseudo-biome injected when the grid exposes cave cells. */
export const CAVE_PSEUDO_BIOME = "caverna";

// ─── Static species catalog ───────────────────────────────────────────────────

const DEFAULT_PREDATION: Required<Omit<PredationProfile, "preyPreference">> & {
  preyPreference: Record<string, number>;
} = {
  attackRange: 0.85,
  damageRate: 0.72,
  huntRange: 6,
  hungerRate: 0.018,
  starvationThreshold: 1,
  satiationCooldownMs: 2600,
  preyPreference: {},
};

const MASS_OVERRIDES: Record<string, number> = {
  capivara: 0.9,
  anta: 1.25,
  "veado-campeiro": 0.78,
  "veado-mateiro": 0.72,
  paca: 0.42,
  prea: 0.24,
  moco: 0.26,
  "tatu-galinha": 0.34,
  lemingue: 0.16,
  "onca-pintada": 1.12,
  "onca-parda": 0.94,
  "lobo-guara": 0.62,
  "gato-do-mato": 0.38,
  "lobo-cinzento": 1.02,
  "lince-boreal": 0.52,
  "lontra-gigante": 0.56,
  krill: 0.08,
  "peixe-glacial": 0.18,
  pinguim: 0.48,
  foca: 0.96,
  orca: 1.6,
  "cabra-montes": 0.82,
  lhama: 0.84,
  marmota: 0.3,
  "raposa-montesa": 0.42,
  "puma-andino": 0.9,
};

const PREDATION_OVERRIDES: Record<string, PredationProfile> = {
  "onca-pintada": {
    attackRange: 1.0,
    damageRate: 0.86,
    huntRange: 6.8,
    hungerRate: 0.014,
    starvationThreshold: 1.15,
    satiationCooldownMs: 4200,
    preyPreference: {
      capivara: 1.35,
      anta: 1.2,
      paca: 1.05,
      "veado-mateiro": 1.2,
      "gato-do-mato": 0.55,
    },
  },
  "onca-parda": {
    attackRange: 0.92,
    damageRate: 0.78,
    huntRange: 6.4,
    hungerRate: 0.016,
    satiationCooldownMs: 3600,
    preyPreference: {
      "veado-mateiro": 1.25,
      "veado-campeiro": 1.2,
      paca: 1.1,
      prea: 0.85,
    },
  },
  "lobo-guara": {
    attackRange: 0.78,
    damageRate: 0.52,
    huntRange: 5.4,
    hungerRate: 0.012,
    starvationThreshold: 1.2,
    satiationCooldownMs: 3600,
    preyPreference: {
      prea: 1.4,
      "tatu-galinha": 1.1,
      paca: 0.85,
    },
  },
  "gato-do-mato": {
    attackRange: 0.7,
    damageRate: 0.62,
    huntRange: 5.8,
    hungerRate: 0.02,
    satiationCooldownMs: 2200,
    preyPreference: {
      prea: 1.35,
      moco: 1.2,
      "tatu-galinha": 0.8,
    },
  },
  "lobo-cinzento": {
    attackRange: 0.98,
    damageRate: 0.8,
    huntRange: 6.6,
    hungerRate: 0.015,
    starvationThreshold: 1.15,
    satiationCooldownMs: 4000,
    preyPreference: {
      alce: 1.25,
      rena: 1.35,
      lemingue: 0.7,
      "lince-boreal": 0.55,
    },
  },
  "lince-boreal": {
    attackRange: 0.78,
    damageRate: 0.64,
    huntRange: 5.8,
    hungerRate: 0.018,
    satiationCooldownMs: 2800,
    preyPreference: {
      lemingue: 1.35,
      rena: 0.8,
    },
  },
  "lontra-gigante": {
    attackRange: 0.75,
    damageRate: 0.62,
    huntRange: 5.6,
    hungerRate: 0.017,
    satiationCooldownMs: 2600,
    preyPreference: {
      piranha: 1.15,
      pacu: 1.15,
      pirarucu: 0.75,
    },
  },
  pinguim: {
    attackRange: 0.62,
    damageRate: 0.42,
    huntRange: 4.8,
    hungerRate: 0.014,
    satiationCooldownMs: 1800,
    preyPreference: {
      krill: 1.35,
      "peixe-glacial": 0.85,
    },
  },
  foca: {
    attackRange: 0.94,
    damageRate: 0.74,
    huntRange: 6.2,
    hungerRate: 0.014,
    satiationCooldownMs: 3600,
    preyPreference: {
      pinguim: 1.35,
      "peixe-glacial": 1.05,
      krill: 0.45,
    },
  },
  orca: {
    attackRange: 1.15,
    damageRate: 0.9,
    huntRange: 7.2,
    hungerRate: 0.013,
    starvationThreshold: 1.15,
    satiationCooldownMs: 4700,
    preyPreference: {
      foca: 1.45,
      pinguim: 1.1,
      "peixe-glacial": 0.65,
    },
  },
  "raposa-montesa": {
    attackRange: 0.72,
    damageRate: 0.56,
    huntRange: 5.5,
    hungerRate: 0.018,
    satiationCooldownMs: 2400,
    preyPreference: {
      marmota: 1.4,
    },
  },
  "puma-andino": {
    attackRange: 0.96,
    damageRate: 0.8,
    huntRange: 6.5,
    hungerRate: 0.015,
    starvationThreshold: 1.12,
    satiationCooldownMs: 3900,
    preyPreference: {
      "cabra-montes": 1.3,
      lhama: 1.2,
      marmota: 0.8,
      "raposa-montesa": 0.6,
    },
  },
};

const RAW_CATALOG: RawSpecies[] = [
  // ── Herbívoros grandes ──────────────────────────────────────────────────────
  {
    id: "capivara",
    commonName: "Capivara",
    scientificName: "Hydrochoerus hydrochaeris",
    category: "herbivore-large",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "lago"],
    preySpeciesIds: [],
    populationTarget: 8,
    movementProfile: { maxSpeed: 1.8, turnRate: 1.8, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: true, flockRadius: 4.0, separationDistance: 1.2 },
  },
  {
    id: "anta",
    commonName: "Anta",
    scientificName: "Tapirus terrestris",
    category: "herbivore-large",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "floresta-tropical-seca"],
    preySpeciesIds: [],
    populationTarget: 6,
    movementProfile: { maxSpeed: 2.0, turnRate: 1.5, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: false, flockRadius: 3.0, separationDistance: 1.5 },
  },
  {
    id: "veado-campeiro",
    commonName: "Veado-campeiro",
    scientificName: "Ozotoceros bezoarticus",
    category: "herbivore-large",
    habitableBiomes: ["savana-tropical", "pradaria-estepe"],
    preySpeciesIds: [],
    populationTarget: 7,
    movementProfile: { maxSpeed: 3.0, turnRate: 2.5, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 5.0, separationDistance: 1.0 },
  },
  {
    id: "veado-mateiro",
    commonName: "Veado-mateiro",
    scientificName: "Mazama americana",
    category: "herbivore-large",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "floresta-tropical-seca"],
    preySpeciesIds: [],
    populationTarget: 7,
    movementProfile: { maxSpeed: 2.8, turnRate: 2.2, fleeMultiplier: 2.3 },
    flockProfile: { formsFlocks: false, flockRadius: 3.5, separationDistance: 1.2 },
  },
  {
    id: "alce",
    commonName: "Alce",
    scientificName: "Alces alces",
    category: "herbivore-large",
    habitableBiomes: ["taiga", "pradaria-estepe"],
    preySpeciesIds: [],
    populationTarget: 5,
    movementProfile: { maxSpeed: 2.5, turnRate: 1.5, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 2.0 },
  },
  {
    id: "rena",
    commonName: "Rena",
    scientificName: "Rangifer tarandus",
    category: "herbivore-large",
    habitableBiomes: ["tundra", "taiga"],
    preySpeciesIds: [],
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.2, turnRate: 2.0, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: true, flockRadius: 5.0, separationDistance: 0.9 },
  },

  // ── Herbívoros pequenos ─────────────────────────────────────────────────────
  {
    id: "paca",
    commonName: "Paca",
    scientificName: "Cuniculus paca",
    category: "herbivore-small",
    habitableBiomes: [
      "floresta-tropical-umida",
      "mata-atlantica",
      "floresta-tropical-seca",
      "savana-tropical",
    ],
    preySpeciesIds: [],
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.5, turnRate: 3.0, fleeMultiplier: 2.8 },
    flockProfile: { formsFlocks: false, flockRadius: 2.5, separationDistance: 0.8 },
  },
  {
    id: "prea",
    commonName: "Preá",
    scientificName: "Cavia aperea",
    category: "herbivore-small",
    habitableBiomes: ["caatinga", "savana-tropical", "pradaria-estepe"],
    preySpeciesIds: [],
    populationTarget: 10,
    movementProfile: { maxSpeed: 3.0, turnRate: 3.5, fleeMultiplier: 3.0 },
    flockProfile: { formsFlocks: true, flockRadius: 3.0, separationDistance: 0.5 },
  },
  {
    id: "moco",
    commonName: "Mocó",
    scientificName: "Kerodon rupestris",
    category: "herbivore-small",
    habitableBiomes: ["caatinga", "deserto-quente"],
    preySpeciesIds: [],
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.8, turnRate: 3.2, fleeMultiplier: 2.8 },
    flockProfile: { formsFlocks: true, flockRadius: 2.5, separationDistance: 0.5 },
  },
  {
    id: "tatu-galinha",
    commonName: "Tatu-galinha",
    scientificName: "Dasypus novemcinctus",
    category: "herbivore-small",
    habitableBiomes: ["caatinga", "savana-tropical", "floresta-tropical-seca", "mata-atlantica"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 6,
    movementProfile: { maxSpeed: 1.5, turnRate: 2.5, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: false, flockRadius: 2.0, separationDistance: 0.7 },
  },
  {
    id: "lemingue",
    commonName: "Lemingue",
    scientificName: "Lemmus lemmus",
    category: "herbivore-small",
    habitableBiomes: ["tundra"],
    preySpeciesIds: [],
    populationTarget: 12,
    movementProfile: { maxSpeed: 2.0, turnRate: 3.0, fleeMultiplier: 3.0 },
    flockProfile: { formsFlocks: true, flockRadius: 2.0, separationDistance: 0.3 },
  },

  // ── Aves ────────────────────────────────────────────────────────────────────
  {
    id: "arara-azul",
    commonName: "Arara-azul",
    scientificName: "Anodorhynchus hyacinthinus",
    category: "bird",
    habitableBiomes: ["savana-tropical", "floresta-tropical-umida", "floresta-tropical-seca"],
    preySpeciesIds: [],
    populationTarget: 6,
    movementProfile: { maxSpeed: 5.5, turnRate: 3.0, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 5.0, separationDistance: 0.7 },
  },
  {
    id: "ema",
    commonName: "Ema",
    scientificName: "Rhea americana",
    category: "bird",
    habitableBiomes: ["savana-tropical", "pradaria-estepe"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 5,
    movementProfile: { maxSpeed: 4.0, turnRate: 2.5, fleeMultiplier: 2.8 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 1.0 },
  },
  {
    id: "tuiuiu",
    commonName: "Tuiuiú",
    scientificName: "Jabiru mycteria",
    category: "bird",
    habitableBiomes: ["savana-tropical", "lago", "floresta-tropical-umida"],
    preySpeciesIds: [],
    populationTarget: 4,
    movementProfile: { maxSpeed: 4.5, turnRate: 2.0, fleeMultiplier: 2.3 },
    flockProfile: { formsFlocks: false, flockRadius: 5.0, separationDistance: 1.2 },
  },
  {
    id: "tucano-toco",
    commonName: "Tucano-toco",
    scientificName: "Ramphastos toco",
    category: "bird",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical"],
    preySpeciesIds: [],
    populationTarget: 7,
    movementProfile: { maxSpeed: 4.5, turnRate: 3.2, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 4.0, separationDistance: 0.6 },
  },
  {
    id: "garca-branca",
    commonName: "Garça-branca",
    scientificName: "Ardea alba",
    category: "bird",
    habitableBiomes: ["lago", "floresta-tropical-umida", "mata-atlantica", "savana-tropical"],
    preySpeciesIds: [],
    feedingStrategy: "carnivore",
    populationTarget: 5,
    movementProfile: { maxSpeed: 4.0, turnRate: 2.5, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 1.0 },
  },
  {
    id: "corvo",
    commonName: "Corvo",
    scientificName: "Corvus corax",
    category: "bird",
    habitableBiomes: ["tundra", "taiga", "pradaria-estepe", "deserto-frio"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 5,
    movementProfile: { maxSpeed: 5.0, turnRate: 3.5, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 5.0, separationDistance: 0.7 },
  },
  {
    id: "albatroz",
    commonName: "Albatroz",
    scientificName: "Diomedea exulans",
    category: "bird",
    habitableBiomes: ["oceano-pelagico"],
    preySpeciesIds: [],
    populationTarget: 6,
    movementProfile: { maxSpeed: 6.0, turnRate: 2.0, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: false, flockRadius: 6.0, separationDistance: 1.5 },
  },
  {
    id: "aguia-de-harris",
    commonName: "Águia-de-harris",
    scientificName: "Parabuteo unicinctus",
    category: "bird",
    habitableBiomes: ["caatinga", "deserto-quente", "savana-tropical"],
    preySpeciesIds: [],
    feedingStrategy: "carnivore",
    populationTarget: 4,
    movementProfile: { maxSpeed: 5.5, turnRate: 3.0, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: false, flockRadius: 5.0, separationDistance: 1.2 },
  },

  // ── Peixes ──────────────────────────────────────────────────────────────────
  {
    id: "piranha",
    commonName: "Piranha",
    scientificName: "Pygocentrus nattereri",
    category: "fish",
    habitableBiomes: ["lago", "floresta-tropical-umida"],
    preySpeciesIds: [],
    feedingStrategy: "carnivore",
    populationTarget: 10,
    movementProfile: { maxSpeed: 3.0, turnRate: 4.0, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 3.0, separationDistance: 0.4 },
  },
  {
    id: "pacu",
    commonName: "Pacu",
    scientificName: "Piaractus mesopotamicus",
    category: "fish",
    habitableBiomes: ["lago"],
    preySpeciesIds: [],
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.5, turnRate: 3.0, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 3.5, separationDistance: 0.5 },
  },
  {
    id: "pirarucu",
    commonName: "Pirarucu",
    scientificName: "Arapaima gigas",
    category: "fish",
    habitableBiomes: ["lago", "floresta-tropical-umida"],
    preySpeciesIds: [],
    feedingStrategy: "carnivore",
    populationTarget: 5,
    movementProfile: { maxSpeed: 2.0, turnRate: 2.0, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 1.0 },
  },
  {
    id: "tilapia",
    commonName: "Tilápia-do-nilo",
    scientificName: "Oreochromis niloticus",
    category: "fish",
    habitableBiomes: ["lago"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    nativeStatus: "introduced",
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.5, turnRate: 3.5, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 2.5, separationDistance: 0.4 },
  },
  {
    id: "peixe-palhaco",
    commonName: "Peixe-palhaço",
    scientificName: "Amphiprion ocellaris",
    category: "fish",
    habitableBiomes: ["oceano-pelagico"],
    preySpeciesIds: [],
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.0, turnRate: 4.0, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 2.0, separationDistance: 0.3 },
  },

  // ── Predadores ──────────────────────────────────────────────────────────────
  {
    id: "onca-pintada",
    commonName: "Onça-pintada",
    scientificName: "Panthera onca",
    category: "predator-large",
    habitableBiomes: [
      "floresta-tropical-umida",
      "mata-atlantica",
      "savana-tropical",
      "floresta-tropical-seca",
    ],
    // Apex: também predа o mesopredador gato-do-mato, fechando a cadeia trófica.
    preySpeciesIds: ["capivara", "anta", "paca", "veado-mateiro", "gato-do-mato"],
    populationTarget: 3,
    movementProfile: { maxSpeed: 3.5, turnRate: 2.0, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: false, flockRadius: 6.0, separationDistance: 3.0 },
  },
  {
    id: "onca-parda",
    commonName: "Onça-parda",
    scientificName: "Puma concolor",
    category: "predator-medium",
    habitableBiomes: [
      "floresta-tropical-umida",
      "mata-atlantica",
      "caatinga",
      "savana-tropical",
      "floresta-tropical-seca",
      "pradaria-estepe",
    ],
    preySpeciesIds: ["veado-mateiro", "veado-campeiro", "paca", "prea"],
    populationTarget: 5,
    movementProfile: { maxSpeed: 4.0, turnRate: 2.2, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: false, flockRadius: 5.0, separationDistance: 2.5 },
  },
  {
    id: "lobo-guara",
    commonName: "Lobo-guará",
    scientificName: "Chrysocyon brachyurus",
    category: "predator-medium",
    habitableBiomes: ["savana-tropical", "floresta-tropical-seca", "pradaria-estepe"],
    preySpeciesIds: ["veado-campeiro", "paca", "prea", "tatu-galinha"],
    feedingStrategy: "omnivore",
    populationTarget: 4,
    movementProfile: { maxSpeed: 3.8, turnRate: 2.5, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: false, flockRadius: 5.0, separationDistance: 2.0 },
  },
  {
    id: "gato-do-mato",
    commonName: "Gato-do-mato",
    scientificName: "Leopardus tigrinus",
    category: "predator-medium",
    habitableBiomes: ["caatinga", "floresta-tropical-seca", "mata-atlantica", "floresta-tropical-umida"],
    preySpeciesIds: ["prea", "moco", "tatu-galinha"],
    populationTarget: 5,
    movementProfile: { maxSpeed: 3.5, turnRate: 2.8, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 2.0 },
  },
  {
    id: "lobo-cinzento",
    commonName: "Lobo-cinzento",
    scientificName: "Canis lupus",
    category: "predator-large",
    habitableBiomes: ["tundra", "taiga", "pradaria-estepe"],
    // Apex boreal: caça herbívoros e também o mesopredador lince-boreal.
    preySpeciesIds: ["alce", "rena", "lemingue", "lince-boreal"],
    populationTarget: 3,
    movementProfile: { maxSpeed: 4.0, turnRate: 2.0, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: true, flockRadius: 6.0, separationDistance: 1.5 },
  },
  {
    id: "lince-boreal",
    commonName: "Lince-boreal",
    scientificName: "Lynx lynx",
    category: "predator-medium",
    habitableBiomes: ["taiga", "tundra", "pradaria-estepe"],
    preySpeciesIds: ["lemingue", "rena"],
    populationTarget: 4,
    movementProfile: { maxSpeed: 3.8, turnRate: 2.5, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: false, flockRadius: 4.5, separationDistance: 2.0 },
  },
  {
    id: "lontra-gigante",
    commonName: "Lontra-gigante",
    scientificName: "Pteronura brasiliensis",
    category: "predator-medium",
    habitableBiomes: ["lago", "floresta-tropical-umida"],
    preySpeciesIds: ["piranha", "pacu", "pirarucu"],
    populationTarget: 4,
    movementProfile: { maxSpeed: 3.0, turnRate: 3.0, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: true, flockRadius: 4.0, separationDistance: 0.8 },
  },

  // ── Cadeia marinha polar (todos "fish" para co-ocorrerem na água e a predação ser visível) ──
  // krill/peixe → pinguim/foca → orca
  {
    id: "krill",
    commonName: "Krill-antártico",
    scientificName: "Euphausia superba",
    category: "fish",
    habitableBiomes: ["oceano-polar", "oceano-pelagico"],
    preySpeciesIds: [],
    populationTarget: 14,
    movementProfile: { maxSpeed: 1.8, turnRate: 4.0, fleeMultiplier: 2.6 },
    flockProfile: { formsFlocks: true, flockRadius: 2.0, separationDistance: 0.3 },
  },
  {
    id: "peixe-glacial",
    commonName: "Peixe-glacial",
    scientificName: "Notothenia coriiceps",
    category: "fish",
    habitableBiomes: ["oceano-polar", "oceano-pelagico"],
    preySpeciesIds: [],
    populationTarget: 10,
    movementProfile: { maxSpeed: 2.4, turnRate: 3.4, fleeMultiplier: 2.5 },
    flockProfile: { formsFlocks: true, flockRadius: 2.8, separationDistance: 0.45 },
  },
  {
    id: "pinguim",
    commonName: "Pinguim",
    scientificName: "Pygoscelis adeliae",
    category: "fish",
    trophicLevel: "mesopredator",
    habitableBiomes: ["oceano-polar", "oceano-pelagico"],
    preySpeciesIds: ["krill", "peixe-glacial"],
    populationTarget: 8,
    movementProfile: { maxSpeed: 3.0, turnRate: 3.0, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: true, flockRadius: 3.5, separationDistance: 0.6 },
  },
  {
    id: "foca",
    commonName: "Foca-leopardo",
    scientificName: "Hydrurga leptonyx",
    category: "fish",
    trophicLevel: "mesopredator",
    habitableBiomes: ["oceano-polar", "oceano-pelagico"],
    preySpeciesIds: ["krill", "peixe-glacial", "pinguim"],
    populationTarget: 5,
    movementProfile: { maxSpeed: 3.2, turnRate: 2.6, fleeMultiplier: 1.4 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 1.2 },
  },
  {
    id: "orca",
    commonName: "Orca",
    scientificName: "Orcinus orca",
    category: "fish",
    trophicLevel: "apex",
    habitableBiomes: ["oceano-polar", "oceano-pelagico"],
    preySpeciesIds: ["pinguim", "foca", "peixe-glacial"],
    populationTarget: 3,
    movementProfile: { maxSpeed: 3.6, turnRate: 2.2, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: true, flockRadius: 5.0, separationDistance: 1.6 },
  },

  // ── Cadeia montana (todos terrestres, co-ocorrem em montanha/neve/tundra) ──
  // cabra/lhama/marmota → raposa → puma
  {
    id: "cabra-montes",
    commonName: "Cabra-montês",
    scientificName: "Capra ibex",
    category: "herbivore-large",
    habitableBiomes: ["montanha", "montanha-nevada", "tundra", "deserto-frio"],
    preySpeciesIds: [],
    populationTarget: 7,
    movementProfile: { maxSpeed: 2.6, turnRate: 2.2, fleeMultiplier: 2.3 },
    flockProfile: { formsFlocks: true, flockRadius: 4.0, separationDistance: 1.0 },
  },
  {
    id: "lhama",
    commonName: "Lhama",
    scientificName: "Lama glama",
    category: "herbivore-large",
    habitableBiomes: ["montanha", "montanha-nevada", "deserto-frio", "pradaria-estepe"],
    preySpeciesIds: [],
    populationTarget: 6,
    movementProfile: { maxSpeed: 2.4, turnRate: 2.0, fleeMultiplier: 2.1 },
    flockProfile: { formsFlocks: true, flockRadius: 4.5, separationDistance: 1.1 },
  },
  {
    id: "marmota",
    commonName: "Marmota",
    scientificName: "Marmota marmota",
    category: "herbivore-small",
    habitableBiomes: ["montanha", "montanha-nevada", "tundra"],
    preySpeciesIds: [],
    populationTarget: 10,
    movementProfile: { maxSpeed: 2.4, turnRate: 3.4, fleeMultiplier: 3.0 },
    flockProfile: { formsFlocks: true, flockRadius: 2.5, separationDistance: 0.5 },
  },
  {
    id: "raposa-montesa",
    commonName: "Raposa-montesa",
    scientificName: "Vulpes vulpes",
    category: "predator-medium",
    habitableBiomes: ["montanha", "montanha-nevada", "tundra", "deserto-frio"],
    preySpeciesIds: ["marmota"],
    populationTarget: 5,
    movementProfile: { maxSpeed: 3.6, turnRate: 2.8, fleeMultiplier: 1.3 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 2.0 },
  },
  {
    id: "puma-andino",
    commonName: "Puma-andino",
    scientificName: "Puma concolor",
    category: "predator-large",
    habitableBiomes: ["montanha", "montanha-nevada", "deserto-frio", "pradaria-estepe"],
    preySpeciesIds: ["cabra-montes", "lhama", "marmota", "raposa-montesa"],
    populationTarget: 3,
    movementProfile: { maxSpeed: 3.8, turnRate: 2.4, fleeMultiplier: 1.2 },
    flockProfile: { formsFlocks: false, flockRadius: 5.5, separationDistance: 2.6 },
  },
  {
    id: "aguia-real",
    commonName: "Águia-real",
    scientificName: "Aquila chrysaetos",
    category: "bird",
    habitableBiomes: ["montanha", "montanha-nevada", "tundra", "deserto-frio"],
    preySpeciesIds: [],
    populationTarget: 4,
    movementProfile: { maxSpeed: 5.5, turnRate: 3.0, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: false, flockRadius: 5.0, separationDistance: 1.4 },
  },

  // ── Cadeia cavernícola (pseudo-bioma "caverna"; só entra quando o grid tem cavernas) ──
  // inseto-cavernicola (base) → morcego/aranha (meso) → serpente-cavernicola (apex)
  {
    id: "inseto-cavernicola",
    commonName: "Inseto troglóbio",
    scientificName: "Troglobita sp.",
    category: "herbivore-small",
    habitableBiomes: [CAVE_PSEUDO_BIOME],
    preySpeciesIds: [],
    feedingStrategy: "herbivore",
    populationTarget: 12,
    movementProfile: { maxSpeed: 1.4, turnRate: 4.0, fleeMultiplier: 2.4 },
    flockProfile: { formsFlocks: true, flockRadius: 2.0, separationDistance: 0.3 },
    habitatProfile: { caveAffinity: "primary", waterDependency: "low" },
    behaviorProfile: { activityPeriod: "nocturnal", socialBehavior: "swarm" },
  },
  {
    id: "morcego",
    commonName: "Colônia de morcegos",
    scientificName: "Desmodus rotundus",
    category: "bird",
    trophicLevel: "mesopredator",
    habitableBiomes: [CAVE_PSEUDO_BIOME],
    preySpeciesIds: ["inseto-cavernicola"],
    feedingStrategy: "carnivore",
    populationTarget: 8,
    movementProfile: { maxSpeed: 4.4, turnRate: 4.5, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: true, flockRadius: 3.0, separationDistance: 0.5 },
    habitatProfile: { caveAffinity: "primary" },
    behaviorProfile: { activityPeriod: "nocturnal", socialBehavior: "swarm", fear: 0.6 },
  },
  {
    id: "aranha-cavernicola",
    commonName: "Aranha-de-caverna",
    scientificName: "Loxosceles sp.",
    category: "predator-medium",
    trophicLevel: "mesopredator",
    habitableBiomes: [CAVE_PSEUDO_BIOME],
    preySpeciesIds: ["inseto-cavernicola"],
    populationTarget: 5,
    movementProfile: { maxSpeed: 1.8, turnRate: 3.0, fleeMultiplier: 1.6 },
    flockProfile: { formsFlocks: false, flockRadius: 2.5, separationDistance: 1.0 },
    habitatProfile: { caveAffinity: "primary" },
    behaviorProfile: { activityPeriod: "nocturnal", socialBehavior: "solitary", aggression: 0.4 },
  },
  {
    id: "serpente-cavernicola",
    commonName: "Serpente-cavernícola",
    scientificName: "Boa constrictor",
    category: "predator-medium",
    trophicLevel: "apex",
    habitableBiomes: [CAVE_PSEUDO_BIOME],
    preySpeciesIds: ["morcego", "inseto-cavernicola"],
    feedingStrategy: "carnivore",
    populationTarget: 3,
    movementProfile: { maxSpeed: 1.6, turnRate: 1.8, fleeMultiplier: 1.3 },
    flockProfile: { formsFlocks: false, flockRadius: 3.0, separationDistance: 1.4 },
    habitatProfile: { caveAffinity: "primary" },
    behaviorProfile: { activityPeriod: "nocturnal", socialBehavior: "solitary", aggression: 0.55 },
  },
  {
    id: "peixe-cego",
    commonName: "Peixe-cego",
    scientificName: "Astyanax mexicanus",
    category: "fish",
    habitableBiomes: [CAVE_PSEUDO_BIOME],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 6,
    movementProfile: { maxSpeed: 2.0, turnRate: 3.5, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: true, flockRadius: 2.5, separationDistance: 0.5 },
    habitatProfile: { caveAffinity: "primary", waterDependency: "high", primary: ["deep-cave", "lake"] },
    behaviorProfile: { activityPeriod: "nocturnal", socialBehavior: "small-group" },
  },

  // ── Curadoria neotropical adicional (Worker D): répteis, anfíbio, invertebrados e mais herbívoros ──
  // Predadores répteis ficam confinados a pantanal/lago (fora dos conjuntos de bioma usados nos
  // testes de floresta) para não perturbar as proporções tróficas calibradas.
  {
    id: "jacare-do-pantanal",
    commonName: "Jacaré-do-pantanal",
    scientificName: "Caiman yacare",
    category: "predator-large",
    trophicLevel: "apex",
    habitableBiomes: ["pantanal", "lago"],
    preySpeciesIds: ["piranha", "pacu", "capivara"],
    feedingStrategy: "carnivore",
    populationTarget: 4,
    movementProfile: { maxSpeed: 2.2, turnRate: 1.8, fleeMultiplier: 1.3 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 1.8 },
    habitatProfile: { waterDependency: "high", primary: ["riverbank", "lake", "wetland"] },
    behaviorProfile: { activityPeriod: "crepuscular", socialBehavior: "solitary", aggression: 0.6 },
  },
  {
    id: "sucuri",
    commonName: "Sucuri-verde",
    scientificName: "Eunectes murinus",
    category: "predator-large",
    trophicLevel: "apex",
    habitableBiomes: ["pantanal", "lago"],
    preySpeciesIds: ["capivara", "pacu"],
    feedingStrategy: "carnivore",
    populationTarget: 3,
    movementProfile: { maxSpeed: 1.8, turnRate: 1.6, fleeMultiplier: 1.3 },
    flockProfile: { formsFlocks: false, flockRadius: 3.5, separationDistance: 1.6 },
    habitatProfile: { waterDependency: "high", primary: ["riverbank", "wetland", "lake"] },
    behaviorProfile: { activityPeriod: "nocturnal", socialBehavior: "solitary", aggression: 0.5 },
  },
  {
    id: "jabuti",
    commonName: "Jabuti-piranga",
    scientificName: "Chelonoidis carbonarius",
    category: "herbivore-small",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "caatinga"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 6,
    movementProfile: { maxSpeed: 1.0, turnRate: 1.8, fleeMultiplier: 1.6 },
    flockProfile: { formsFlocks: false, flockRadius: 2.0, separationDistance: 0.8 },
  },
  {
    id: "cutia",
    commonName: "Cutia",
    scientificName: "Dasyprocta azarae",
    category: "herbivore-small",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical"],
    preySpeciesIds: [],
    feedingStrategy: "herbivore",
    populationTarget: 9,
    movementProfile: { maxSpeed: 2.8, turnRate: 3.4, fleeMultiplier: 2.9 },
    flockProfile: { formsFlocks: false, flockRadius: 2.5, separationDistance: 0.7 },
  },
  {
    id: "queixada",
    commonName: "Queixada",
    scientificName: "Tayassu pecari",
    category: "herbivore-large",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "caatinga"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 8,
    movementProfile: { maxSpeed: 2.6, turnRate: 2.4, fleeMultiplier: 2.4 },
    flockProfile: { formsFlocks: true, flockRadius: 4.5, separationDistance: 0.9 },
  },
  {
    id: "bugio",
    commonName: "Bugio-ruivo",
    scientificName: "Alouatta guariba",
    category: "herbivore-small",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica"],
    preySpeciesIds: [],
    feedingStrategy: "herbivore",
    populationTarget: 7,
    movementProfile: { maxSpeed: 2.0, turnRate: 2.8, fleeMultiplier: 2.2 },
    flockProfile: { formsFlocks: true, flockRadius: 3.5, separationDistance: 0.8 },
  },
  {
    id: "formiga-cortadeira",
    commonName: "Formiga-cortadeira",
    scientificName: "Atta sexdens",
    category: "herbivore-small",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical"],
    preySpeciesIds: [],
    feedingStrategy: "herbivore",
    populationTarget: 12,
    movementProfile: { maxSpeed: 1.2, turnRate: 4.0, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: true, flockRadius: 2.0, separationDistance: 0.3 },
  },
  {
    id: "sapo-cururu",
    commonName: "Sapo-cururu",
    scientificName: "Rhinella diptycha",
    category: "herbivore-small",
    habitableBiomes: ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "caatinga"],
    preySpeciesIds: [],
    // Insetívoro: predador de invertebrados não modelados, sem presa vertebrada (folha recurso-implícita).
    feedingStrategy: "carnivore",
    populationTarget: 8,
    movementProfile: { maxSpeed: 1.4, turnRate: 3.0, fleeMultiplier: 2.4 },
    flockProfile: { formsFlocks: false, flockRadius: 2.0, separationDistance: 0.6 },
  },
  {
    id: "seriema",
    commonName: "Seriema",
    scientificName: "Cariama cristata",
    category: "bird",
    habitableBiomes: ["savana-tropical", "pradaria-estepe", "caatinga"],
    preySpeciesIds: [],
    feedingStrategy: "omnivore",
    populationTarget: 5,
    movementProfile: { maxSpeed: 3.6, turnRate: 3.0, fleeMultiplier: 2.6 },
    flockProfile: { formsFlocks: false, flockRadius: 3.5, separationDistance: 1.0 },
  },
];

// ─── Normalisation ──────────────────────────────────────────────────────────

function trophicLevelFor(category: FaunaCategory): TrophicLevel {
  if (category === "predator-large") return "apex";
  if (category === "predator-medium") return "mesopredator";
  return "herbivore"; // herbívoros, aves e peixes do catálogo entram como consumidores primários
}

function feedingStrategyFor(raw: RawSpecies): FeedingStrategy {
  if (raw.feedingStrategy) return raw.feedingStrategy;
  if (
    raw.category === "predator-large" ||
    raw.category === "predator-medium" ||
    raw.preySpeciesIds.length > 0
  ) {
    return "carnivore";
  }
  return "herbivore";
}

function massFor(raw: RawSpecies): number {
  if (raw.mass !== undefined) return raw.mass;
  const override = MASS_OVERRIDES[raw.id];
  if (override !== undefined) return override;
  switch (raw.category) {
    case "predator-large":
      return 0.95;
    case "herbivore-large":
      return 0.82;
    case "predator-medium":
      return 0.52;
    case "bird":
      return 0.28;
    case "fish":
      return 0.26;
    default:
      return 0.28;
  }
}

function awarenessRangeFor(raw: RawSpecies): number {
  if (raw.awarenessRange !== undefined) return raw.awarenessRange;
  switch (raw.category) {
    case "herbivore-large":
      return 5.4;
    case "herbivore-small":
      return 5.0;
    case "bird":
      return 5.6;
    case "fish":
      return 3.9;
    case "predator-medium":
      return 4.2;
    case "predator-large":
      return 4.0;
    default:
      return 4.2;
  }
}

function mergePredationProfile(...profiles: Array<PredationProfile | undefined>): PredationProfile {
  const merged: PredationProfile = {};
  const preyPreference: Record<string, number> = {};
  for (const profile of profiles) {
    if (!profile) continue;
    Object.assign(merged, profile);
    if (profile.preyPreference) Object.assign(preyPreference, profile.preyPreference);
  }
  return {
    ...merged,
    preyPreference,
  };
}

function resolvePredationProfile(raw: RawSpecies): PredationProfile | undefined {
  if (raw.preySpeciesIds.length === 0) return undefined;
  return mergePredationProfile(DEFAULT_PREDATION, PREDATION_OVERRIDES[raw.id], raw.predation);
}

// ─── Habitat / behaviour derivation ─────────────────────────────────────────────

// Maps terrain biome slugs to the abstract habitat types a species can occupy.
const BIOME_TO_HABITAT: Record<string, HabitatType[]> = {
  "floresta-tropical-umida": ["forest", "canopy", "riverbank"],
  "floresta-tropical-seca": ["forest"],
  "mata-atlantica": ["forest", "canopy"],
  cerrado: ["grassland", "forest"],
  caatinga: ["desert", "grassland"],
  "savana-tropical": ["grassland", "riverbank"],
  pantanal: ["wetland", "riverbank", "lake"],
  manguezal: ["wetland", "riverbank"],
  tundra: ["tundra", "mountain"],
  taiga: ["forest", "mountain"],
  "deserto-quente": ["desert"],
  "deserto-frio": ["desert", "tundra", "mountain"],
  "pradaria-estepe": ["grassland"],
  "oceano-pelagico": ["ocean"],
  "oceano-polar": ["ocean"],
  lago: ["lake", "riverbank"],
  montanha: ["mountain", "cliff"],
  "montanha-nevada": ["mountain", "cliff"],
  antartida: ["tundra"],
  [CAVE_PSEUDO_BIOME]: ["cave", "deep-cave", "underground"],
};

function habitatProfileFor(raw: RawSpecies): HabitatProfile {
  const derivedPrimary = new Set<HabitatType>();
  for (const biome of raw.habitableBiomes) {
    for (const habitat of BIOME_TO_HABITAT[biome] ?? []) derivedPrimary.add(habitat);
  }
  if (raw.category === "fish") derivedPrimary.add(raw.habitableBiomes.includes("lago") ? "lake" : "ocean");
  if (raw.category === "bird") derivedPrimary.add("canopy");

  const isHighland = raw.habitableBiomes.some((b) =>
    ["montanha", "montanha-nevada", "deserto-frio", "tundra"].includes(b)
  );
  const isAquatic = raw.category === "fish";
  const isWaterside = raw.habitableBiomes.some((b) => ["lago", "pantanal", "manguezal"].includes(b));

  const base: HabitatProfile = {
    primary: Array.from(derivedPrimary),
    secondary: [],
    avoids: [],
    altitudePreference: isHighland ? "high" : isAquatic ? "low" : "any",
    waterDependency: isAquatic ? "high" : isWaterside ? "medium" : "low",
    caveAffinity: "none",
  };

  if (!raw.habitatProfile) return base;
  return {
    ...base,
    ...raw.habitatProfile,
    primary: raw.habitatProfile.primary ?? base.primary,
    secondary: raw.habitatProfile.secondary ?? base.secondary,
    avoids: raw.habitatProfile.avoids ?? base.avoids,
  };
}

function behaviorProfileFor(raw: RawSpecies): BehaviorProfile {
  const isPredator = raw.category === "predator-large" || raw.category === "predator-medium";
  const formsGroups = raw.flockProfile.formsFlocks;
  const social: SocialBehavior = isPredator
    ? formsGroups
      ? "pack"
      : "solitary"
    : raw.category === "bird"
      ? "small-group"
      : formsGroups
        ? "herd"
        : "pair";

  const base: BehaviorProfile = {
    activityPeriod: isPredator ? "crepuscular" : "diurnal",
    socialBehavior: social,
    aggression: isPredator ? 0.6 : 0.15,
    curiosity: raw.category === "bird" ? 0.5 : 0.3,
    fear: isPredator ? 0.25 : 0.65,
    territoriality: isPredator ? 0.6 : 0.25,
    migration: formsGroups ? 0.4 : 0.2,
  };

  if (!raw.behaviorProfile) return base;
  return { ...base, ...raw.behaviorProfile };
}

// Category renderer hacks (bats fly, snakes are "predator-medium") don't imply a taxon, so a few
// catalog ids carry an explicit taxonGroup override; the rest are derived from category.
const TAXON_OVERRIDES: Record<string, TaxonGroup> = {
  morcego: "mamífero",
  "inseto-cavernicola": "invertebrado",
  "aranha-cavernicola": "invertebrado",
  "serpente-cavernicola": "réptil",
  "jacare-do-pantanal": "réptil",
  sucuri: "réptil",
  jabuti: "réptil",
  "sapo-cururu": "anfíbio",
  "formiga-cortadeira": "invertebrado",
};

function taxonGroupFor(raw: RawSpecies): TaxonGroup {
  if (raw.taxonGroup) return raw.taxonGroup;
  if (TAXON_OVERRIDES[raw.id]) return TAXON_OVERRIDES[raw.id]!;
  if (raw.category === "fish") return "peixe";
  if (raw.category === "bird") return "ave";
  return "mamífero";
}

// Derives diet (= preySpeciesIds) and trophicLevel so each raw entry declares prey only once.
// An explicit raw.trophicLevel wins over the category-based default.
const SPECIES_CATALOG: SpeciesDefinition[] = RAW_CATALOG.map((raw) => {
  const feedingStrategy = feedingStrategyFor(raw);
  return {
    ...raw,
    diet: [...raw.preySpeciesIds],
    trophicLevel: raw.trophicLevel ?? trophicLevelFor(raw.category),
    feedingStrategy,
    mass: massFor(raw),
    awarenessRange: awarenessRangeFor(raw),
    predation: resolvePredationProfile(raw),
    habitatProfile: habitatProfileFor(raw),
    behaviorProfile: behaviorProfileFor(raw),
    taxonGroup: taxonGroupFor(raw),
    nativeStatus: raw.nativeStatus ?? ("native" as NativeStatus),
    resourceNeeds: resourceNeedsFor({ category: raw.category, feedingStrategy, habitableBiomes: raw.habitableBiomes }),
    confidence: 0.7,
  };
});

/** Read-only lookup of normalized catalog species by id (used by the trophic-network resolver). */
const CATALOG_BY_ID = new Map(SPECIES_CATALOG.map((s) => [s.id, s]));

/** Catalog-declared diet for a species id, before any scenario pruning. */
export function catalogDietFor(id: string): string[] {
  return CATALOG_BY_ID.get(id)?.diet ?? [];
}

/** The normalized catalog entry for a species id, if present. */
export function getCatalogSpecies(id: string): SpeciesDefinition | undefined {
  return CATALOG_BY_ID.get(id);
}

/** The full normalized species catalog (read-only; used by data-integrity tests). */
export function listCatalogSpecies(): readonly SpeciesDefinition[] {
  return SPECIES_CATALOG;
}

// ─── Service ──────────────────────────────────────────────────────────────────

const MAX_TOTAL_POPULATION = 30;
const TROPHIC_BUCKET_SHARE = {
  base: 100 / 125,
  mesopredator: 20 / 125,
  apex: 5 / 125,
} as const;

type TrophicBucket = keyof typeof TROPHIC_BUCKET_SHARE;

function trophicBucketFor(species: SpeciesDefinition): TrophicBucket {
  if (species.trophicLevel === "apex") return "apex";
  if (species.trophicLevel === "mesopredator" || species.preySpeciesIds.length > 0) {
    return "mesopredator";
  }
  return "base";
}

function pruneUnavailablePrey(species: SpeciesDefinition[]): SpeciesDefinition[] {
  let current = species;
  let changed = true;

  while (changed) {
    const presentIds = new Set(current.map((s) => s.id));
    const next: SpeciesDefinition[] = [];

    for (const entry of current) {
      if (
        entry.preySpeciesIds.length > 0 &&
        !entry.preySpeciesIds.some((preyId) => presentIds.has(preyId))
      ) {
        continue;
      }

      const prunedPrey = entry.preySpeciesIds.filter((preyId) => presentIds.has(preyId));
      if (prunedPrey.length === entry.preySpeciesIds.length) {
        next.push(entry);
      } else {
        next.push({
          ...entry,
          diet: [...prunedPrey],
          preySpeciesIds: prunedPrey,
          predation: prunedPrey.length > 0 ? entry.predation : undefined,
        });
      }
    }

    changed =
      next.length !== current.length ||
      next.some((entry, index) => {
        const previous = current[index];
        return (
          !previous ||
          previous.id !== entry.id ||
          previous.preySpeciesIds.length !== entry.preySpeciesIds.length
        );
      });
    current = next;
  }

  return current;
}

function allocatePopulationBudgets(buckets: Record<TrophicBucket, SpeciesDefinition[]>): Record<TrophicBucket, number> {
  const minimumTotal = Object.values(buckets).reduce((sum, bucket) => sum + bucket.length, 0);
  const targetTotal = Math.max(MAX_TOTAL_POPULATION, minimumTotal);
  const budgets: Record<TrophicBucket, number> = {
    base: buckets.base.length > 0 ? Math.max(buckets.base.length, Math.round(targetTotal * TROPHIC_BUCKET_SHARE.base)) : 0,
    mesopredator:
      buckets.mesopredator.length > 0
        ? Math.max(buckets.mesopredator.length, Math.round(targetTotal * TROPHIC_BUCKET_SHARE.mesopredator))
        : 0,
    apex: buckets.apex.length > 0 ? Math.max(buckets.apex.length, Math.round(targetTotal * TROPHIC_BUCKET_SHARE.apex)) : 0,
  };

  let total = budgets.base + budgets.mesopredator + budgets.apex;
  while (total > targetTotal) {
    const reducible = (Object.keys(budgets) as TrophicBucket[])
      .filter((bucket) => budgets[bucket] > buckets[bucket].length)
      .sort((a, b) => budgets[b] - buckets[b]!.length - (budgets[a] - buckets[a]!.length))[0];
    if (!reducible) break;
    budgets[reducible] -= 1;
    total -= 1;
  }

  while (total < targetTotal) {
    const expandable = (["base", "mesopredator", "apex"] as TrophicBucket[]).find(
      (bucket) => buckets[bucket].length > 0
    );
    if (!expandable) break;
    budgets[expandable] += 1;
    total += 1;
  }

  return budgets;
}

function scaleBucketPopulation(species: SpeciesDefinition[], budget: number): SpeciesDefinition[] {
  if (species.length === 0) return species;
  const total = species.reduce((sum, entry) => sum + entry.populationTarget, 0);
  if (total <= budget) return species;
  const scale = budget / total;
  return species.map((entry) => ({
    ...entry,
    populationTarget: Math.max(1, Math.round(entry.populationTarget * scale)),
  }));
}

function scalePopulationsByTrophicPyramid(species: SpeciesDefinition[]): SpeciesDefinition[] {
  const totalPop = species.reduce((sum, entry) => sum + entry.populationTarget, 0);
  if (totalPop <= MAX_TOTAL_POPULATION) return species;

  const buckets: Record<TrophicBucket, SpeciesDefinition[]> = {
    base: [],
    mesopredator: [],
    apex: [],
  };
  for (const entry of species) buckets[trophicBucketFor(entry)].push(entry);

  const budgets = allocatePopulationBudgets(buckets);
  const scaled = new Map<string, SpeciesDefinition>();
  for (const bucket of Object.keys(buckets) as TrophicBucket[]) {
    for (const entry of scaleBucketPopulation(buckets[bucket], budgets[bucket])) {
      scaled.set(entry.id, entry);
    }
  }

  return species.map((entry) => scaled.get(entry.id) ?? entry);
}

interface FaunaGridContext {
  totalCells: number;
  avgTemperatureC: number;
  waterCoveragePct: number;
  oceanCoveragePct: number;
  polarCoveragePct: number;
  avgWaterSalinityPsu: number;
  mountainCoveragePct: number;
  caveCells: number;
  floodedCaveCells: number;
  caveSystems: number;
  meaningfulBiomes: Set<string>;
}

const OCEAN_BIOMES = new Set(["oceano-pelagico", "oceano-polar"]);
const POLAR_BIOMES = new Set(["antartida", "oceano-polar"]);
const COLD_CONTEXT_BIOMES = new Set(["taiga", "tundra", "deserto-frio", "antartida", "montanha-nevada"]);
const POLAR_MARINE_SPECIES = new Set(["krill", "peixe-glacial", "pinguim", "foca", "orca"]);
const COLD_CLIMATE_SPECIES = new Set(["lobo-cinzento", "alce", "rena", "lemingue", "lince-boreal", "corvo"]);
const MOUNTAIN_SPECIALISTS = new Set([
  "cabra-montes",
  "lhama",
  "marmota",
  "raposa-montesa",
  "puma-andino",
  "aguia-real",
]);

function buildFaunaGridContext(grid: TerrainGrid, meaningfulBiomes: string[]): FaunaGridContext {
  let totalCells = 0;
  let waterCells = 0;
  let oceanCells = 0;
  let polarCells = 0;
  let mountainCells = 0;
  let caveCells = 0;
  let floodedCaveCells = 0;
  let temperatureSum = 0;
  let waterSalinitySum = 0;
  const caveSystems = new Set<string>();

  for (const row of grid.cells) {
    for (const cell of row) {
      totalCells += 1;
      temperatureSum += cell.temperatureC;
      if (cell.isWater) {
        waterCells += 1;
        waterSalinitySum += cell.salinityPsu;
      }
      if (OCEAN_BIOMES.has(cell.biomeSuggestion)) oceanCells += 1;
      if (POLAR_BIOMES.has(cell.biomeSuggestion)) polarCells += 1;
      if (
        cell.altitudeBand === "mountain" ||
        cell.altitudeBand === "cliff" ||
        cell.biomeSuggestion === "montanha" ||
        cell.biomeSuggestion === "montanha-nevada" ||
        cell.elevation >= 0.82
      ) {
        mountainCells += 1;
      }
      if (cell.cave && cell.cave.type !== "none") {
        caveCells += 1;
        if (cell.cave.systemId) caveSystems.add(cell.cave.systemId);
        if (cell.cave.type === "river-cave" || (cell.riverDistance ?? 99) <= 1 || cell.cave.humidity >= 0.85) {
          floodedCaveCells += 1;
        }
      }
    }
  }

  const safeTotal = Math.max(1, totalCells);
  const safeWater = Math.max(1, waterCells);
  return {
    totalCells,
    avgTemperatureC: temperatureSum / safeTotal,
    waterCoveragePct: (waterCells / safeTotal) * 100,
    oceanCoveragePct: (oceanCells / safeTotal) * 100,
    polarCoveragePct: (polarCells / safeTotal) * 100,
    avgWaterSalinityPsu: waterCells > 0 ? waterSalinitySum / safeWater : 0,
    mountainCoveragePct: (mountainCells / safeTotal) * 100,
    caveCells,
    floodedCaveCells,
    caveSystems: caveSystems.size,
    meaningfulBiomes: new Set(meaningfulBiomes),
  };
}

function hasAnyBiome(context: FaunaGridContext, biomes: Set<string>): boolean {
  for (const biome of biomes) {
    if (context.meaningfulBiomes.has(biome)) return true;
  }
  return false;
}

function isStrictOceanSpecies(species: SpeciesDefinition): boolean {
  return (
    species.habitableBiomes.some((biome) => OCEAN_BIOMES.has(biome)) &&
    !species.habitableBiomes.some((biome) => biome === "lago" || biome === "manguezal")
  );
}

function isSpeciesCompatibleWithGrid(species: SpeciesDefinition, context: FaunaGridContext): boolean {
  if (species.habitableBiomes.includes(CAVE_PSEUDO_BIOME)) {
    if (context.caveCells < 2) return false;
    if (species.id === "peixe-cego" && context.floodedCaveCells < 1) return false;
  }

  if (POLAR_MARINE_SPECIES.has(species.id)) {
    return (
      context.oceanCoveragePct >= 8 &&
      context.avgWaterSalinityPsu >= 12 &&
      context.avgTemperatureC <= 5 &&
      context.polarCoveragePct >= 10
    );
  }

  if (isStrictOceanSpecies(species)) {
    return context.oceanCoveragePct >= 15 && context.avgWaterSalinityPsu >= 12;
  }

  if (COLD_CLIMATE_SPECIES.has(species.id)) {
    return context.avgTemperatureC <= 12 || (context.avgTemperatureC <= 16 && hasAnyBiome(context, COLD_CONTEXT_BIOMES));
  }

  if (MOUNTAIN_SPECIALISTS.has(species.id)) {
    return (
      context.mountainCoveragePct >= 8 ||
      context.meaningfulBiomes.has("montanha") ||
      context.meaningfulBiomes.has("montanha-nevada")
    );
  }

  return true;
}

export class FaunaDefinitionService {
  resolve(grid: TerrainGrid): FaunaResult {
    // Conta as células por bioma e descarta biomas residuais (poucas células espalhadas) antes de
    // resolver a fauna — assim uma célula isolada de outro bioma não injeta espécies fora de faixa
    // (ex.: um puma andino numa floresta tropical por causa de 1 célula de deserto-frio).
    const counts = new Map<string, number>();
    let total = 0;
    for (const row of grid.cells) {
      for (const cell of row) {
        total += 1;
        counts.set(cell.biomeSuggestion, (counts.get(cell.biomeSuggestion) ?? 0) + 1);
      }
    }

    const threshold = Math.max(1, Math.floor(total * 0.05)); // ≥5% das células para "contar"
    let meaningful = Array.from(counts.entries())
      .filter(([, c]) => c >= threshold)
      .map(([biome]) => biome);
    if (meaningful.length === 0) {
      // Grid muito fragmentado: cai para o bioma dominante.
      const dominant = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
      meaningful = dominant ? [dominant[0]] : Array.from(counts.keys());
    }

    // Spawn por micro-habitat: cavernas são um pseudo-bioma. Se o grid expõe um
    // sistema de cavernas (≥2 células), a fauna cavernícola entra na resolução.
    let caveCells = 0;
    for (const row of grid.cells) {
      for (const cell of row) {
        if (cell.cave && cell.cave.type !== "none") caveCells += 1;
      }
    }
    if (caveCells >= 2 && !meaningful.includes(CAVE_PSEUDO_BIOME)) {
      meaningful.push(CAVE_PSEUDO_BIOME);
    }

    return this.resolveForBiomes(meaningful, buildFaunaGridContext(grid, meaningful));
  }

  resolveBiomes(biomes: string[]): FaunaResult {
    return this.resolveForBiomes(biomes);
  }

  private resolveForBiomes(biomes: string[], context?: FaunaGridContext): FaunaResult {
    const presentBiomes = new Set(biomes);

    // Keep species that can live in at least one present biome
    let filtered = SPECIES_CATALOG.filter((s) =>
      s.habitableBiomes.some((b) => presentBiomes.has(b))
    );

    if (context) {
      filtered = filtered.filter((species) => isSpeciesCompatibleWithGrid(species, context));
    }

    // Keep pruning until every remaining hunter has at least one present prey and every prey id
    // still points at a surviving species.
    filtered = pruneUnavailablePrey(filtered);

    // Scale populations by a simple trophic pyramid so apex/mesopredators do not overwhelm prey.
    filtered = scalePopulationsByTrophicPyramid(filtered);

    // Diagnóstico: torna visível um mismatch entre os códigos de bioma do grid e os
    // habitableBiomes do catálogo (ex.: bioma novo sem fauna cadastrada), em vez de falhar mudo.
    const levels = new Set(filtered.map((s) => s.trophicLevel));
    const hasHerbivore = levels.has("herbivore");
    const hasPredator = levels.has("mesopredator") || levels.has("apex");
    if (filtered.length < 3 || (hasHerbivore && !hasPredator)) {
      faunaLogger.warn(
        {
          biomes,
          resolvedSpecies: filtered.length,
          trophicLevels: Array.from(levels),
        },
        "Fauna escassa ou cadeia incompleta para estes biomas — verifique habitableBiomes do catálogo."
      );
    }

    return { species: filtered };
  }
}

export const faunaDefinitionService = new FaunaDefinitionService();
