import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error";

interface RateLimiterOptions {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

function getClientIdentifier(req: Request) {
  const forwardedFor = req.ip?.trim();
  if (forwardedFor && forwardedFor.length > 0) return forwardedFor;
  return req.socket.remoteAddress ?? "unknown-client";
}

export function createMemoryRateLimiter(options: RateLimiterOptions) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    cleanupExpiredEntries(now);

    const key = `${options.keyPrefix}:${getClientIdentifier(req)}`;
    const current = rateLimitStore.get(key);

    if (!current || current.resetAt <= now) {
      _res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
      _res.setHeader("X-RateLimit-Remaining", String(Math.max(options.maxRequests - 1, 0)));
      _res.setHeader("X-RateLimit-Reset", String(now + options.windowMs));
      rateLimitStore.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (current.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(Math.ceil((current.resetAt - now) / 1000), 1);
      _res.setHeader("Retry-After", String(retryAfterSeconds));
      _res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
      _res.setHeader("X-RateLimit-Remaining", "0");
      _res.setHeader("X-RateLimit-Reset", String(current.resetAt));
      _res.setHeader("Cache-Control", "no-store");
      next(
        new AppError(
          "RATE_LIMITED",
          429,
          "Too many requests for this endpoint. Retry after the current rate-limit window."
        )
      );
      return;
    }

    current.count += 1;
    _res.setHeader("X-RateLimit-Limit", String(options.maxRequests));
    _res.setHeader("X-RateLimit-Remaining", String(Math.max(options.maxRequests - current.count, 0)));
    _res.setHeader("X-RateLimit-Reset", String(current.resetAt));
    rateLimitStore.set(key, current);
    next();
  };
}

export function resetMemoryRateLimitStore() {
  rateLimitStore.clear();
}
