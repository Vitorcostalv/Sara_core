import { Router } from "express";
import { healthController } from "./health.controller";
import { env } from "../../config/env";
import { RenderKeepAlive } from "./render-keep-alive";

export const healthRoutes = Router();
const renderKeepAlive = new RenderKeepAlive(() => ({ enabled: env.renderLlmEnabled, baseUrl: env.renderLlmBaseUrl }));

// Liveness only: keep-alive traffic must not wake/query the database.
healthRoutes.get("/ping", async (_req, res) => {
  await renderKeepAlive.ping();
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ message: "oi", httpStatus: 200 });
});

healthRoutes.get("/", healthController.getHealth.bind(healthController));
