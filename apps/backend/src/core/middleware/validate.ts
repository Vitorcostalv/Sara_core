import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    req.body = parsed.data;
    next();
  };
}

export function validateQuery<TSchema extends ZodTypeAny>(schema: TSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    req.query = parsed.data;
    next();
  };
}

export function validateParams<TSchema extends ZodTypeAny>(schema: TSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);

    if (!parsed.success) {
      next(parsed.error);
      return;
    }

    req.params = parsed.data;
    next();
  };
}
