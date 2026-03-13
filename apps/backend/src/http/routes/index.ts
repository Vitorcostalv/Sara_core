import { Router } from "express";
import { healthRoutes } from "../../modules/health/health.routes";
import { tasksRoutes } from "../../modules/tasks/tasks.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/tasks", tasksRoutes);
