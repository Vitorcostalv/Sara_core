import type {
  EcosystemReportResult,
  InvasiveScenarioResult,
  SpeciesDefinition,
  TerrainCell,
  TerrainGrid,
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
  "Modo de demonstracao offline - cenario previamente calculado e validado. Nenhuma consulta ao banco ou ao provedor de IA esta sendo realizada.";

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
    elevation,
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

function gridFor(kind: "amazon" | "cerrado" | "mangrove", seed: number): TerrainGrid {
  const width = 18;
  const height = 14;
  const cells: TerrainCell[][] = [];

  for (let y = 0; y < height; y += 1) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < width; x += 1) {
      const river = kind !== "cerrado" && Math.abs(x - Math.floor(width / 2)) <= (y % 3 === 0 ? 1 : 0);
      if (kind === "amazon") {
        row.push(
          cell(x, y, river ? "lago" : "floresta-tropical-umida", seed, {
            isWater: river,
            temperatureC: 27 + ((x + y) % 3),
            humidityPct: 86,
            precipitationMmYear: 2800,
            climateCode: "Af",
            waterFlow: river ? 0.45 : 0.04,
            riverDistance: river ? 0 : Math.abs(x - Math.floor(width / 2)),
            objects: river ? undefined : ["bush", "fallen-log"],
          }),
        );
      } else if (kind === "cerrado") {
        row.push(
          cell(x, y, "cerrado", seed, {
            temperatureC: 25 + ((x + y) % 4),
            humidityPct: 58,
            precipitationMmYear: 1300,
            climateCode: "Aw",
            objects: (x + y) % 6 === 0 ? ["rock", "bush"] : ["bush"],
          }),
        );
      } else {
        const shouldBeWater = x < 2 && y < 2;
        row.push(
          cell(x, y, "manguezal", seed, {
            isWater: shouldBeWater,
            temperatureC: 33,
            humidityPct: 38,
            precipitationMmYear: 420,
            salinityPsu: shouldBeWater ? 4 : 0,
            climateCode: "BSh",
            objects: shouldBeWater ? undefined : ["dead-tree", "rock"],
          }),
        );
      }
    }
    cells.push(row);
  }

  return {
    width,
    height,
    seed,
    baseTemperatureC: kind === "mangrove" ? 33 : kind === "amazon" ? 28 : 26,
    basePrecipitationMm: kind === "mangrove" ? 420 : kind === "amazon" ? 2800 : 1300,
    cells,
    simulationNote: "Snapshot offline precomputado para demonstracao visual; nao e uma simulacao ao vivo.",
  };
}

