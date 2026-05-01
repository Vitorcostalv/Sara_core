import pino from "pino";
import pinoHttp from "pino-http";
import { env } from "../config/env";

export const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.x-sara-api-key",
      "req.headers.cookie",
      "res.headers['set-cookie']",
      "config.apiKey",
      "apiKey"
    ],
    remove: true
  },
  transport:
    env.nodeEnv === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" }
        }
      : undefined
});

export const httpLogger = pinoHttp({ logger });
