import type { Request, Response } from "express";
import { HealthService } from "./health.service";

const healthService = new HealthService();

export class HealthController {
  getHealth(_req: Request, res: Response): void {
    res.status(200).json(healthService.getStatus());
  }
}

export const healthController = new HealthController();
