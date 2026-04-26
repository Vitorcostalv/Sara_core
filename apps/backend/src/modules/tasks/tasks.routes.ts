import { Router } from "express";
import { asyncHandler } from "../../core/http/async-handler";
import { validateBody, validateParams, validateQuery } from "../../core/middleware/validate";
import { tasksController } from "./tasks.controller";
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamSchema,
  updateTaskSchema,
} from "./tasks.schemas";

export const tasksRoutes = Router();

tasksRoutes.get("/", validateQuery(listTasksQuerySchema), asyncHandler(tasksController.list.bind(tasksController)));
tasksRoutes.post("/", validateBody(createTaskSchema), asyncHandler(tasksController.create.bind(tasksController)));
tasksRoutes.get("/:id", validateParams(taskIdParamSchema), asyncHandler(tasksController.getById.bind(tasksController)));
tasksRoutes.patch(
  "/:id",
  validateParams(taskIdParamSchema),
  validateBody(updateTaskSchema),
  asyncHandler(tasksController.update.bind(tasksController))
);
tasksRoutes.patch(
  "/:id/complete",
  validateParams(taskIdParamSchema),
  asyncHandler(tasksController.complete.bind(tasksController))
);
tasksRoutes.delete("/:id", validateParams(taskIdParamSchema), asyncHandler(tasksController.remove.bind(tasksController)));
