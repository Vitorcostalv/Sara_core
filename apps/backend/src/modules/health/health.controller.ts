import type { Request, Response } from "express";
import { HealthService } from "./health.service";

const healthService = new HealthService();

export class HealthController {
  async getHealth(_req: Request, res: Response): Promise<void> {
    res.status(200).json(await healthService.getStatus());
  }
}

export const healthController = new HealthController();
