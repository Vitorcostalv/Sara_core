import { env } from "../../config/env";

export class HealthService {
  getStatus() {
    return {
      status: "ok",
      service: "sara-core-backend",
      environment: env.nodeEnv,
      timestamp: new Date().toISOString()
    };
  }
}
