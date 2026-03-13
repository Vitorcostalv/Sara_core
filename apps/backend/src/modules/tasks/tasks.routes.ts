import { Router } from "express";
import { validateBody } from "../../core/middleware/validate";
import { tasksController } from "./tasks.controller";
import { createTaskSchema } from "./tasks.schemas";

export const tasksRoutes = Router();

tasksRoutes.get("/", tasksController.list.bind(tasksController));
tasksRoutes.post("/", validateBody(createTaskSchema), tasksController.create.bind(tasksController));
