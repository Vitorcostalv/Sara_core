import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { env } from "../../config/env";
import { AppError } from "./app-error";
import { logger } from "../../logging/logger";

interface HttpParserError {
  status?: number;
  statusCode?: number;
  type?: string;
}

function isHttpParserError(error: unknown): error is HttpParserError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as HttpParserError;
  return candidate.type === "entity.too.large" || candidate.type === "entity.parse.failed";
}

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

  if (isHttpParserError(error)) {
    const payloadTooLarge = error.type === "entity.too.large";
    const statusCode = payloadTooLarge ? 413 : 400;
    const code = payloadTooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON";
    const message = payloadTooLarge
      ? "Request body exceeds the configured JSON size limit"
      : "Request body contains invalid JSON";
    logger.warn({ code, statusCode, path: req.path }, message);
    res.status(statusCode).json({ error: { code, message } });
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
