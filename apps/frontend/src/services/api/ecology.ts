import type { ApiErrorResponse } from "@sara/shared-types";
import { buildApiUrl, buildApiHeaders, fetchWithTimeout, ApiClientError } from "./client";

// ─── Response envelope ────────────────────────────────────────────────────────

export interface ApiSingle<T> {
  data: T;
}

export interface ApiPaged<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

// ─── Domain rows (mirror backend shapes) ─────────────────────────────────────

export interface EcosystemRow {
  id: string;
  slug: string;
  title: string;
  ecosystem_kind: string;
  medium: string;
  description: string;
  operational_definition: string;
  biotic_summary: string | null;
  abiotic_summary: string | null;
  climate_code: string | null;
  biome_title: string | null;
  realm_title: string | null;
  ecoregion_label: string | null;
  is_active: boolean;
}

export interface SpeciesRow {
  id: string;
  scientific_name: string;
  common_name: string | null;
  native_range: string | null;
  conservation_status: string | null;
  trophic_role_label: string | null;
  trophic_level: number | null;
  ecosystem_slugs: string[];
}

export interface AbioticFactorRow {
  id: string;
  slug: string;
  title: string;
  factor_type: string;
  unit: string | null;
  description: string | null;
  is_active: boolean;
}

export interface ArtificialProjectRow {
  id: string;
  slug: string;
  title: string;
  project_type: string;
  ecosystem_kind: string;
  description: string;
  objective: string;
  intervention_scale: string | null;
  caution_notes: string | null;
  is_active: boolean;
  target_ecosystem_slugs: string[];
}

export interface ModelingApproachRow {
  id: string;
  slug: string;
  title: string;
  family: string;
  description: string;
  primary_use: string | null;
  strengths: string | null;
  limitations: string | null;
  is_active: boolean;
}

export interface DomainCoverageStats {
  totalFacts?: number;
  activeFacts?: number;
  byCategory?: Record<string, number>;
  [key: string]: unknown;
}

// ─── Prompt terrain result ────────────────────────────────────────────────────

export type ReliefStyle = "default" | "ocean" | "mountain" | "polar";

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

// ─── Ecosystem report ─────────────────────────────────────────────────────────

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

export interface FormationSummary {
  caveCells: number;
  caveSystems: number;
  visibleEntrances: number;
  subterraneanCells: number;
  chamberCells: number;
  tunnelCells: number;
  connections: number;
  maxCaveDepth: number;
  avgCaveDepth: number;
  shallowCaveCount: number;
  deepCaveCount: number;
  fallbackSingleCellSystems: number;
  largestSystemCells: number;
  caveTypes: Array<{ type: string; count: number }>;
  mountainCoveragePct: number;
  cliffCoveragePct: number;
  rockyCoveragePct: number;
  ledgeCells: number;
  riverCells: number;
  maxWaterFlow: number;
  waterfallCells: number;
}

export interface FaunaSummary {
  totalSpecies: number;
  totalPopulation: number;
  byCategory: Array<{ category: string; count: number }>;
  byFeedingStrategy: Array<{ feedingStrategy: FeedingStrategy; count: number }>;
  species: Array<{
    commonName: string;
    scientificName: string;
    category: string;
    feedingStrategy: FeedingStrategy;
    habitat: "cave" | "water" | "land";
    populationTarget: number;
    isPredator: boolean;
  }>;
}

// ─── Ecological knowledge layer (resource base, trophic network, validation) ─────

export type TaxonGroup = "mamífero" | "ave" | "peixe" | "réptil" | "anfíbio" | "invertebrado";
export type NativeStatus = "native" | "introduced" | "unknown";

export type ResourceType =
  | "pastagem"
  | "folhagem-arbustiva"
  | "folhagem-dossel"
  | "frutos-sementes"
  | "raizes-tuberculos"
  | "vegetacao-aquatica"
  | "plancton"
  | "algas"
  | "detrito"
  | "materia-organica-cavernicola"
  | "carnica"
  | "nectar-polen"
  | "recurso-agricola";

export interface ResourceAvailability {
  type: ResourceType;
  label: string;
  availability: number;
  sources: string[];
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
  ratio: number;
  detail: string;
}

export interface ResourceBaseAssessment {
  resourceBase: ResourceAvailability[];
  consumers: ConsumerSupport[];
  unsupportedConsumers: string[];
  resourceWarnings: string[];
  herbivorePressure: HerbivorePressure;
}

