import { z } from "zod";

export const taskStatusSchema = z.enum(["pending", "in_progress", "done", "archived"]);

export const createTaskSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: z.coerce.number().int().min(1).max(5).default(3),
  dueAt: z.string().datetime().nullable().optional()
});

export const listTasksQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
