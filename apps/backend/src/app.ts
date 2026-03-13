import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./core/errors/error-handler";
import { notFoundHandler } from "./core/middleware/not-found";
import { apiRouter } from "./http/routes";
import { httpLogger } from "./logging/logger";

export function createApp() {
  const app = express();

  app.use(httpLogger);
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "Sara Core API",
      version: "0.1.0",
      docs: "/api/v1/health"
    });
  });

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
