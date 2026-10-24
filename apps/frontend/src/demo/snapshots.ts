import type {
  EcosystemMedium,
  EcosystemReportResult,
  InvasiveScenarioResult,
  ResourceType,
  SpeciesDefinition,
  TerrainCell,
  TerrainGrid,
  WaterPresence,
} from "../services/api/ecology";
import type { DemoScenarioId } from "./catalog";

export interface OfflineSnapshotMeta {
  snapshotVersion: 1;
  scenarioId: DemoScenarioId;
  precomputed: true;
  generatedAt: string;
  disclosure: string;
}

export interface OfflineEcosystemSnapshot {
  meta: OfflineSnapshotMeta;
  result: EcosystemReportResult;
}

export interface OfflineInvasiveSnapshot {
  meta: OfflineSnapshotMeta & { terrainSnapshotId: DemoScenarioId };
  result: InvasiveScenarioResult;
}

export const OFFLINE_DISCLOSURE =
  "Modo de demonstração offline - cenário previamente calculado e validado. Nenhuma consulta ao banco ou ao provedor de IA está sendo realizada.";

function cell(
  x: number,
  y: number,
  biomeSuggestion: string,
  seed: number,
  options: Partial<TerrainCell> = {},
): TerrainCell {
  const wave = Math.sin((x + seed) * 0.8) * Math.cos((y - seed) * 0.55);
  const elevation = Math.max(0.08, Math.min(0.92, 0.34 + wave * 0.12 + y * 0.012));
  return {
    x,
    y,
    elevation: options.elevation ?? elevation,
    temperatureC: options.temperatureC ?? 26,
    humidityPct: options.humidityPct ?? 76,
    precipitationMmYear: options.precipitationMmYear ?? 1600,
    salinityPsu: options.salinityPsu ?? 0,
    climateCode: options.climateCode ?? "Aw",
    biomeSuggestion,
    isWater: options.isWater ?? false,
    slope: options.slope ?? Math.abs(wave) * 0.35,
    rockiness: options.rockiness ?? 0.2,
    altitudeBand: options.altitudeBand ?? (elevation > 0.62 ? "hill" : "lowland"),
    waterFlow: options.waterFlow,
    riverDistance: options.riverDistance,
    cave: options.cave,
    objects: options.objects,
  };
}

// Cada cenário offline é descrito por um spec: o que varia entre biomas fica nesta
// tabela, e os construtores abaixo apenas a leem. Antes isso era uma cadeia de
// ternários por campo, que não escalava além de três perfis.
export type SnapshotProfile =
  | "amazon"
  | "cerrado"
  | "mangrove"
  | "antarctic"
  | "ocean"
  | "mountain";

interface ProfileSpec {
  seed: number;
  biomeName: string;
  biomeSlug: string;
  displayName: string;
  reliefStyle: "default" | "ocean" | "mountain" | "polar";
  /** Um cenário incoerente é deliberado: serve para mostrar a validação reprovando. */
  coherent: boolean;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  baseHumidityPct: number;
  temperatureRangeC: [number, number];
  precipitationRangeMm: [number, number];
  humidityRangePct: [number, number];
  climateCode: string;
  dominantBiome: string;
  vegetationDescription: string;
  waterCoveragePct: number;
  riverCells: number;
  maxWaterFlow: number;
  rockyCoveragePct: number;
  mountainCoveragePct: number;
  cliffCoveragePct: number;
  medium: EcosystemMedium;
  waterPresence: WaterPresence;
  salinityRangePsu: [number, number];
  dominantResources: ResourceType[];
  compatibleFaunaGroups: string[];
  profileClimate: {
    temperatureRangeC: [number, number];
    rainfallMmYear: [number, number];
    humidityPct: [number, number];
  };
  validationScore: number;
  profileConfidence: number;
  /** Constrói uma célula do grid; concentra o padrão de água/objetos do bioma. */
  buildCell: (x: number, y: number, seed: number, width: number) => TerrainCell;
  /** Contradições intencionais, quando o cenário é incoerente. */
  mismatches?: string[];
  resourceWarnings?: string[];
  validationIssues?: string[];
  blockingContradictions?: string[];
  incompatibleConditions?: string[];
}

const GRID_WIDTH = 18;
const GRID_HEIGHT = 14;

function riverAt(x: number, y: number, width: number): boolean {
  return Math.abs(x - Math.floor(width / 2)) <= (y % 3 === 0 ? 1 : 0);
}

