import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { env } from "../../config/env";
import { createMemoryRateLimiter } from "../../core/middleware/rate-limit";
import { validateBody } from "../../core/middleware/validate";
import { llmController } from "./llm.controller";
import { generateLlmSchema } from "./llm.schemas";

export const llmRoutes = Router();
const llmRateLimiter = createMemoryRateLimiter({
  keyPrefix: "llm-generate",
  windowMs: env.llmRateLimitWindowMs,
  maxRequests: env.llmRateLimitMax
});

llmRoutes.post(
  "/generate",
  llmRateLimiter,
  validateBody(generateLlmSchema),
  asyncHandler(llmController.generate.bind(llmController))
);
