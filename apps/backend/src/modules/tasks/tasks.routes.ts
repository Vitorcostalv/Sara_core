import { Router } from "express";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { tasksController } from "./tasks.controller";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema
} from "./tasks.schemas";

export const tasksRoutes = Router();

tasksRoutes.get("/", validateQuery(listTasksQuerySchema), tasksController.list.bind(tasksController));
tasksRoutes.post("/", validateBody(createTaskSchema), tasksController.create.bind(tasksController));
tasksRoutes.get("/:id", validateParams(taskIdParamSchema), tasksController.getById.bind(tasksController));
tasksRoutes.patch(
  "/:id",
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  tasksController.update.bind(tasksController)
);
tasksRoutes.patch(
  "/:id/complete",
  validateParams(taskIdParamSchema),
  tasksController.complete.bind(tasksController)
);
tasksRoutes.delete("/:id", validateParams(taskIdParamSchema), tasksController.remove.bind(tasksController));
