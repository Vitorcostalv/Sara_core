import { z } from "zod";

export const llmProviderSchema = z.enum(["disabled", "gemini", "grok"]);
const ecosystemSlugSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const generateLlmSchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  userId: z.string().trim().min(1).default("local-user"),
  ecosystems: z.array(ecosystemSlugSchema.max(80)).max(12).default([]),
  maxFacts: z.coerce.number().int().min(1).max(20).default(12),
  includeProfile: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});

export type LlmProviderName = z.infer<typeof llmProviderSchema>;
export type GenerateLlmInput = z.infer<typeof generateLlmSchema>;
