import { z } from "zod";

export const conversationRoleSchema = z.enum(["user", "assistant", "system"]);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const conversationTurnIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createConversationTurnSchema = z.object({
  userId: z.string().min(1).default("local-user"),
  role: conversationRoleSchema,
  content: z.string().min(1).max(8000),
  source: z.string().min(1).max(120).default("chat")
});

export const listConversationTurnsQuerySchema = paginationSchema.extend({
  userId: z.string().min(1).default("local-user"),
  role: conversationRoleSchema.optional(),
  source: z.string().min(1).max(120).optional()
});

export type ConversationTurnIdParam = z.infer<typeof conversationTurnIdParamSchema>;
export type CreateConversationTurnInput = z.infer<typeof createConversationTurnSchema>;
export type ListConversationTurnsQuery = z.infer<typeof listConversationTurnsQuerySchema>;
