import type { Response } from "express";
import { buildPaginationMeta, type PaginationInput } from "./pagination";

export function sendOk<TData>(res: Response, data: TData): void {
  res.status(200).json({ data });
}

export function sendCreated<TData>(res: Response, data: TData): void {
  res.status(201).json({ data });
}

export function sendPaginated<TData>(
  res: Response,
  data: TData[],
  pagination: PaginationInput,
  total: number
): void {
  res.status(200).json({
    data,
    meta: buildPaginationMeta(pagination, total)
  });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
