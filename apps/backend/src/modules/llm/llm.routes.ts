import { Router } from "express";
import { validateBody } from "../../core/middleware/validate";
import { llmController } from "./llm.controller";
import { generateLlmSchema } from "./llm.schemas";

export const llmRoutes = Router();

llmRoutes.post("/generate", validateBody(generateLlmSchema), llmController.generate.bind(llmController));
