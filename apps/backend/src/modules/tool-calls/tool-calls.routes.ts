import { Router } from "express";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { toolCallsController } from "./tool-calls.controller";
import {
  createToolCallSchema,
  listToolCallsQuerySchema,
  toolCallIdParamSchema,
  updateToolCallStatusSchema
} from "./tool-calls.schemas";

export const toolCallsRoutes = Router();

toolCallsRoutes.get("/", validateQuery(listToolCallsQuerySchema), toolCallsController.list.bind(toolCallsController));
toolCallsRoutes.post("/", validateBody(createToolCallSchema), toolCallsController.create.bind(toolCallsController));
toolCallsRoutes.get("/:id", validateParams(toolCallIdParamSchema), toolCallsController.getById.bind(toolCallsController));
toolCallsRoutes.patch(
  "/:id/status",
  validateParams(toolCallIdParamSchema),
  validateBody(updateToolCallStatusSchema),
  toolCallsController.updateStatus.bind(toolCallsController)
);
