import { z } from "zod";

export const toolCallStatusSchema = z.enum(["running", "success", "error"]);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const toolCallIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createToolCallSchema = z.object({
  conversationTurnId: z.string().uuid(),
  toolName: z.string().min(1).max(120),
  inputPayload: z.unknown(),
  outputPayload: z.unknown().nullable().optional(),
  status: toolCallStatusSchema.default("running"),
  durationMs: z.coerce.number().int().min(0).nullable().optional()
});

export const updateToolCallStatusSchema = z.object({
  status: toolCallStatusSchema,
  outputPayload: z.unknown().nullable().optional(),
  durationMs: z.coerce.number().int().min(0).nullable().optional()
});

export const listToolCallsQuerySchema = paginationSchema.extend({
  conversationTurnId: z.string().uuid().optional(),
  status: toolCallStatusSchema.optional()
});

export type ToolCallIdParam = z.infer<typeof toolCallIdParamSchema>;
export type CreateToolCallInput = z.infer<typeof createToolCallSchema>;
export type UpdateToolCallStatusInput = z.infer<typeof updateToolCallStatusSchema>;
export type ListToolCallsQuery = z.infer<typeof listToolCallsQuerySchema>;
