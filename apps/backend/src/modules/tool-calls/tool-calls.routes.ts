import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { toolCallsController } from "./tool-calls.controller";
import {
  createToolCallSchema,
  listToolCallsQuerySchema,
  toolCallIdParamSchema,
  updateToolCallStatusSchema,
} from "./tool-calls.schemas";

export const toolCallsRoutes = Router();

toolCallsRoutes.get("/", validateQuery(listToolCallsQuerySchema), asyncHandler(toolCallsController.list.bind(toolCallsController)));
toolCallsRoutes.post("/", validateBody(createToolCallSchema), asyncHandler(toolCallsController.create.bind(toolCallsController)));
toolCallsRoutes.get("/:id", validateParams(toolCallIdParamSchema), asyncHandler(toolCallsController.getById.bind(toolCallsController)));
toolCallsRoutes.patch(
  "/:id/status",
  validateParams(toolCallIdParamSchema),
  validateBody(updateToolCallStatusSchema),
  asyncHandler(toolCallsController.updateStatus.bind(toolCallsController))
);
