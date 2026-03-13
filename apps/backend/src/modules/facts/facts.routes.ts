import { Router } from "express";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { factsController } from "./facts.controller";
import {
  createFactSchema,
  factIdParamSchema,
  listFactsQuerySchema,
  markFactImportantSchema,
  updateFactSchema
} from "./facts.schemas";

export const factsRoutes = Router();

factsRoutes.get("/", validateQuery(listFactsQuerySchema), factsController.list.bind(factsController));
factsRoutes.post("/", validateBody(createFactSchema), factsController.create.bind(factsController));
factsRoutes.get("/:id", validateParams(factIdParamSchema), factsController.getById.bind(factsController));
factsRoutes.patch(
  "/:id",
  validateParams(factIdParamSchema),
  validateBody(updateFactSchema),
  factsController.update.bind(factsController)
);
factsRoutes.patch(
  "/:id/important",
  validateParams(factIdParamSchema),
  validateBody(markFactImportantSchema),
  factsController.markImportant.bind(factsController)
);
factsRoutes.delete("/:id", validateParams(factIdParamSchema), factsController.remove.bind(factsController));
