import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env";

export const logger = pino({
  level: env.logLevel,
  transport:
    env.nodeEnv === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" }
        }
      : undefined
});

export const httpLogger = pinoHttp({ logger });
