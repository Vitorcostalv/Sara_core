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
      httpStatus: 200,
      deployment: {
        commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.RENDER_GIT_COMMIT ?? null,
        id: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      },
      service: "sara-core-backend",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - processStartedAt) / 1000),
      capabilities: {
        forecastModel: "observational-log-trend-v1",
        predationModel: "food-web-v1",
        llmProvider: env.llmProvider,
        llmConfigured: env.llmCloudEnabled && env.llmProvider !== "disabled" && Boolean(env.llmApiKey),
        cloudLlmEnabled: env.llmCloudEnabled,
        llmRoles: {
          questions: env.llmCloudEnabled ? env.llmProvider : "suspended",
          predationExplanation: env.llmCloudEnabled ? env.llmProvider : "rules",
          ownModel: "sara-qwen-0.5b",
          ownModelRole: "biome-classifier",
          ownModelTimeoutMs: env.renderLlmTimeoutMs,
        },
        renderClassifierConfigured: env.renderLlmEnabled && Boolean(env.renderLlmBaseUrl && env.renderLlmApiKey),
      },
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
