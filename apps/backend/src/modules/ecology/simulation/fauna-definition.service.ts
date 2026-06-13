import type { TerrainGrid } from "./terrain-generator.service";

export type FaunaCategory =
  | "herbivore-small"
  | "herbivore-large"
  | "predator-medium"
  | "predator-large"
  | "bird"
  | "fish";

export type TrophicLevel = "producer" | "herbivore" | "mesopredator" | "apex";

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
  populationTarget: number;
  movementProfile: MovementProfile;
  flockProfile: FlockProfile;
}

export interface FaunaResult {
  species: SpeciesDefinition[];
}

// The raw catalog omits the derived fields (trophicLevel/diet); they are filled by
// normalizeCatalog() so each entry only declares its prey once via preySpeciesIds.
type RawSpecies = Omit<SpeciesDefinition, "trophicLevel" | "diet">;

// ─── Static species catalog ───────────────────────────────────────────────────

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
    populationTarget: 5,
    movementProfile: { maxSpeed: 2.0, turnRate: 2.0, fleeMultiplier: 2.0 },
    flockProfile: { formsFlocks: false, flockRadius: 4.0, separationDistance: 1.0 },
  },
  {
    id: "tilapia",
    commonName: "Tilápia",
    scientificName: "Oreochromis niloticus",
    category: "fish",
    habitableBiomes: ["lago"],
    preySpeciesIds: [],
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
];

// ─── Normalisation ──────────────────────────────────────────────────────────

function trophicLevelFor(category: FaunaCategory): TrophicLevel {
  if (category === "predator-large") return "apex";
  if (category === "predator-medium") return "mesopredator";
  return "herbivore"; // herbívoros, aves e peixes do catálogo entram como consumidores primários
}

// Derives diet (= preySpeciesIds) and trophicLevel so each raw entry declares prey only once.
const SPECIES_CATALOG: SpeciesDefinition[] = RAW_CATALOG.map((raw) => ({
  ...raw,
  diet: [...raw.preySpeciesIds],
  trophicLevel: trophicLevelFor(raw.category),
}));

// ─── Service ──────────────────────────────────────────────────────────────────

const MAX_TOTAL_POPULATION = 30;

export class FaunaDefinitionService {
  resolve(grid: TerrainGrid): FaunaResult {
    const presentBiomes = new Set<string>();
    for (const row of grid.cells) {
      for (const cell of row) {
        presentBiomes.add(cell.biomeSuggestion);
      }
    }

    return this.resolveBiomes(Array.from(presentBiomes));
  }

  resolveBiomes(biomes: string[]): FaunaResult {
    const presentBiomes = new Set(biomes);

    // Keep species that can live in at least one present biome
    let filtered = SPECIES_CATALOG.filter((s) =>
      s.habitableBiomes.some((b) => presentBiomes.has(b))
    );

    // First pass: build surviving id set
    const pass1Ids = new Set(filtered.map((s) => s.id));

    // Remove predators whose prey are all absent (predator without prey has nothing to hunt)
    filtered = filtered.filter(
      (s) => s.preySpeciesIds.length === 0 || s.preySpeciesIds.some((pid) => pass1Ids.has(pid))
    );

    // Strip prey references that didn't survive (prey filtered by biome); keep diet in sync.
    const finalIds = new Set(filtered.map((s) => s.id));
    filtered = filtered.map((s) => {
      if (s.preySpeciesIds.length === 0) return s;
      const prunedPrey = s.preySpeciesIds.filter((pid) => finalIds.has(pid));
      return { ...s, preySpeciesIds: prunedPrey, diet: [...prunedPrey] };
    });

    // Scale populations proportionally if total exceeds the cap
    const totalPop = filtered.reduce((sum, s) => sum + s.populationTarget, 0);
    if (totalPop > MAX_TOTAL_POPULATION) {
      const scale = MAX_TOTAL_POPULATION / totalPop;
      filtered = filtered.map((s) => ({
        ...s,
        populationTarget: Math.max(1, Math.round(s.populationTarget * scale)),
      }));
    }

    return { species: filtered };
  }
}

export const faunaDefinitionService = new FaunaDefinitionService();
