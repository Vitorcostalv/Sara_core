import { Router } from "express";
import { healthController } from "./health.controller";

export const healthRoutes = Router();

healthRoutes.get("/", healthController.getHealth.bind(healthController));
