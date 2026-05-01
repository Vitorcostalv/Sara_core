import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../../config/env";
import { AppError } from "./app-error";
import { logger } from "../../logging/logger";

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error(
        { code: error.code, statusCode: error.statusCode, path: req.path, details: error.details ?? null },
        error.message
      );
    } else if (error.statusCode >= 400) {
      logger.warn(
        { code: error.code, statusCode: error.statusCode, path: req.path },
        error.message
      );
    }

    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details:
          error.statusCode >= 500 && env.nodeEnv !== "development"
            ? null
            : error.details ?? null
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    logger.warn(
      { path: req.path, issueCount: error.issues.length },
      "Request validation failed"
    );
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.flatten()
      }
    });
    return;
  }

  logger.error({ err: error, path: req.path }, "Unhandled exception");

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred"
    }
  });
}
