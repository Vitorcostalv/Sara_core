import { z } from "zod";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

const booleanQuerySchema = z.preprocess((value) => {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }

  return value;
}, z.boolean());

export const factIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createFactSchema = z.object({
  userId: z.string().min(1).default("local-user"),
  key: z.string().min(1).max(120),
  value: z.string().min(1).max(4000),
  category: z.string().min(1).max(100).default("general"),
  isImportant: z.boolean().default(false)
});

export const updateFactSchema = z
  .object({
    key: z.string().min(1).max(120).optional(),
    value: z.string().min(1).max(4000).optional(),
    category: z.string().min(1).max(100).optional(),
    isImportant: z.boolean().optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "At least one field must be provided for update"
  });

export const markFactImportantSchema = z.object({
  isImportant: z.boolean().default(true)
});

export const listFactsQuerySchema = paginationSchema.extend({
  userId: z.string().min(1).default("local-user"),
  category: z.string().min(1).max(100).optional(),
  isImportant: booleanQuerySchema.optional()
});

export type FactIdParam = z.infer<typeof factIdParamSchema>;
export type CreateFactInput = z.infer<typeof createFactSchema>;
export type UpdateFactInput = z.infer<typeof updateFactSchema>;
export type MarkFactImportantInput = z.infer<typeof markFactImportantSchema>;
export type ListFactsQuery = z.infer<typeof listFactsQuerySchema>;
