import { z } from "zod";

export const GROUNDING_CATEGORIES = [
  "concept",
  "ecosystem",
  "formation-process",
  "abiotic-factor",
  "species",
  "artificial-project",
  "modeling-approach",
  "reference",
] as const;

export type GroundingCategory = (typeof GROUNDING_CATEGORIES)[number];

const ecosystemSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);

// POST /ecology/generate
export const ecologyGroundedQuerySchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  ecosystems: z.array(ecosystemSlugSchema).max(8).default([]),
  categories: z.array(z.enum(GROUNDING_CATEGORIES)).default([]),
  maxFacts: z.coerce.number().int().min(1).max(30).default(16),
  language: z.enum(["pt-BR", "en"]).default("pt-BR"),
  dryRun: z.boolean().default(false),
  includeInspection: z.boolean().default(false),
});

// GET /ecology/ecosystems
export const ecologyListEcosystemsSchema = z.object({
  medium: z
    .enum(["terrestrial", "freshwater", "marine", "brackish", "subterranean", "urban", "mixed"])
    .optional(),
  kind: z
    .enum(["natural", "restored", "artificial", "improved", "novel", "closed", "theoretical"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// GET /ecology/species
export const ecologyListSpeciesSchema = z.object({
  ecosystem: ecosystemSlugSchema.optional(),
  trophicRole: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// POST /ecology/simulate/terrain
export const ecologyTerrainSchema = z.object({
  width: z.coerce.number().int().min(4).max(64).default(16),
  height: z.coerce.number().int().min(4).max(64).default(16),
  seed: z.coerce.number().int().default(42),
  baseTemperatureC: z.coerce.number().min(-40).max(40).default(18),
  basePrecipitationMm: z.coerce.number().min(0).max(8_000).default(1_200),
  baseHumidityPct: z.coerce.number().min(0).max(100).default(60),
  reliefStyle: z.enum(["default", "ocean", "mountain", "polar"]).optional(),
  seaLevel: z.coerce.number().min(0.05).max(0.9).optional(),
});

// POST /ecology/simulate/succession
export const ecologySuccessionSchema = z.object({
  type: z.enum(["primary", "secondary"]).default("secondary"),
  startingStage: z.coerce.number().int().min(0).max(4).default(0),
  disturbanceIntensity: z.coerce.number().min(0).max(1).default(0.5),
  ecosystemSlug: ecosystemSlugSchema.optional(),
  includeSpecies: z.boolean().default(false),
});

// POST /ecology/simulate/scenario
export const ecologyScenarioSchema = z.object({
  ecosystemSlug: ecosystemSlugSchema,
  baseTemperatureC: z.coerce.number().min(-30).max(50).default(20),
  basePrecipitationMmYear: z.coerce.number().min(0).max(8_000).default(1_200),
  deltaTemperatureC: z.coerce.number().min(-10).max(10).default(0),
  deltaPrecipitationPct: z.coerce.number().min(-100).max(200).default(0),
  disturbanceType: z
    .enum(["none", "fire", "flood", "drought", "anthropic", "disease"])
    .default("none"),
  disturbanceIntensity: z.coerce.number().min(0).max(1).default(0),
  connectivityIndex: z.coerce.number().min(0).max(1).default(0.7),
});

// POST /ecology/simulate/artificial
export const ecologyArtificialEnvSchema = z.object({
  projectSlug: z.string().trim().toLowerCase().min(1).max(100),
  targetEcosystemSlug: ecosystemSlugSchema.optional(),
  scale: z.enum(["site", "watershed", "local", "landscape"]).default("site"),
});

// POST /ecology/prompt-terrain
export const ecologyPromptTerrainSchema = z.object({
  prompt: z.string().trim().min(1).max(2_000),
  width: z.coerce.number().int().min(4).max(64).default(48),
  height: z.coerce.number().int().min(4).max(64).default(36),
  seed: z.coerce.number().int().optional(),
});

// POST /ecology/ecosystem-report
export const ecologyEcosystemReportSchema = z.object({
  prompt: z.string().trim().min(1).max(2_000),
  width: z.coerce.number().int().min(4).max(64).default(48),
  height: z.coerce.number().int().min(4).max(64).default(36),
  seed: z.coerce.number().int().optional(),
});

// POST /ecology/invasive
export const ecologyInvasiveSchema = z.object({
  speciesText: z.string().trim().min(1).max(200),
  locationText: z.string().trim().min(1).max(200),
  width: z.coerce.number().int().min(4).max(64).default(48),
  height: z.coerce.number().int().min(4).max(64).default(36),
  seed: z.coerce.number().int().optional(),
});

// GET /ecology/inspect (dry-run context inspection)
export const ecologyInspectSchema = z.object({
  ecosystems: z.array(ecosystemSlugSchema).max(8).default([]),
  categories: z.array(z.enum(GROUNDING_CATEGORIES)).default([]),
  maxFacts: z.coerce.number().int().min(1).max(30).default(16),
});

// POST /ecology/fauna
const caveTypeSchema = z.enum([
  "none",
  "shallow-den",
  "deep-cave",
  "sinkhole",
  "cliff-opening",
  "river-cave",
  "lava-tube",
  "karst-system",
]);

const terrainObjectTypeSchema = z.enum([
  "rock",
  "boulder",
  "fallen-log",
  "dead-tree",
  "bush",
  "nest",
  "burrow",
  "bones",
  "mushroom",
  "crystal",
  "waterfall",
  "cave-entrance",
  "cliff-ledge",
]);

const terrainCellBodySchema = z.object({
  x: z.number(),
  y: z.number(),
  elevation: z.number(),
  temperatureC: z.number(),
  humidityPct: z.number(),
  precipitationMmYear: z.number(),
  salinityPsu: z.number(),
  climateCode: z.string(),
  biomeSuggestion: z.string(),
  isWater: z.boolean(),
  // Structural layer (optional — preserved on round-trip for micro-habitat spawn).
  slope: z.number().optional(),
  rockiness: z.number().optional(),
  altitudeBand: z.enum(["lowland", "hill", "mountain", "cliff"]).optional(),
  waterFlow: z.number().optional(),
  riverDistance: z.number().optional(),
  cave: z
    .object({
      type: caveTypeSchema,
      depth: z.number(),
      openness: z.number(),
      humidity: z.number(),
      darkness: z.number(),
      connectedTo: z.array(z.string()).optional(),
      systemId: z.string().optional(),
    })
    .optional(),
  objects: z.array(terrainObjectTypeSchema).optional(),
});

const faunaGridSchema = z.object({
  width: z.number().int().min(4).max(64),
  height: z.number().int().min(4).max(64),
  seed: z.number().int(),
  baseTemperatureC: z.number(),
  basePrecipitationMm: z.number(),
  cells: z.array(z.array(terrainCellBodySchema)),
  simulationNote: z.string(),
});

export const ecologyFaunaSchema = z
  .object({
    ecosystemSlug: ecosystemSlugSchema.optional(),
    biomes: z.array(z.string().trim().min(1)).max(64).optional(),
    grid: faunaGridSchema.optional(),
  })
  .refine((payload) => (payload.biomes?.length ?? 0) > 0 || payload.grid !== undefined, {
    message: "Either 'biomes' or 'grid' is required.",
    path: ["biomes"],
  });

export type EcologyGroundedQueryInput = z.infer<typeof ecologyGroundedQuerySchema>;
export type EcologyListEcosystemsInput = z.infer<typeof ecologyListEcosystemsSchema>;
export type EcologyListSpeciesInput = z.infer<typeof ecologyListSpeciesSchema>;
export type EcologyTerrainInput = z.infer<typeof ecologyTerrainSchema>;
export type EcologySuccessionInput = z.infer<typeof ecologySuccessionSchema>;
export type EcologyScenarioInput = z.infer<typeof ecologyScenarioSchema>;
export type EcologyArtificialEnvInput = z.infer<typeof ecologyArtificialEnvSchema>;
export type EcologyInspectInput = z.infer<typeof ecologyInspectSchema>;
export type EcologyPromptTerrainInput = z.infer<typeof ecologyPromptTerrainSchema>;
export type EcologyEcosystemReportInput = z.infer<typeof ecologyEcosystemReportSchema>;
export type EcologyInvasiveInput = z.infer<typeof ecologyInvasiveSchema>;
export type EcologyFaunaInput = z.infer<typeof ecologyFaunaSchema>;
