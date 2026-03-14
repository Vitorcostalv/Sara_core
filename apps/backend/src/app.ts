import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./core/errors/error-handler";
import { notFoundHandler } from "./core/middleware/not-found";
import { apiRouter } from "./http/routes";
import { httpLogger, logger } from "./logging/logger";

function normalizeRequestOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

export function createApp() {
  const app = express();
  const allowedCorsOrigins = new Set(env.corsOrigins);

  logger.info({ corsOrigins: env.corsOrigins }, "CORS origins loaded");

  app.use(httpLogger);
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin) {
          logger.debug("CORS request without Origin header allowed");
          callback(null, true);
          return;
        }

        const normalizedOrigin = normalizeRequestOrigin(origin);
        const isAllowed = normalizedOrigin !== null && allowedCorsOrigins.has(normalizedOrigin);

        if (!isAllowed) {
          logger.warn(
            { origin, normalizedOrigin, corsOrigins: env.corsOrigins },
            "CORS origin blocked"
          );
        } else {
          logger.debug({ origin: normalizedOrigin }, "CORS origin allowed");
        }

        callback(null, isAllowed);
      }
    })
  );
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
