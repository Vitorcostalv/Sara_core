import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./core/errors/error-handler";
import { notFoundHandler } from "./core/middleware/not-found";
import { requireApiKeyAuth } from "./core/middleware/auth";
import { applySecurityHeaders } from "./core/middleware/security-headers";
import { apiRouter } from "./http/routes";
import { httpLogger, logger } from "./logging/logger";

function normalizeRequestOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function shouldBypassApiKeyAuth(pathname: string) {
  return pathname === "/health" || pathname.startsWith("/health/");
}

export function createApp() {
  const app = express();
  const allowedCorsOrigins = new Set(env.corsOrigins);

  logger.info({ corsOrigins: env.corsOrigins }, "CORS origins loaded");
  logger.info(
    {
      authMode: env.authMode,
      databaseSslMode: env.databaseSslMode,
      trustProxy: env.trustProxy
    },
    "Operational security configuration loaded"
  );
  if (env.authMode === "disabled") {
    logger.warn("API authentication is disabled for this runtime");
  }

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);
  app.use(httpLogger);
  app.use(applySecurityHeaders);
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
  app.use(express.json({ limit: env.apiJsonMaxBytes }));

  app.get("/", (_req, res) => {
    res.status(200).json({
      name: "Sara Core API",
      version: "0.1.0",
      docs: "/api/v1/health"
    });
  });

  app.use("/api/v1", (req, res, next) => {
    if (shouldBypassApiKeyAuth(req.path)) {
      next();
      return;
    }

    requireApiKeyAuth(req, res, next);
  }, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
