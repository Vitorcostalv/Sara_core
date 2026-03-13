import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

const repositoryRoot = path.resolve(__dirname, "../../../..");

config({ path: path.resolve(repositoryRoot, ".env") });

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_HOST: z.string().default("0.0.0.0"),
  BACKEND_PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().default("http://localhost:5180"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  DATABASE_PATH: z.string().default(path.resolve(repositoryRoot, "database", "sara_core.db"))
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const resolvedDatabasePath = path.isAbsolute(parsed.data.DATABASE_PATH)
  ? parsed.data.DATABASE_PATH
  : path.resolve(repositoryRoot, parsed.data.DATABASE_PATH);

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  host: parsed.data.BACKEND_HOST,
  port: parsed.data.BACKEND_PORT,
  corsOrigin: parsed.data.CORS_ORIGIN,
  logLevel: parsed.data.LOG_LEVEL,
  databasePath: resolvedDatabasePath,
  repositoryRoot
};
