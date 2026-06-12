import { Router } from "express";
import { ecologyRoutes } from "../../modules/ecology/ecology.routes";
import { healthRoutes } from "../../modules/health/health.routes";

export const apiRouter = Router();

apiRouter.use("/health", healthRoutes);
apiRouter.use("/ecology", ecologyRoutes);