const capivara: SpeciesDefinition = {
  id: "capivara",
  commonName: "Capivara",
  scientificName: "Hydrochoerus hydrochaeris",
  category: "herbivore-large",
  habitableBiomes: ["floresta-tropical-umida", "lago", "cerrado"],
  diet: ["gramineas", "plantas aquaticas"],
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
  diet: ["gramineas", "brotos"],
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

function reportFor(
  profile: "amazon" | "cerrado" | "mangrove",
  fauna: SpeciesDefinition[],
): EcosystemReportResult["report"] {
  const coherent = profile !== "mangrove";
  const isAmazon = profile === "amazon";
  return {
    climate: {
      baseTemperatureC: isAmazon ? 28 : profile === "cerrado" ? 26 : 33,
      basePrecipitationMm: isAmazon ? 2800 : profile === "cerrado" ? 1300 : 420,
      baseHumidityPct: isAmazon ? 86 : profile === "cerrado" ? 58 : 38,
      temperatureRangeC: isAmazon ? [24, 31] : profile === "cerrado" ? [20, 33] : [31, 36],
      precipitationRangeMm: isAmazon ? [2400, 3200] : profile === "cerrado" ? [900, 1600] : [200, 600],
      humidityRangePct: isAmazon ? [78, 94] : profile === "cerrado" ? [42, 72] : [25, 45],
      dominantClimateCode: isAmazon ? "Af" : profile === "cerrado" ? "Aw" : "BSh",
      climateCodes: [{ code: isAmazon ? "Af" : profile === "cerrado" ? "Aw" : "BSh", pct: 100 }],
    },
    relief: {
      elevationMin: 0.08,
      elevationMax: 0.74,
      elevationMean: 0.38,
      ruggedness: 0.22,
      waterCoveragePct: isAmazon ? 12 : profile === "cerrado" ? 0 : 2,
      cellCount: 252,
      width: 18,
      height: 14,
    },
    vegetation: {
      dominantBiomes: [{ biome: isAmazon ? "floresta-tropical-umida" : profile, pct: 88 }],
      description: isAmazon
        ? "Matriz florestal umida com corredores de agua doce."
        : profile === "cerrado"
          ? "Campo savanico com gramineas, arbustos e manchas lenhosas."
          : "Perfil solicitado como manguezal, mas sem agua salobra e umidade minima.",
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
      mountainCoveragePct: 0,
      cliffCoveragePct: 0,
      rockyCoveragePct: profile === "cerrado" ? 18 : 6,
      ledgeCells: 0,
      riverCells: isAmazon ? 28 : 0,
      maxWaterFlow: isAmazon ? 0.5 : 0,
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
            { type: "frutos-sementes", label: "Frutos e sementes", availability: isAmazon ? 0.86 : 0.48, sources: ["snapshot"] },
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
      resourceWarnings: coherent ? [] : ["Manguezal sem agua salobra e baixa umidade nao sustenta os recursos esperados."],
      herbivorePressure: {
        level: coherent ? "moderada" : "alta",
        ratio: coherent ? 0.42 : 1,
        detail: coherent ? "Consumidores compatíveis com a base basal." : "Consumidores sem base basal suficiente.",
      },
    },
    trophicNetwork: {
      links: fauna.includes(onca) ? [{ predatorId: onca.id, predatorName: onca.commonName, preyId: fauna[0]!.id, preyName: fauna[0]!.commonName }] : [],
      prunedLinks: coherent ? [] : [{ predatorId: onca.id, predatorName: onca.commonName, preyId: "peixe-estuarino", reason: "presa e habitat ausentes" }],
      unsupportedSpecies: coherent ? [] : fauna.map((s) => s.commonName),
      levels: [
        { level: "herbivore", count: fauna.filter((s) => s.trophicLevel === "herbivore").length, species: fauna.filter((s) => s.trophicLevel === "herbivore").map((s) => s.commonName) },
        { level: "apex", count: fauna.filter((s) => s.trophicLevel === "apex").length, species: fauna.filter((s) => s.trophicLevel === "apex").map((s) => s.commonName) },
      ],
      producers: coherent ? ["plantas vasculares", "gramineas"] : [],
      warnings: coherent ? [] : ["Rede trofica inconsistente por ausencia de habitat basal."],
      pyramidConsistent: coherent,
    },
    ecosystemProfile: {
      matched: true,
      profile: {
        slug: profile,
        displayName: isAmazon ? "Amazonia" : profile === "cerrado" ? "Cerrado" : "Manguezal",
        medium: profile === "mangrove" ? "coastal" : "terrestrial",
        compatibleBiomes: [isAmazon ? "floresta-tropical-umida" : profile],
        climate: isAmazon ? { temperatureRangeC: [24, 32], rainfallMmYear: [2200, 3500], humidityPct: [75, 95] } : { temperatureRangeC: [20, 34], rainfallMmYear: [800, 1800], humidityPct: [35, 75] },
        substrateNotes: "Perfil curado simplificado para snapshot offline.",
        water: { presence: profile === "mangrove" ? "brackish" : isAmazon ? "freshwater" : "none", salinityRangePsu: profile === "mangrove" ? [5, 30] : [0, 1] },
        dominantResources: coherent ? ["pastagem", "frutos-sementes"] : ["detrito"],
        compatibleFaunaGroups: ["mamíferos", "aves"],
        incompatibleConditions: coherent ? [] : ["baixa umidade", "ausencia de agua salobra"],
        sourceNotes: "Snapshot offline demonstrativo.",
        confidence: coherent ? 0.82 : 0.7,
      },
      mismatches: coherent ? [] : ["Manguezal exige agua salobra recorrente.", "Baixa umidade contradiz o perfil esperado."],
      consistencyScore: coherent ? 0.88 : 0.28,
    },
    abioticFactors: [
      { label: "temperatura", value: isAmazon ? 28 : profile === "cerrado" ? 26 : 33, unit: "C" },
      { label: "precipitacao", value: isAmazon ? 2800 : profile === "cerrado" ? 1300 : 420, unit: "mm/ano" },
    ],
    scientificExplanation: {
      grounded: true,
      coverage: coherent ? "sufficient" : "insufficient",
      facts: [
        {
          title: "Snapshot curado",
          text: "Cenario precomputado para demonstracao offline da interface e dos relatorios.",
          category: "demo",
          citationKey: null,
          year: null,
        },
      ],
      sources: ["Sara Core offline demo v1"],
    },
    plausibility: {
      overall: coherent ? "alto" : "baixo",
      criteria: [{ label: "Coerencia geral", rating: coherent ? "alto" : "baixo", detail: coherent ? "Sem contradicoes bloqueantes." : "Contradicoes ambientais intencionais." }],
      caveat: "Scores sao heuristicos e educacionais; nao sao previsoes ecologicas formais.",
    },
    validation: {
      score: coherent ? (isAmazon ? 88 : 82) : 31,
      label: coherent ? "alta" : "baixa",
      components: [{ key: "profile", label: "Perfil curado", score: coherent ? 0.88 : 0.28, weight: 1, detail: coherent ? "Condicoes compativeis." : "Perfil contraditorio." }],
      issues: coherent ? [] : ["Manguezal seco e sem agua salobra."],
      assumptions: ["Snapshot offline precomputado."],
      missingData: [],
      positiveFactors: coherent ? ["Fauna e recursos compatíveis."] : [],
      blockingContradictions: coherent ? [] : ["Manguezal sem agua salobra recorrente."],
    },
    limitations: ["Demonstração offline; nao consulta backend, Neon ou provedor de IA."],
  };
}

function ecosystemSnapshot(
  scenarioId: DemoScenarioId,
  profile: "amazon" | "cerrado" | "mangrove",
  species: SpeciesDefinition[],
): OfflineEcosystemSnapshot {
  const terrain = gridFor(profile, profile === "amazon" ? 9021 : profile === "cerrado" ? 1704 : 3309);
  return {
    meta: {
      snapshotVersion: 1,
      scenarioId,
      precomputed: true,
      generatedAt: "2026-07-17T00:00:00.000Z",
      disclosure: OFFLINE_DISCLOSURE,
    },
    result: {
      biomeName: profile === "amazon" ? "Amazonia" : profile === "cerrado" ? "Cerrado" : "Manguezal incoerente",
      biomeSlug: profile,
      interpretation: "Snapshot offline validado para apresentacao.",
      terrainParams: {
        baseTemperatureC: terrain.baseTemperatureC,
        basePrecipitationMm: terrain.basePrecipitationMm,
        baseHumidityPct: profile === "amazon" ? 86 : profile === "cerrado" ? 58 : 38,
        width: terrain.width,
        height: terrain.height,
        seed: terrain.seed,
        reliefStyle: "default",
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
      { label: "Introducao", tSeconds: 0, invaderPop: 3, nativeDeltas: {} },
      { label: "Estabelecimento", tSeconds: 30, invaderPop: 8, nativeDeltas: { "veado-campeiro": -2 } },
      { label: "Dispersao", tSeconds: 60, invaderPop: 12, nativeDeltas: { "veado-campeiro": -4, "onca-pintada": -1 } },
    ],
    impactMechanisms: [
      {
        kind: "sobrepastejo",
        label: "Sobrepastejo",
        severity: "alta",
        description: "Consumo e revolvimento do solo reduzem a regeneracao vegetal.",
        targets: ["pastagem", "frutos e sementes"],
      },
      {
        kind: "competicao-alimentar",
        label: "Competicao alimentar",
        severity: "moderada",
        description: "Disputa recursos basais com herbivoros nativos.",
        targets: ["veado-campeiro"],
      },
    ],
    affectedResources: [
      { type: "raizes-tuberculos", label: "Raizes e tuberculos", detail: "Revolvimento de solo e consumo direto." },
      { type: "frutos-sementes", label: "Frutos e sementes", detail: "Competicao por alimento sazonal." },
    ],
    establishmentPlausibility: { score: 78, label: "alta" },
    spreadPressure: "alta",
    plausibility: {
      overall: "alto",
      criteria: [{ label: "Habitat", rating: "alto", detail: "Cerrado oferece alimento e cobertura suficientes no snapshot." }],
      caveat: "Estimativa heuristica para demonstracao, nao previsao formal.",
    },
    explanation: {
      text: "Snapshot offline: mecanismos de javali foram precomputados para demonstrar a leitura de bioinvasao.",
      grounded: true,
      coverage: "sufficient",
      facts: [],
      sources: ["Sara Core offline demo v1"],
    },
    uncertainties: ["Sem dispersao espacial real de longo prazo no MVP.", "Nao inclui manejo humano."],
    mvpAssumptions: ["A presenca visual da invasora e simulada; impactos de longo prazo sao explicativos."],
    limitations: ["Demonstração offline sem consulta ao backend."],
    simulationScope: {
      simulated: ["presenca visual da invasora", "convivencia local com fauna"],
      explanationOnly: ["efeitos populacionais de longo prazo", "controle e manejo"],
    },
  },
};
