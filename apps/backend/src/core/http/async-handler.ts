import type { Request, Response, RequestHandler } from "express";

type AsyncRouteHandler = (req: Request, res: Response) => Promise<void>;

export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    fn(req, res).catch(next);
  };
}