export interface TrophicLink {
  predatorId: string;
  predatorName: string;
  preyId: string;
  preyName: string;
}

export interface PrunedTrophicLink {
  predatorId: string;
  predatorName: string;
  preyId: string;
  reason: string;
}

export interface TrophicLevelSummary {
  level: TrophicLevel;
  count: number;
  species: string[];
}

export interface TrophicConsistencyReport {
  links: TrophicLink[];
  prunedLinks: PrunedTrophicLink[];
  unsupportedSpecies: string[];
  levels: TrophicLevelSummary[];
  producers: string[];
  warnings: string[];
  pyramidConsistent: boolean;
}

export type PlausibilityBand = "baixa" | "moderada" | "alta";

export interface PlausibilityComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface EcologicalValidation {
  score: number;
  label: PlausibilityBand;
  components: PlausibilityComponent[];
  issues: string[];
  assumptions: string[];
  missingData: string[];
  positiveFactors: string[];
  blockingContradictions: string[];
}

// ─── Curated ecosystem profile (deterministic reference) ─────────────────────────

export type EcosystemMedium = "terrestrial" | "aquatic" | "mixed" | "cave" | "coastal";
export type WaterPresence = "none" | "freshwater" | "brackish" | "marine";

export interface EcosystemProfile {
  slug: string;
  displayName: string;
  medium: EcosystemMedium;
  compatibleBiomes: string[];
  climate: {
    temperatureRangeC: [number, number];
    rainfallMmYear: [number, number];
    humidityPct: [number, number];
  };
  substrateNotes: string;
  water: { presence: WaterPresence; salinityRangePsu: [number, number] };
  dominantResources: ResourceType[];
  compatibleFaunaGroups: string[];
  incompatibleConditions: string[];
  sourceNotes: string;
  confidence: number;
}

