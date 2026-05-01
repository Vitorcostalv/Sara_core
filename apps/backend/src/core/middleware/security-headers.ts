import type { NextFunction, Request, Response } from "express";

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "microphone=(), camera=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
}
