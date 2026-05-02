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
  baseTemperatureC: z.coerce.number().min(-30).max(40).default(18),
  basePrecipitationMm: z.coerce.number().min(0).max(8_000).default(1_200),
  baseHumidityPct: z.coerce.number().min(0).max(100).default(60),
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

// GET /ecology/inspect (dry-run context inspection)
export const ecologyInspectSchema = z.object({
  ecosystems: z.array(ecosystemSlugSchema).max(8).default([]),
  categories: z.array(z.enum(GROUNDING_CATEGORIES)).default([]),
  maxFacts: z.coerce.number().int().min(1).max(30).default(16),
});

export type EcologyGroundedQueryInput = z.infer<typeof ecologyGroundedQuerySchema>;
export type EcologyListEcosystemsInput = z.infer<typeof ecologyListEcosystemsSchema>;
export type EcologyListSpeciesInput = z.infer<typeof ecologyListSpeciesSchema>;
export type EcologyTerrainInput = z.infer<typeof ecologyTerrainSchema>;
export type EcologySuccessionInput = z.infer<typeof ecologySuccessionSchema>;
export type EcologyScenarioInput = z.infer<typeof ecologyScenarioSchema>;
export type EcologyArtificialEnvInput = z.infer<typeof ecologyArtificialEnvSchema>;
export type EcologyInspectInput = z.infer<typeof ecologyInspectSchema>;
