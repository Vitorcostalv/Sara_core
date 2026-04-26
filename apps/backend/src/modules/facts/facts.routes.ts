import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { factsController } from "./facts.controller";
import {
  createFactSchema,
  factIdParamSchema,
  listFactsQuerySchema,
  markFactImportantSchema,
  updateFactSchema,
} from "./facts.schemas";

export const factsRoutes = Router();

factsRoutes.get("/", validateQuery(listFactsQuerySchema), asyncHandler(factsController.list.bind(factsController)));
factsRoutes.post("/", validateBody(createFactSchema), asyncHandler(factsController.create.bind(factsController)));
factsRoutes.get("/:id", validateParams(factIdParamSchema), asyncHandler(factsController.getById.bind(factsController)));
factsRoutes.patch(
  "/:id",
  validateParams(factIdParamSchema),
  validateBody(updateFactSchema),
  asyncHandler(factsController.update.bind(factsController))
);
factsRoutes.patch(
  "/:id/important",
  validateParams(factIdParamSchema),
  validateBody(markFactImportantSchema),
  asyncHandler(factsController.markImportant.bind(factsController))
);
factsRoutes.delete("/:id", validateParams(factIdParamSchema), asyncHandler(factsController.remove.bind(factsController)));
