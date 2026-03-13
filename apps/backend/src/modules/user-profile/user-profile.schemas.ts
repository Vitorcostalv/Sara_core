import { z } from "zod";

export const birthDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const updateUserProfileSchema = z
  .object({
    displayName: z.string().min(1).max(200).optional(),
    preferredName: z.string().min(1).max(200).nullable().optional(),
    fullName: z.string().min(1).max(200).nullable().optional(),
    email: z.string().email().max(255).nullable().optional(),
    locale: z.string().min(2).max(16).optional(),
    timezone: z.string().min(3).max(64).optional(),
    birthDate: birthDateSchema.nullable().optional()
  })
  .refine((payload) => Object.values(payload).some((value) => value !== undefined), {
    message: "At least one field must be provided for update"
  });

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