const PROFILE_SPECS: Record<SnapshotProfile, ProfileSpec> = {
  amazon: {
    seed: 9021,
    biomeName: "Amazônia",
    biomeSlug: "amazon",
    displayName: "Amazônia",
    reliefStyle: "default",
    coherent: true,
    baseTemperatureC: 28,
    basePrecipitationMm: 2800,
    baseHumidityPct: 86,
    temperatureRangeC: [24, 31],
    precipitationRangeMm: [2400, 3200],
    humidityRangePct: [78, 94],
    climateCode: "Af",
    dominantBiome: "floresta-tropical-umida",
    vegetationDescription: "Matriz florestal úmida com corredores de água doce.",
    waterCoveragePct: 12,
    riverCells: 28,
    maxWaterFlow: 0.5,
    rockyCoveragePct: 6,
    mountainCoveragePct: 0,
    cliffCoveragePct: 0,
    medium: "terrestrial",
    waterPresence: "freshwater",
    salinityRangePsu: [0, 1],
    dominantResources: ["pastagem", "frutos-sementes"],
    compatibleFaunaGroups: ["mamíferos", "aves"],
    profileClimate: { temperatureRangeC: [24, 32], rainfallMmYear: [2200, 3500], humidityPct: [75, 95] },
    validationScore: 88,
    profileConfidence: 0.82,
    buildCell: (x, y, seed, width) => {
      const river = riverAt(x, y, width);
      return cell(x, y, river ? "lago" : "floresta-tropical-umida", seed, {
        isWater: river,
        // A low, continuous bed keeps the demonstration river inside its banks.
        elevation: river ? .18 : undefined,
        temperatureC: 27 + ((x + y) % 3),
        humidityPct: 86,
        precipitationMmYear: 2800,
        climateCode: "Af",
        waterFlow: river ? 0.45 : 0.04,
        riverDistance: river ? 0 : Math.abs(x - Math.floor(width / 2)),
        objects: river ? undefined : ["bush", "fallen-log"],
      });
    },
  },
  cerrado: {
    seed: 1704,
    biomeName: "Cerrado",
    biomeSlug: "cerrado",
    displayName: "Cerrado",
    reliefStyle: "default",
    coherent: true,
    baseTemperatureC: 26,
    basePrecipitationMm: 1300,
    baseHumidityPct: 58,
    temperatureRangeC: [20, 33],
    precipitationRangeMm: [900, 1600],
    humidityRangePct: [42, 72],
    climateCode: "Aw",
    dominantBiome: "cerrado",
    vegetationDescription: "Campo savânico com gramíneas, arbustos e manchas lenhosas.",
    waterCoveragePct: 0,
    riverCells: 0,
    maxWaterFlow: 0,
    rockyCoveragePct: 18,
    mountainCoveragePct: 0,
    cliffCoveragePct: 0,
    medium: "terrestrial",
    waterPresence: "none",
    salinityRangePsu: [0, 1],
    dominantResources: ["pastagem", "frutos-sementes"],
    compatibleFaunaGroups: ["mamíferos", "aves"],
    profileClimate: { temperatureRangeC: [20, 34], rainfallMmYear: [800, 1800], humidityPct: [35, 75] },
    validationScore: 82,
    profileConfidence: 0.82,
    buildCell: (x, y, seed) =>
      cell(x, y, "cerrado", seed, {
        temperatureC: 25 + ((x + y) % 4),
        humidityPct: 58,
        precipitationMmYear: 1300,
        climateCode: "Aw",
        objects: (x + y) % 6 === 0 ? ["rock", "bush"] : ["bush"],
      }),
  },
  mangrove: {
    seed: 3309,
    biomeName: "Manguezal incoerente",
    biomeSlug: "mangrove",
    displayName: "Manguezal",
    reliefStyle: "default",
    coherent: false,
    baseTemperatureC: 33,
    basePrecipitationMm: 420,
    baseHumidityPct: 38,
    temperatureRangeC: [31, 36],
    precipitationRangeMm: [200, 600],
    humidityRangePct: [25, 45],
    climateCode: "BSh",
    dominantBiome: "manguezal",
    vegetationDescription: "Perfil solicitado como manguezal, mas sem água salobra e umidade mínima.",
    waterCoveragePct: 2,
    riverCells: 0,
    maxWaterFlow: 0,
    rockyCoveragePct: 6,
    mountainCoveragePct: 0,
    cliffCoveragePct: 0,
    medium: "coastal",
    waterPresence: "brackish",
    salinityRangePsu: [5, 30],
    dominantResources: ["detrito"],
    compatibleFaunaGroups: ["mamíferos", "aves"],
    profileClimate: { temperatureRangeC: [20, 34], rainfallMmYear: [800, 1800], humidityPct: [35, 75] },
    validationScore: 31,
    profileConfidence: 0.7,
    mismatches: ["Manguezal exige água salobra recorrente.", "Baixa umidade contradiz o perfil esperado."],
    resourceWarnings: ["Manguezal sem água salobra e baixa umidade não sustenta os recursos esperados."],
    validationIssues: ["Manguezal seco e sem água salobra."],
    blockingContradictions: ["Manguezal sem água salobra recorrente."],
    incompatibleConditions: ["baixa umidade", "ausência de água salobra"],
    buildCell: (x, y, seed) => {
      const shouldBeWater = x < 2 && y < 2;
      return cell(x, y, "manguezal", seed, {
        isWater: shouldBeWater,
        temperatureC: 33,
        humidityPct: 38,
        precipitationMmYear: 420,
        salinityPsu: shouldBeWater ? 4 : 0,
        climateCode: "BSh",
        objects: shouldBeWater ? undefined : ["dead-tree", "rock"],
      });
    },
  },
  antarctic: {
    seed: 5511,
    biomeName: "Antártida",
    biomeSlug: "antartida",
    displayName: "Antártida",
    reliefStyle: "polar",
    coherent: true,
    baseTemperatureC: -9,
    basePrecipitationMm: 180,
    baseHumidityPct: 72,
    temperatureRangeC: [-24, -1],
    precipitationRangeMm: [80, 300],
    humidityRangePct: [62, 84],
    climateCode: "EF",
    dominantBiome: "oceano-polar",
    vegetationDescription:
      "Calota e banquisa: a produção primária está no plâncton, não em vegetação terrestre.",
    waterCoveragePct: 58,
    riverCells: 0,
    maxWaterFlow: 0,
    rockyCoveragePct: 12,
    mountainCoveragePct: 4,
    cliffCoveragePct: 6,
    medium: "aquatic",
    waterPresence: "marine",
    salinityRangePsu: [33, 35],
    dominantResources: ["plancton", "carnica"],
    compatibleFaunaGroups: ["aves", "mamíferos marinhos", "invertebrados"],
    profileClimate: { temperatureRangeC: [-30, 2], rainfallMmYear: [50, 400], humidityPct: [60, 90] },
    validationScore: 85,
    profileConfidence: 0.8,
    buildCell: (x, y, seed) => {
      // Plataforma de gelo ao sul do grid e numa borda; o resto é mar polar.
      const iceShelf = y >= GRID_HEIGHT - 4 || (x < 3 && y > 6);
      return cell(x, y, iceShelf ? "antartida" : "oceano-polar", seed, {
        isWater: !iceShelf,
        temperatureC: iceShelf ? -14 - ((x + y) % 4) : -2 - ((x + y) % 2),
        humidityPct: 72,
        precipitationMmYear: 180,
        salinityPsu: iceShelf ? 0 : 34,
        climateCode: "EF",
        rockiness: iceShelf ? 0.35 : 0.05,
        waterFlow: iceShelf ? undefined : 0.12,
        objects: iceShelf && (x + y) % 5 === 0 ? ["rock"] : undefined,
      });
    },
  },
  ocean: {
    seed: 7742,
    biomeName: "Oceano aberto",
    biomeSlug: "oceano",
    displayName: "Oceano aberto",
    reliefStyle: "ocean",
    coherent: true,
    baseTemperatureC: 26,
    basePrecipitationMm: 1700,
    baseHumidityPct: 82,
    temperatureRangeC: [22, 29],
    precipitationRangeMm: [1200, 2200],
    humidityRangePct: [74, 90],
    climateCode: "Af",
    dominantBiome: "oceano-pelagico",
    vegetationDescription: "Coluna de água dominante, com ilhas vegetadas esparsas.",
    waterCoveragePct: 88,
    riverCells: 0,
    maxWaterFlow: 0.2,
    rockyCoveragePct: 4,
    mountainCoveragePct: 0,
    cliffCoveragePct: 2,
    medium: "aquatic",
    waterPresence: "marine",
    salinityRangePsu: [34, 36],
    dominantResources: ["plancton", "algas"],
    compatibleFaunaGroups: ["peixes", "aves marinhas", "mamíferos marinhos", "répteis"],
    profileClimate: { temperatureRangeC: [20, 30], rainfallMmYear: [1000, 2500], humidityPct: [70, 95] },
    validationScore: 86,
    profileConfidence: 0.81,
    buildCell: (x, y, seed) => {
      // Duas ilhas quebram o mar aberto e dão ponto de pouso às aves.
      const island = (x >= 3 && x <= 5 && y >= 3 && y <= 4) || (x >= 12 && x <= 14 && y >= 9 && y <= 10);
      return cell(x, y, island ? "floresta-tropical-umida" : "oceano-pelagico", seed, {
        isWater: !island,
        temperatureC: island ? 27 : 25 + ((x + y) % 3),
        humidityPct: 82,
        precipitationMmYear: 1700,
        salinityPsu: island ? 0 : 35,
        climateCode: "Af",
        waterFlow: island ? undefined : 0.18,
        objects: island ? ["bush", "fallen-log"] : undefined,
      });
    },
  },
  mountain: {
    seed: 4308,
    biomeName: "Montanha nevada",
    biomeSlug: "montanha-nevada",
    displayName: "Montanha nevada",
    reliefStyle: "mountain",
    coherent: true,
    baseTemperatureC: 3,
    basePrecipitationMm: 950,
    baseHumidityPct: 61,
    temperatureRangeC: [-11, 12],
    precipitationRangeMm: [600, 1400],
    humidityRangePct: [48, 76],
    climateCode: "ET",
    dominantBiome: "montanha-nevada",
    vegetationDescription: "Gradiente altitudinal: campo alpino no alto, taiga nas encostas baixas.",
    waterCoveragePct: 3,
    riverCells: 6,
    maxWaterFlow: 0.3,
    rockyCoveragePct: 46,
    mountainCoveragePct: 62,
    cliffCoveragePct: 18,
    medium: "terrestrial",
    waterPresence: "freshwater",
    salinityRangePsu: [0, 1],
    dominantResources: ["pastagem", "folhagem-arbustiva"],
    compatibleFaunaGroups: ["mamíferos", "aves"],
    profileClimate: { temperatureRangeC: [-15, 15], rainfallMmYear: [500, 1600], humidityPct: [40, 80] },
    validationScore: 84,
    profileConfidence: 0.79,
    buildCell: (x, y, seed) => {
      // A altitude cai do topo (y baixo) para o vale, com um córrego de degelo.
      const peak = y <= 4;
      const stream = !peak && x === 8 && y % 2 === 0;
      return cell(x, y, peak ? "montanha-nevada" : "taiga", seed, {
        isWater: stream,
        temperatureC: peak ? -6 - ((x + y) % 3) : 6 + ((x + y) % 4),
        humidityPct: 61,
        precipitationMmYear: 950,
        climateCode: peak ? "ET" : "Dfc",
        rockiness: peak ? 0.72 : 0.34,
        slope: peak ? 0.62 : 0.28,
        altitudeBand: peak ? "mountain" : "hill",
        waterFlow: stream ? 0.3 : undefined,
        objects: peak ? ((x + y) % 4 === 0 ? ["rock"] : undefined) : ["bush", "rock"],
      });
    },
  },
};

