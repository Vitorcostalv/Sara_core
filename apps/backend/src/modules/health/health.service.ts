import { env } from "../../config/env";
import { pool } from "../../database/postgres";

const processStartedAt = Date.now();

interface DatabaseHealth {
  ok: boolean;
  latencyMs?: number;
  poolTotal: number;
  poolIdle: number;
  poolWaiting: number;
  error?: string;
}

export class HealthService {
  async getStatus() {
    const database = await this.checkDatabase();

    return {
      status: database.ok ? "ok" : "degraded",
      service: "sara-core-backend",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
      database,
    };
  }

  private async checkDatabase(): Promise<DatabaseHealth> {
    const poolTotal = pool.totalCount;
    const poolIdle = pool.idleCount;
    const poolWaiting = pool.waitingCount;

    const startedAt = Date.now();
    try {
      await pool.query("SELECT 1");
      return { ok: true, latencyMs: Date.now() - startedAt, poolTotal, poolIdle, poolWaiting };
    } catch (error) {
      return {
        ok: false,
        poolTotal,
        poolIdle,
        poolWaiting,
        error: error instanceof Error ? error.message : "unknown database error",
      };
    }
  }
}
