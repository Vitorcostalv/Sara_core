import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../config/env";
import { AppError } from "../errors/app-error";

const apiAuthHeaderName = "x-sara-api-key";

function readApiKeyHeader(req: Request) {
  const value = req.header(apiAuthHeaderName);
  return typeof value === "string" ? value.trim() : "";
}

function constantTimeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireApiKeyAuth(req: Request, _res: Response, next: NextFunction): void {
  if (env.authMode !== "api-key") {
    next();
    return;
  }

  const configuredKey = env.apiAuthKey ?? "";
  const providedKey = readApiKeyHeader(req);

  if (providedKey.length === 0 || !constantTimeEquals(providedKey, configuredKey)) {
    _res.setHeader("Cache-Control", "no-store");
    next(new AppError("AUTH_UNAUTHORIZED", 401, "A valid API key is required for this endpoint."));
    return;
  }

  next();
}
