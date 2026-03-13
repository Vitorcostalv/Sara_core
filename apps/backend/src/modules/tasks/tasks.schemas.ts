import { z } from "zod";

export const taskStatusSchema = z.enum(["pending", "in_progress", "done", "archived"]);
export const taskPrioritySchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export const taskIdParamSchema = z.object({
  id: z.string().uuid()
});

export const createTaskSchema = z.object({
  userId: z.string().min(1).default("local-user"),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  priority: taskPrioritySchema.default(3),
  dueDate: z.string().datetime().nullable().optional()
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    dueDate: z.string().datetime().nullable().optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "At least one field must be provided for update"
  });

export const listTasksQuerySchema = paginationSchema.extend({
  userId: z.string().min(1).default("local-user"),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional()
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type TaskIdParam = z.infer<typeof taskIdParamSchema>;