export interface EcosystemProfileMatch {
  matched: boolean;
  profile: EcosystemProfile | null;
  mismatches: string[];
  consistencyScore: number;
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

export type PlausibilityRating = "alto" | "medio" | "baixo";

export interface PlausibilityCriterion {
  label: string;
  rating: PlausibilityRating;
  detail: string;
}

export interface PlausibilityAssessment {
  overall: PlausibilityRating;
  criteria: PlausibilityCriterion[];
  caveat: string;
}

export interface EcosystemReport {
  climate: ClimateSummary;
  relief: ReliefSummary;
  vegetation: VegetationSummary;
  formations: FormationSummary;
  fauna: FaunaSummary;
  resourceBase: ResourceBaseAssessment;
  trophicNetwork: TrophicConsistencyReport;
  /** Curated ecosystem-profile match (optional/defensive; older responses may omit it). */
  ecosystemProfile?: EcosystemProfileMatch;
  abioticFactors: AbioticFactor[];
  scientificExplanation: ScientificExplanation;
  plausibility: PlausibilityAssessment;
  validation: EcologicalValidation;
  limitations: string[];
}

export interface EcosystemReportResult extends TerrainPromptResult {
  species: SpeciesDefinition[];
  report: EcosystemReport;
}

// ─── Invasive species scenario ─────────────────────────────────────────────────

export type InvasionEffect =
  | "predation"
  | "competition"
  | "habitat-alteration"
  | "disease"
  | "resource-pressure"
  | "none"
  | (string & {});

export interface NativeImpact {
  speciesId: string;
  commonName: string;
  effect: InvasionEffect;
  populationDelta: number;
  baselinePopulation?: number;
  reason?: string;
}

export interface InvasionPhase {
  label: string;
  tSeconds: number;
  invaderPop: number;
  nativeDeltas: Record<string, number>;
  mechanisms?: string[];
}

export type InvasiveMechanismKind =
  | "predacao"
  | "competicao-alimentar"
  | "competicao-espaco"
  | "engenharia-habitat"
  | "transmissao-doenca"
  | "hibridizacao"
  | "sobrepastejo"
  | "supressao-vegetal"
  | "alteracao-aquatica"
  | "cascata-trofica"
  | "deplecao-recursos";

export interface InvasiveImpactMechanism {
  kind: InvasiveMechanismKind;
  label: string;
  description: string;
  severity: "baixa" | "moderada" | "alta";
  targets: string[];
}

export interface AffectedResource {
  type: ResourceType;
  label: string;
  detail: string;
}

export interface InvasiveImpactVector {
  key: string;
  label: string;
  value: number;
  detail: string;
}

export interface InvaderConsequences {
  scenarioType: "documented-invasive" | "hypothetical-introduction";
  summary: string;
  causalChains: string[][];
  impactVectors: InvasiveImpactVector[];
}

export interface InvasiveScenarioResult {
  terrain: TerrainGrid;
  resolvedBiomes: string[];
  invader: SpeciesDefinition;
  invaderProfile: {
    displayName: string;
    scientificName: string;
    nativeBiomes: string[];
    survives: boolean;
    scenarioType?: InvaderConsequences["scenarioType"];
  };
  consequences?: InvaderConsequences;
  nativeImpacts: NativeImpact[];
  phases: InvasionPhase[];
  /** Named ecological mechanisms (empty when the invader cannot establish). */
  impactMechanisms: InvasiveImpactMechanism[];
  affectedResources: AffectedResource[];
  establishmentPlausibility: { score: number; label: PlausibilityBand };
  spreadPressure: "baixa" | "moderada" | "alta";
  plausibility: PlausibilityAssessment;
  explanation: ScientificExplanation & { text: string };
  uncertainties: string[];
  mvpAssumptions: string[];
  limitations: string[];
  simulationScope?: {
    simulated?: string[];
    explanationOnly?: string[];
  };
}

// ─── Ecology LLM result ───────────────────────────────────────────────────────

export interface EcologicalLlmResult {
  provider: string;
  model: string;
  answer: string | null;
  dryRun: boolean;
  queryType: string;
  contextPreview: string;
  factsUsed: number;
  ecosystemsFound: string[];
  warnings: string[];
  inspection: unknown;
  groundingCoverage: "sufficient" | "insufficient";
}

// ─── Terrain ──────────────────────────────────────────────────────────────────

export type CaveType =
  | "none"
  | "shallow-den"
  | "deep-cave"
  | "sinkhole"
  | "cliff-opening"
  | "river-cave"
  | "lava-tube"
  | "karst-system";

export type TerrainObjectType =
  | "rock"
  | "boulder"
  | "fallen-log"
  | "dead-tree"
  | "bush"
  | "nest"
  | "burrow"
  | "bones"
  | "mushroom"
  | "crystal"
  | "waterfall"
  | "cave-entrance"
  | "cliff-ledge";

export type AltitudeBand = "lowland" | "hill" | "mountain" | "cliff";

export interface CaveInfo {
  type: CaveType;
  depth: number;
  openness: number;
  humidity: number;
  darkness: number;
  connectedTo?: string[];
  systemId?: string;
  isEntrance?: boolean;
  role?: "entrance" | "chamber" | "tunnel";
}

export interface TerrainCell {
  x: number;
  y: number;
  elevation: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMmYear: number;
  salinityPsu: number;
  climateCode: string;
  biomeSuggestion: string;
  isWater: boolean;
  // Structural layer (optional — produced by the backend's enrichTerrain).
  slope?: number;
  rockiness?: number;
  altitudeBand?: AltitudeBand;
  waterFlow?: number;
  riverDistance?: number;
  cave?: CaveInfo;
  objects?: TerrainObjectType[];
}

export interface TerrainGrid {
  width: number;
  height: number;
  seed: number;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  cells: TerrainCell[][];
  simulationNote: string;
}

// ─── Scenario ─────────────────────────────────────────────────────────────────

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface ScenarioState {
  temperatureC: number;
  precipitationMmYear: number;
  humidityPct: number;
  biomeSuggestion: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
}

export interface ScenarioChange {
  parameter: string;
  before: number | string;
  after: number | string;
  delta: string;
}

export interface ScenarioResult {
  ecosystemSlug: string;
  baseline: ScenarioState;
  modified: ScenarioState;
  appliedChanges: ScenarioChange[];
  riskFlags: string[];
  connectivityImpact: string;
  disturbanceImpact: string | null;
  simulationNote: string;
}

// ─── Artificial environment ───────────────────────────────────────────────────

export type ComponentType = "biotic" | "abiotic" | "structural" | "management";
export type ConstraintCategory = "ecological" | "technical" | "governance";

export interface ArtificialEnvComponent {
  name: string;
  type: ComponentType;
  description: string;
  isCritical: boolean;
}

export interface ArtificialEnvConstraint {
  constraint: string;
  category: ConstraintCategory;
}

export interface ArtificialEnvResult {
  projectSlug: string;
  projectTitle: string;
  projectType: string;
  ecosystemKind: string;
  objective: string;
  targetEcosystemSlugs: string[];
  scale: string;
  designComponents: ArtificialEnvComponent[];
  constraints: ArtificialEnvConstraint[];
  monitoringRecommendations: string[];
  cautionNotes: string;
  simulationNote: string;
}

// ─── Succession ───────────────────────────────────────────────────────────────

export interface SuccessionStage {
  stage: number;
  label: string;
  characteristicFunctionalTypes: string[];
  exampleSpeciesNotes: string;
  estimatedDurationYearsMin: number;
  estimatedDurationYearsMax: number;
  dominantProcess: string;
  disturbanceVulnerability: "high" | "moderate" | "low";
}

export interface SuccessionResult {
  type: "primary" | "secondary";
  ecosystemReference: string | null;
  startingStage: number;
  stages: SuccessionStage[];
  estimatedYearsToClimax: number;
  isDisturbanceReset: boolean;
  simulationNote: string;
  warnings: string[];
}

// ─── Fauna ────────────────────────────────────────────────────────────────────

export type FaunaCategory =
  | "herbivore-small"
  | "herbivore-large"
  | "predator-medium"
  | "predator-large"
  | "bird"
  | "fish";

export type TrophicLevel = "producer" | "herbivore" | "mesopredator" | "apex";
export type FeedingStrategy = "herbivore" | "carnivore" | "omnivore";

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

export interface PredationProfile {
  attackRange?: number;
  damageRate?: number;
  huntRange?: number;
  hungerRate?: number;
  starvationThreshold?: number;
  satiationCooldownMs?: number;
  preyPreference?: Record<string, number>;
}

export interface SpeciesDefinition {
  id: string;
  commonName: string;
  scientificName: string;
  category: FaunaCategory;
  habitableBiomes: string[];
  diet: string[];
  preySpeciesIds: string[];
  trophicLevel: TrophicLevel;
  feedingStrategy: FeedingStrategy;
  mass: number;
  awarenessRange: number;
  predation?: PredationProfile;
  populationTarget: number;
  movementProfile: {
    maxSpeed: number;
    turnRate: number;
    fleeMultiplier: number;
  };
  flockProfile: {
    formsFlocks: boolean;
    flockRadius: number;
    separationDistance: number;
  };
  habitatProfile?: HabitatProfile;
  behaviorProfile?: BehaviorProfile;
  /** Coarse taxonomic group for reporting (mirror of backend SpeciesDefinition.taxonGroup). */
  taxonGroup?: TaxonGroup;
  nativeStatus?: NativeStatus | string;
  resourceBase?: string[];
  /** Basal resources this consumer depends on (mirror of backend SpeciesDefinition.resourceNeeds). */
  resourceNeeds?: ResourceType[];
  /** Heuristic curation confidence (0–1). */
  confidence?: number;
  renderHints?: {
    spriteAssetPath?: string | null;
    baseScale?: number;
    silhouetteStyle?: string | null;
  };
}

export interface FaunaResult {
  species: SpeciesDefinition[];
}

// ─── Request helpers (mirrors client.ts internals, reuses exported helpers) ───

async function ecologyRequest<T>(
  endpoint: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> {
  const response = await fetchWithTimeout(buildApiUrl(endpoint), {
    method: options.method ?? "GET",
    headers:
      options.body !== undefined
        ? buildApiHeaders({ "Content-Type": "application/json" })
        : buildApiHeaders(),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorPayload: ApiErrorResponse | null = null;
    try {
      errorPayload = (await response.json()) as ApiErrorResponse;
    } catch {
      // ignore
    }
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds =
      retryAfterHeader && /^\d+$/.test(retryAfterHeader)
        ? Number.parseInt(retryAfterHeader, 10)
        : null;
    throw new ApiClientError(
      response.status,
      errorPayload,
      retryAfterSeconds,
      errorPayload?.error?.message ?? `Request failed with status ${response.status}`
    );
  }

  return (await response.json()) as T;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const ecologyApi = {
  // LLM grounded query
  generate: (payload: {
    prompt: string;
    ecosystems?: string[];
    categories?: string[];
    maxFacts?: number;
    dryRun?: boolean;
    includeInspection?: boolean;
  }) =>
    ecologyRequest<ApiSingle<EcologicalLlmResult>>("/ecology/generate", {
      method: "POST",
      body: payload,
    }),

  inspect: (payload: {
    ecosystems?: string[];
    categories?: string[];
    maxFacts?: number;
  }) =>
    ecologyRequest<ApiSingle<unknown>>("/ecology/inspect", {
      method: "POST",
      body: payload,
    }),

  // Catalog
  listEcosystems: (params?: { medium?: string; kind?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.medium) qs.set("medium", params.medium);
    if (params?.kind) qs.set("kind", params.kind);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return ecologyRequest<ApiPaged<EcosystemRow>>(`/ecology/ecosystems${suffix}`);
  },

  getEcosystem: (slug: string) =>
    ecologyRequest<ApiSingle<EcosystemRow>>(`/ecology/ecosystems/${slug}`),

  listSpecies: (params?: { ecosystem?: string; trophicRole?: string; page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.ecosystem) qs.set("ecosystem", params.ecosystem);
    if (params?.trophicRole) qs.set("trophicRole", params.trophicRole);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return ecologyRequest<ApiPaged<SpeciesRow>>(`/ecology/species${suffix}`);
  },

  listAbioticFactors: () =>
    ecologyRequest<ApiSingle<AbioticFactorRow[]>>("/ecology/abiotic-factors"),

  listArtificialProjects: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return ecologyRequest<ApiPaged<ArtificialProjectRow>>(`/ecology/artificial-projects${suffix}`);
  },

  listModelingApproaches: () =>
    ecologyRequest<ApiSingle<ModelingApproachRow[]>>("/ecology/modeling-approaches"),

  getCoverage: () =>
    ecologyRequest<ApiSingle<DomainCoverageStats>>("/ecology/coverage"),

  // Simulations
  simulateTerrain: (payload: {
    width?: number;
    height?: number;
    seed?: number;
    baseTemperatureC?: number;
    basePrecipitationMm?: number;
    baseHumidityPct?: number;
    reliefStyle?: ReliefStyle;
    seaLevel?: number;
  }) =>
    ecologyRequest<ApiSingle<TerrainGrid>>("/ecology/simulate/terrain", {
      method: "POST",
      body: payload,
    }),

  simulateScenario: (payload: {
    ecosystemSlug: string;
    baseTemperatureC?: number;
    basePrecipitationMmYear?: number;
    deltaTemperatureC?: number;
    deltaPrecipitationPct?: number;
    disturbanceType?: string;
    disturbanceIntensity?: number;
    connectivityIndex?: number;
  }) =>
    ecologyRequest<ApiSingle<ScenarioResult>>("/ecology/simulate/scenario", {
      method: "POST",
      body: payload,
    }),

  simulateArtificial: (payload: {
    projectSlug: string;
    targetEcosystemSlug?: string;
    scale?: string;
  }) =>
    ecologyRequest<ApiSingle<ArtificialEnvResult>>("/ecology/simulate/artificial", {
      method: "POST",
      body: payload,
    }),

  simulateSuccession: (payload: {
    type?: string;
    startingStage?: number;
    disturbanceIntensity?: number;
    ecosystemSlug?: string;
  }) =>
    ecologyRequest<ApiSingle<SuccessionResult>>("/ecology/simulate/succession", {
      method: "POST",
      body: payload,
    }),

  fauna: (payload: { ecosystemSlug?: string; biomes?: string[]; grid?: TerrainGrid }) =>
    ecologyRequest<ApiSingle<FaunaResult>>("/ecology/fauna", {
      method: "POST",
      body: payload,
    }),

  promptTerrain: (payload: { prompt: string; width?: number; height?: number; seed?: number }) =>
    ecologyRequest<ApiSingle<TerrainPromptResult>>("/ecology/prompt-terrain", {
      method: "POST",
      body: payload,
    }),

  ecosystemReport: (payload: { prompt: string; width?: number; height?: number; seed?: number }) =>
    ecologyRequest<ApiSingle<EcosystemReportResult>>("/ecology/ecosystem-report", {
      method: "POST",
      body: payload,
    }),

  invasive: (payload: {
    speciesText: string;
    locationText: string;
    width?: number;
    height?: number;
    seed?: number;
  }) =>
    ecologyRequest<ApiSingle<InvasiveScenarioResult>>("/ecology/invasive", {
      method: "POST",
      body: payload,
    }),
};