function gridFor(profile: SnapshotProfile): TerrainGrid {
  const spec = PROFILE_SPECS[profile];
  const cells: TerrainCell[][] = [];

  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      row.push(spec.buildCell(x, y, spec.seed, GRID_WIDTH));
    }
    cells.push(row);
  }

  return {
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    seed: spec.seed,
    baseTemperatureC: spec.baseTemperatureC,
    basePrecipitationMm: spec.basePrecipitationMm,
    cells,
    simulationNote: "Snapshot offline precomputado para demonstração visual; não é uma simulação ao vivo.",
  };
}

const capivara: SpeciesDefinition = {
  id: "capivara",
  commonName: "Capivara",
  scientificName: "Hydrochoerus hydrochaeris",
  category: "herbivore-large",
  habitableBiomes: ["floresta-tropical-umida", "lago", "cerrado"],
  diet: ["gramíneas", "plantas aquáticas"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 50,
  awarenessRange: 5,
  populationTarget: 18,
  movementProfile: { maxSpeed: 1.1, turnRate: 1.5, fleeMultiplier: 1.8 },
  flockProfile: { formsFlocks: true, flockRadius: 3, separationDistance: 0.8 },
  nativeStatus: "native",
  resourceNeeds: ["vegetacao-aquatica", "pastagem"],
  confidence: 0.82,
};

const onca: SpeciesDefinition = {
  id: "onca-pintada",
  commonName: "Onca-pintada",
  scientificName: "Panthera onca",
  category: "predator-large",
  habitableBiomes: ["floresta-tropical-umida", "cerrado", "pantanal"],
  diet: ["mamiferos"],
  preySpeciesIds: ["capivara", "veado-campeiro"],
  trophicLevel: "apex",
  feedingStrategy: "carnivore",
  mass: 82,
  awarenessRange: 7,
  predation: { attackRange: 0.8, huntRange: 7, damageRate: 0.9, hungerRate: 0.03 },
  populationTarget: 3,
  movementProfile: { maxSpeed: 1.35, turnRate: 1.6, fleeMultiplier: 1.2 },
  flockProfile: { formsFlocks: false, flockRadius: 0, separationDistance: 1.2 },
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.84,
};

const veado: SpeciesDefinition = {
  id: "veado-campeiro",
  commonName: "Veado-campeiro",
  scientificName: "Ozotoceros bezoarticus",
  category: "herbivore-large",
  habitableBiomes: ["cerrado"],
  diet: ["gramíneas", "brotos"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 35,
  awarenessRange: 6,
  populationTarget: 16,
  movementProfile: { maxSpeed: 1.25, turnRate: 1.7, fleeMultiplier: 2 },
  flockProfile: { formsFlocks: true, flockRadius: 3.5, separationDistance: 0.9 },
  nativeStatus: "native",
  resourceNeeds: ["pastagem", "folhagem-arbustiva"],
  confidence: 0.78,
};

const javali: SpeciesDefinition = {
  id: "invasor-javali",
  commonName: "Javali",
  scientificName: "Sus scrofa",
  category: "herbivore-large",
  habitableBiomes: ["cerrado", "floresta-tropical-umida"],
  diet: ["raizes", "frutos", "invertebrados"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "omnivore",
  mass: 70,
  awarenessRange: 5,
  populationTarget: 12,
  movementProfile: { maxSpeed: 1.15, turnRate: 1.3, fleeMultiplier: 1.4 },
  flockProfile: { formsFlocks: true, flockRadius: 2.8, separationDistance: 0.8 },
  nativeStatus: "introduced",
  resourceNeeds: ["raizes-tuberculos", "frutos-sementes", "recurso-agricola"],
  confidence: 0.76,
};

// ── Fauna dos cenários polar, oceânico e montano ────────────────────────────
// Os ids espelham o catálogo do backend, para o snapshot offline mostrar a mesma
// comunidade que o modo ao vivo resolveria para esses biomas.

const krill: SpeciesDefinition = {
  id: "krill",
  commonName: "Krill-antártico",
  scientificName: "Euphausia superba",
  category: "fish",
  habitableBiomes: ["oceano-polar"],
  diet: ["fitoplâncton"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 0.002,
  awarenessRange: 2,
  populationTarget: 22,
  movementProfile: { maxSpeed: 0.9, turnRate: 2.2, fleeMultiplier: 2.4 },
  flockProfile: { formsFlocks: true, flockRadius: 2, separationDistance: 0.3 },
  taxonGroup: "invertebrado",
  nativeStatus: "native",
  resourceNeeds: ["plancton"],
  confidence: 0.8,
};

const pinguim: SpeciesDefinition = {
  id: "pinguim",
  commonName: "Pinguim-de-adélia",
  scientificName: "Pygoscelis adeliae",
  category: "fish",
  habitableBiomes: ["oceano-polar", "antartida"],
  diet: ["krill", "peixes pequenos"],
  preySpeciesIds: ["krill"],
  trophicLevel: "mesopredator",
  feedingStrategy: "carnivore",
  mass: 4.5,
  awarenessRange: 5,
  predation: { attackRange: 0.6, huntRange: 5, damageRate: 0.6, hungerRate: 0.035 },
  populationTarget: 12,
  movementProfile: { maxSpeed: 1.3, turnRate: 1.9, fleeMultiplier: 2 },
  flockProfile: { formsFlocks: true, flockRadius: 3, separationDistance: 0.6 },
  taxonGroup: "ave",
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.83,
};

const focaLeopardo: SpeciesDefinition = {
  id: "foca",
  commonName: "Foca-leopardo",
  scientificName: "Hydrurga leptonyx",
  category: "fish",
  habitableBiomes: ["oceano-polar"],
  diet: ["pinguim", "krill"],
  preySpeciesIds: ["pinguim", "krill"],
  trophicLevel: "mesopredator",
  feedingStrategy: "carnivore",
  mass: 320,
  awarenessRange: 7,
  predation: { attackRange: 0.9, huntRange: 7, damageRate: 0.85, hungerRate: 0.028 },
  populationTarget: 5,
  movementProfile: { maxSpeed: 1.45, turnRate: 1.5, fleeMultiplier: 1.2 },
  flockProfile: { formsFlocks: false, flockRadius: 0, separationDistance: 1.4 },
  taxonGroup: "mamífero",
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.81,
};

const orca: SpeciesDefinition = {
  id: "orca",
  commonName: "Orca",
  scientificName: "Orcinus orca",
  category: "fish",
  habitableBiomes: ["oceano-polar", "oceano-pelagico"],
  diet: ["foca", "pinguim"],
  preySpeciesIds: ["foca", "pinguim"],
  trophicLevel: "apex",
  feedingStrategy: "carnivore",
  mass: 4200,
  awarenessRange: 9,
  predation: { attackRange: 1.2, huntRange: 9, damageRate: 1, hungerRate: 0.022 },
  populationTarget: 3,
  movementProfile: { maxSpeed: 1.6, turnRate: 1.3, fleeMultiplier: 1.1 },
  flockProfile: { formsFlocks: true, flockRadius: 4.5, separationDistance: 1.6 },
  taxonGroup: "mamífero",
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.84,
};

const sardinha: SpeciesDefinition = {
  id: "sardinha",
  commonName: "Sardinha-verdadeira",
  scientificName: "Sardinella brasiliensis",
  category: "fish",
  habitableBiomes: ["oceano-pelagico"],
  diet: ["plâncton"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 0.12,
  awarenessRange: 3,
  populationTarget: 26,
  movementProfile: { maxSpeed: 1.2, turnRate: 2.6, fleeMultiplier: 2.6 },
  flockProfile: { formsFlocks: true, flockRadius: 2.2, separationDistance: 0.3 },
  nativeStatus: "native",
  resourceNeeds: ["plancton"],
  confidence: 0.8,
};

const tartarugaMarinha: SpeciesDefinition = {
  id: "tartaruga-marinha",
  commonName: "Tartaruga-verde",
  scientificName: "Chelonia mydas",
  category: "fish",
  habitableBiomes: ["oceano-pelagico"],
  diet: ["algas", "gramas marinhas"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 130,
  awarenessRange: 4,
  populationTarget: 6,
  movementProfile: { maxSpeed: 0.8, turnRate: 1.1, fleeMultiplier: 1.5 },
  flockProfile: { formsFlocks: false, flockRadius: 0, separationDistance: 1.5 },
  taxonGroup: "réptil",
  nativeStatus: "native",
  resourceNeeds: ["algas", "vegetacao-aquatica"],
  confidence: 0.79,
};

const atum: SpeciesDefinition = {
  id: "atum",
  commonName: "Atum-amarelo",
  scientificName: "Thunnus albacares",
  category: "fish",
  habitableBiomes: ["oceano-pelagico"],
  diet: ["sardinha"],
  preySpeciesIds: ["sardinha"],
  trophicLevel: "mesopredator",
  feedingStrategy: "carnivore",
  mass: 60,
  awarenessRange: 7,
  predation: { attackRange: 0.8, huntRange: 7, damageRate: 0.8, hungerRate: 0.032 },
  populationTarget: 9,
  movementProfile: { maxSpeed: 1.7, turnRate: 1.8, fleeMultiplier: 1.6 },
  flockProfile: { formsFlocks: true, flockRadius: 3.2, separationDistance: 0.7 },
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.82,
};

const golfinho: SpeciesDefinition = {
  id: "golfinho",
  commonName: "Golfinho-nariz-de-garrafa",
  scientificName: "Tursiops truncatus",
  category: "fish",
  habitableBiomes: ["oceano-pelagico"],
  diet: ["sardinha", "atum"],
  preySpeciesIds: ["sardinha", "atum"],
  trophicLevel: "apex",
  feedingStrategy: "carnivore",
  mass: 280,
  awarenessRange: 9,
  predation: { attackRange: 1, huntRange: 9, damageRate: 0.9, hungerRate: 0.025 },
  populationTarget: 4,
  movementProfile: { maxSpeed: 1.55, turnRate: 1.7, fleeMultiplier: 1.2 },
  flockProfile: { formsFlocks: true, flockRadius: 4, separationDistance: 1.1 },
  taxonGroup: "mamífero",
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.83,
};

const marmota: SpeciesDefinition = {
  id: "marmota",
  commonName: "Marmota-alpina",
  scientificName: "Marmota marmota",
  category: "herbivore-small",
  habitableBiomes: ["montanha-nevada", "taiga"],
  diet: ["gramíneas", "ervas"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 4,
  awarenessRange: 5,
  populationTarget: 14,
  movementProfile: { maxSpeed: 0.9, turnRate: 2.1, fleeMultiplier: 2.6 },
  flockProfile: { formsFlocks: true, flockRadius: 2.4, separationDistance: 0.6 },
  nativeStatus: "native",
  resourceNeeds: ["pastagem"],
  confidence: 0.78,
};

const cabraMontes: SpeciesDefinition = {
  id: "cabra-montes",
  commonName: "Cabra-montês",
  scientificName: "Capra ibex",
  category: "herbivore-large",
  habitableBiomes: ["montanha-nevada", "taiga"],
  diet: ["gramíneas", "brotos", "líquens"],
  preySpeciesIds: [],
  trophicLevel: "herbivore",
  feedingStrategy: "herbivore",
  mass: 90,
  awarenessRange: 7,
  populationTarget: 11,
  movementProfile: { maxSpeed: 1.1, turnRate: 1.6, fleeMultiplier: 2.2 },
  flockProfile: { formsFlocks: true, flockRadius: 3.4, separationDistance: 0.9 },
  nativeStatus: "native",
  resourceNeeds: ["pastagem", "folhagem-arbustiva"],
  confidence: 0.8,
};

const aguiaReal: SpeciesDefinition = {
  id: "aguia-real",
  commonName: "Águia-real",
  scientificName: "Aquila chrysaetos",
  category: "bird",
  habitableBiomes: ["montanha-nevada", "taiga"],
  diet: ["marmota"],
  preySpeciesIds: ["marmota"],
  trophicLevel: "mesopredator",
  feedingStrategy: "carnivore",
  mass: 5,
  awarenessRange: 10,
  predation: { attackRange: 0.7, huntRange: 10, damageRate: 0.75, hungerRate: 0.03 },
  populationTarget: 4,
  movementProfile: { maxSpeed: 2.2, turnRate: 1.9, fleeMultiplier: 1.4 },
  flockProfile: { formsFlocks: false, flockRadius: 0, separationDistance: 1.8 },
  taxonGroup: "ave",
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.79,
};

const pumaAndino: SpeciesDefinition = {
  id: "puma-andino",
  commonName: "Puma-andino",
  scientificName: "Puma concolor",
  category: "predator-large",
  habitableBiomes: ["montanha-nevada", "taiga"],
  diet: ["cabra-montes", "marmota"],
  preySpeciesIds: ["cabra-montes", "marmota"],
  trophicLevel: "apex",
  feedingStrategy: "carnivore",
  mass: 65,
  awarenessRange: 8,
  predation: { attackRange: 0.85, huntRange: 8, damageRate: 0.9, hungerRate: 0.028 },
  populationTarget: 3,
  movementProfile: { maxSpeed: 1.4, turnRate: 1.7, fleeMultiplier: 1.2 },
  flockProfile: { formsFlocks: false, flockRadius: 0, separationDistance: 1.3 },
  nativeStatus: "native",
  resourceNeeds: ["carnica"],
  confidence: 0.81,
};

function reportFor(
  profile: SnapshotProfile,
  fauna: SpeciesDefinition[],
): EcosystemReportResult["report"] {
  const spec = PROFILE_SPECS[profile];
  const coherent = spec.coherent;
  const apex = fauna.find((s) => s.trophicLevel === "apex");
  const basePrey = fauna.find((s) => s.trophicLevel === "herbivore") ?? fauna[0]!;
  return {
    climate: {
      baseTemperatureC: spec.baseTemperatureC,
      basePrecipitationMm: spec.basePrecipitationMm,
      baseHumidityPct: spec.baseHumidityPct,
      temperatureRangeC: spec.temperatureRangeC,
      precipitationRangeMm: spec.precipitationRangeMm,
      humidityRangePct: spec.humidityRangePct,
      dominantClimateCode: spec.climateCode,
      climateCodes: [{ code: spec.climateCode, pct: 100 }],
    },
    relief: {
      elevationMin: 0.08,
      elevationMax: 0.74,
      elevationMean: 0.38,
      ruggedness: 0.22,
      waterCoveragePct: spec.waterCoveragePct,
      cellCount: GRID_WIDTH * GRID_HEIGHT,
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
    },
    vegetation: {
      dominantBiomes: [{ biome: spec.dominantBiome, pct: 88 }],
      description: spec.vegetationDescription,
    },
    formations: {
      caveCells: 0,
      caveSystems: 0,
      visibleEntrances: 0,
      subterraneanCells: 0,
      chamberCells: 0,
      tunnelCells: 0,
      connections: 0,
      maxCaveDepth: 0,
      avgCaveDepth: 0,
      shallowCaveCount: 0,
      deepCaveCount: 0,
      fallbackSingleCellSystems: 0,
      largestSystemCells: 0,
      caveTypes: [],
      mountainCoveragePct: spec.mountainCoveragePct,
      cliffCoveragePct: spec.cliffCoveragePct,
      rockyCoveragePct: spec.rockyCoveragePct,
      ledgeCells: 0,
      riverCells: spec.riverCells,
      maxWaterFlow: spec.maxWaterFlow,
      waterfallCells: 0,
    },
    fauna: {
      totalSpecies: fauna.length,
      totalPopulation: fauna.reduce((sum, item) => sum + item.populationTarget, 0),
      byCategory: [{ category: "herbivore-large", count: fauna.filter((s) => s.category === "herbivore-large").length }],
      byFeedingStrategy: [
        { feedingStrategy: "herbivore", count: fauna.filter((s) => s.feedingStrategy === "herbivore").length },
        { feedingStrategy: "carnivore", count: fauna.filter((s) => s.feedingStrategy === "carnivore").length },
      ],
      species: fauna.map((s) => ({
        commonName: s.commonName,
        scientificName: s.scientificName,
        category: s.category,
        feedingStrategy: s.feedingStrategy,
        habitat: s.category === "fish" ? "water" : "land",
        populationTarget: s.populationTarget,
        isPredator: s.preySpeciesIds.length > 0,
      })),
    },
    resourceBase: {
      resourceBase: coherent
        ? [
            { type: "pastagem", label: "Pastagem", availability: profile === "cerrado" ? 0.82 : 0.4, sources: ["snapshot"] },
            { type: "frutos-sementes", label: "Frutos e sementes", availability: profile === "amazon" ? 0.86 : 0.48, sources: ["snapshot"] },
          ]
        : [],
      consumers: fauna.map((s) => ({
        speciesId: s.id,
        commonName: s.commonName,
        needs: s.resourceNeeds ?? [],
        satisfiedBy: coherent ? s.resourceNeeds ?? [] : [],
        supported: coherent,
      })),
      unsupportedConsumers: coherent ? [] : fauna.map((s) => s.commonName),
      resourceWarnings: spec.resourceWarnings ?? [],
      herbivorePressure: {
        level: coherent ? "moderada" : "alta",
        ratio: coherent ? 0.42 : 1,
        detail: coherent ? "Consumidores compatíveis com a base basal." : "Consumidores sem base basal suficiente.",
      },
    },
    trophicNetwork: {
      links: apex
        ? [{ predatorId: apex.id, predatorName: apex.commonName, preyId: basePrey.id, preyName: basePrey.commonName }]
        : [],
      prunedLinks:
        coherent || !apex
          ? []
          : [{ predatorId: apex.id, predatorName: apex.commonName, preyId: "peixe-estuarino", reason: "presa e habitat ausentes" }],
      unsupportedSpecies: coherent ? [] : fauna.map((s) => s.commonName),
      levels: [
        { level: "herbivore", count: fauna.filter((s) => s.trophicLevel === "herbivore").length, species: fauna.filter((s) => s.trophicLevel === "herbivore").map((s) => s.commonName) },
        { level: "apex", count: fauna.filter((s) => s.trophicLevel === "apex").length, species: fauna.filter((s) => s.trophicLevel === "apex").map((s) => s.commonName) },
      ],
      producers: coherent ? ["plantas vasculares", "gramíneas"] : [],
      warnings: coherent ? [] : ["Rede trófica inconsistente por ausência de habitat basal."],
      pyramidConsistent: coherent,
    },
    ecosystemProfile: {
      matched: true,
      profile: {
        slug: profile,
        displayName: spec.displayName,
        medium: spec.medium,
        compatibleBiomes: [spec.dominantBiome],
        climate: spec.profileClimate,
        substrateNotes: "Perfil curado simplificado para snapshot offline.",
        water: { presence: spec.waterPresence, salinityRangePsu: spec.salinityRangePsu },
        dominantResources: coherent ? spec.dominantResources : ["detrito"],
        compatibleFaunaGroups: spec.compatibleFaunaGroups,
        incompatibleConditions: spec.incompatibleConditions ?? [],
        sourceNotes: "Snapshot offline demonstrativo.",
        confidence: spec.profileConfidence,
      },
      mismatches: spec.mismatches ?? [],
      consistencyScore: coherent ? 0.88 : 0.28,
    },
    abioticFactors: [
      { label: "temperatura", value: spec.baseTemperatureC, unit: "C" },
      { label: "precipitação", value: spec.basePrecipitationMm, unit: "mm/ano" },
    ],
    scientificExplanation: {
      grounded: true,
      coverage: coherent ? "sufficient" : "insufficient",
      facts: [
        {
          title: "Snapshot curado",
          text: "Cenário precomputado para demonstração offline da interface e dos relatórios.",
          category: "demo",
          citationKey: null,
          year: null,
        },
      ],
      sources: ["Sara Core offline demo v1"],
    },
    plausibility: {
      overall: coherent ? "alto" : "baixo",
      criteria: [{ label: "Coerência geral", rating: coherent ? "alto" : "baixo", detail: coherent ? "Sem contradições bloqueantes." : "Contradições ambientais intencionais." }],
      caveat: "Scores são heurísticos e educacionais; não são previsões ecológicas formais.",
    },
    validation: {
      score: spec.validationScore,
      label: coherent ? "alta" : "baixa",
      components: [{ key: "profile", label: "Perfil curado", score: coherent ? 0.88 : 0.28, weight: 1, detail: coherent ? "Condições compatíveis." : "Perfil contraditório." }],
      issues: spec.validationIssues ?? [],
      assumptions: ["Snapshot offline precomputado."],
      missingData: [],
      positiveFactors: coherent ? ["Fauna e recursos compatíveis."] : [],
      blockingContradictions: spec.blockingContradictions ?? [],
    },
    limitations: ["Demonstração offline; não consulta backend, Neon ou provedor de IA."],
  };
}

function ecosystemSnapshot(
  scenarioId: DemoScenarioId,
  profile: SnapshotProfile,
  species: SpeciesDefinition[],
): OfflineEcosystemSnapshot {
  const spec = PROFILE_SPECS[profile];
  const terrain = gridFor(profile);
  return {
    meta: {
      snapshotVersion: 1,
      scenarioId,
      precomputed: true,
      generatedAt: "2026-07-17T00:00:00.000Z",
      disclosure: OFFLINE_DISCLOSURE,
    },
    result: {
      biomeName: spec.biomeName,
      biomeSlug: spec.biomeSlug,
      interpretation: "Snapshot offline validado para apresentação.",
      terrainParams: {
        baseTemperatureC: terrain.baseTemperatureC,
        basePrecipitationMm: terrain.basePrecipitationMm,
        baseHumidityPct: spec.baseHumidityPct,
        width: terrain.width,
        height: terrain.height,
        seed: terrain.seed,
        reliefStyle: spec.reliefStyle,
      },
      terrain,
      source: "default",
      species,
      report: reportFor(profile, species),
    },
  };
}

export const OFFLINE_ECOSYSTEM_SNAPSHOTS: Record<Exclude<DemoScenarioId, "invasao-javali-cerrado">, OfflineEcosystemSnapshot> = {
  "amazonia-coerente": ecosystemSnapshot("amazonia-coerente", "amazon", [capivara, onca]),
  "cerrado-predador-presa": ecosystemSnapshot("cerrado-predador-presa", "cerrado", [veado, onca]),
  "manguezal-incoerente": ecosystemSnapshot("manguezal-incoerente", "mangrove", [veado, onca]),
  // krill → pinguim → foca → orca: cadeia curta e inteiramente antártica.
  "antartida-cadeia-polar": ecosystemSnapshot("antartida-cadeia-polar", "antarctic", [
    krill,
    pinguim,
    focaLeopardo,
    orca,
  ]),
  // sardinha/tartaruga → atum → golfinho: o pelágico quente, sem fauna polar.
  "oceano-pelagico-tropical": ecosystemSnapshot("oceano-pelagico-tropical", "ocean", [
    sardinha,
    tartarugaMarinha,
    atum,
    golfinho,
  ]),
  // marmota/cabra → águia → puma: gradiente de altitude com predador de topo.
  "montanha-nevada-alpina": ecosystemSnapshot("montanha-nevada-alpina", "mountain", [
    marmota,
    cabraMontes,
    aguiaReal,
    pumaAndino,
  ]),
};

export const OFFLINE_INVASIVE_SNAPSHOT: OfflineInvasiveSnapshot = {
  meta: {
    snapshotVersion: 1,
    scenarioId: "invasao-javali-cerrado",
    terrainSnapshotId: "cerrado-predador-presa",
    precomputed: true,
    generatedAt: "2026-07-17T00:00:00.000Z",
    disclosure: OFFLINE_DISCLOSURE,
  },
  result: {
    terrain: OFFLINE_ECOSYSTEM_SNAPSHOTS["cerrado-predador-presa"].result.terrain,
    resolvedBiomes: ["cerrado"],
    invader: javali,
    nativeSpecies: [
      veado,
      {
        ...onca,
        diet: [...onca.diet, javali.id],
        preySpeciesIds: [...onca.preySpeciesIds, javali.id],
        predation: {
          ...onca.predation,
          preyPreference: { ...(onca.predation?.preyPreference ?? {}), [javali.id]: 0.8 },
        },
      },
    ],
    community: {
      resourceBase: OFFLINE_ECOSYSTEM_SNAPSHOTS["cerrado-predador-presa"].result.report.resourceBase,
      defenses: [
        {
          speciesId: onca.id,
          commonName: onca.commonName,
          response: "predation",
          strength: "high",
          reason: "Predador nativo de grande porte capaz de contestar indivíduos invasores.",
        },
        {
          speciesId: veado.id,
          commonName: veado.commonName,
          response: "avoidance",
          strength: "moderate",
          reason: "Detecta a perturbação e reduz encontros por fuga e mudança de área.",
        },
      ],
      warnings: [],
      baseline: {
        flora: "Savana de gramíneas, arbustos e árvores baixas espaçadas, resistentes à seca e ao fogo.",
        fauna: ["lobo-guará", "tamanduá-bandeira", "tatu", "veado-campeiro", "ema", "onça-parda"],
        structuralRule: "Manter áreas abertas e árvores espaçadas, sem converter o Cerrado em floresta fechada.",
        keyResources: ["pastagem", "folhagem-arbustiva", "frutos-sementes", "raizes-tuberculos"],
      },
    },
    invaderProfile: {
      displayName: "Javali",
      scientificName: "Sus scrofa",
      nativeBiomes: ["floresta-temperada", "campos"],
      survives: true,
    },
    nativeImpacts: [
      { speciesId: "veado-campeiro", commonName: "Veado-campeiro", effect: "competition", populationDelta: -4, baselinePopulation: 18, reason: "Compartilha recursos de pastagem e frutos." },
      { speciesId: "onca-pintada", commonName: "Onca-pintada", effect: "resource-pressure", populationDelta: -1, baselinePopulation: 3, reason: "Pressão indireta sobre a rede trófica do cenário demonstrativo." },
    ],
    phases: [
      { label: "Introdução", tSeconds: 0, invaderPop: 3, nativeDeltas: {} },
      { label: "Estabelecimento", tSeconds: 30, invaderPop: 8, nativeDeltas: { "veado-campeiro": -2 } },
      { label: "Dispersão", tSeconds: 60, invaderPop: 12, nativeDeltas: { "veado-campeiro": -4, "onca-pintada": -1 } },
    ],
    impactMechanisms: [
      {
        kind: "sobrepastejo",
        label: "Sobrepastejo",
        severity: "alta",
        description: "Consumo e revolvimento do solo reduzem a regeneração vegetal.",
        targets: ["pastagem", "frutos e sementes"],
      },
      {
        kind: "competicao-alimentar",
        label: "Competição alimentar",
        severity: "moderada",
        description: "Disputa recursos basais com herbívoros nativos.",
        targets: ["veado-campeiro"],
      },
    ],
    affectedResources: [
      { type: "raizes-tuberculos", label: "Raizes e tubérculos", detail: "Revolvimento de solo e consumo direto." },
      { type: "frutos-sementes", label: "Frutos e sementes", detail: "Competição por alimento sazonal." },
    ],
    establishmentPlausibility: { score: 78, label: "alta" },
    spreadPressure: "alta",
    plausibility: {
      overall: "alto",
      criteria: [{ label: "Habitat", rating: "alto", detail: "Cerrado oferece alimento e cobertura suficientes no snapshot." }],
      caveat: "Estimativa heurística para demonstração, não previsão formal.",
    },
    explanation: {
      text: "Snapshot offline: mecanismos de javali foram precomputados para demonstrar a leitura de bioinvasão.",
      grounded: true,
      coverage: "sufficient",
      facts: [],
      sources: ["Sara Core offline demo v1"],
    },
    uncertainties: ["Sem dispersão espacial real de longo prazo no MVP.", "Não inclui manejo humano."],
    mvpAssumptions: ["A presença visual da invasora é simulada; impactos de longo prazo são explicativos."],
    limitations: ["Demonstração offline sem consulta ao backend."],
    simulationScope: {
      simulated: ["presença visual da invasora", "convivência local com fauna"],
      explanationOnly: ["efeitos populacionais de longo prazo", "controle e manejo"],
    },
  },
};
