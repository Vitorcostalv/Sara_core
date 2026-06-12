import path from "node:path";
import { config } from "dotenv";
import { z } from "zod";

const repositoryRoot = path.resolve(__dirname, "../../../..");

config({ path: path.resolve(repositoryRoot, ".env") });

function parseOptionalBoolean(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return value;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;

  return value;
}

function parseTrustProxy(value: unknown) {
  if (value === undefined || value === null || value === "") return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (normalized === "true") return true;
  if (normalized === "false") return false;
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10);

  return trimmed;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_HOST: z.string().default("0.0.0.0"),
  BACKEND_PORT: z.coerce.number().int().positive().default(3333),
  CORS_ORIGIN: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  LLM_PROVIDER: z.enum(["disabled", "gemini", "grok"]).default("disabled"),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default(""),
  LLM_BASE_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(45_000),
  API_JSON_MAX_BYTES: z.coerce.number().int().positive().default(256 * 1024),
  AUTH_MODE: z.enum(["disabled", "api-key"]).optional(),
  API_AUTH_KEY: z.string().optional(),
  TRUST_PROXY: z.preprocess(parseTrustProxy, z.union([z.boolean(), z.number().int().nonnegative(), z.string()]).default(false)),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  DATABASE_URL: z.string().optional(),
  DIRECT_DATABASE_URL: z.string().optional(),
  DATABASE_SSL: z.preprocess(parseOptionalBoolean, z.boolean().optional()),
  DATABASE_SSL_MODE: z.enum(["disable", "require", "verify-full"]).optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

// Database
const databaseUrl = parsed.data.DATABASE_URL ?? null;
const directDatabaseUrl = parsed.data.DIRECT_DATABASE_URL ?? null;
const databaseSslMode =
  parsed.data.DATABASE_SSL_MODE ?? ((parsed.data.DATABASE_SSL ?? true) ? "require" : "disable");
const databaseSsl = databaseSslMode !== "disable";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Set it in your .env file.");
}

const authMode =
  parsed.data.AUTH_MODE ?? (parsed.data.NODE_ENV === "production" ? "api-key" : "disabled");
const apiAuthKey = parsed.data.API_AUTH_KEY?.trim() || null;

if (authMode === "api-key" && !apiAuthKey) {
  throw new Error("API_AUTH_KEY is required when AUTH_MODE=api-key.");
}

// CORS origins — aceita singular ou plural, normaliza e deduplica
const DEFAULT_CORS_ORIGINS = "http://localhost:5180,http://127.0.0.1:5180";

function normalizeCorsOrigin(origin: string): string {
  const trimmed = origin.trim();
  if (trimmed.length === 0) return "";
  try {
    return new URL(trimmed).origin;
  } catch {
    throw new Error(`Invalid CORS origin in environment: ${trimmed}`);
  }
}

const rawCorsOrigins =
  parsed.data.CORS_ORIGINS ?? parsed.data.CORS_ORIGIN ?? DEFAULT_CORS_ORIGINS;

const corsOrigins = Array.from(
  new Set(
    rawCorsOrigins
      .split(",")
      .map(normalizeCorsOrigin)
      .filter((origin) => origin.length > 0)
  )
);

if (corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS must contain at least one valid origin");
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  host: parsed.data.BACKEND_HOST,
  port: parsed.data.BACKEND_PORT,
  corsOrigins,
  apiJsonMaxBytes: parsed.data.API_JSON_MAX_BYTES,
  authMode,
  apiAuthKey,
  trustProxy: parsed.data.TRUST_PROXY,
  llmProvider: parsed.data.LLM_PROVIDER,
  llmApiKey: parsed.data.LLM_API_KEY?.trim() || null,
  llmModel: parsed.data.LLM_MODEL.trim(),
  llmBaseUrl: parsed.data.LLM_BASE_URL?.trim() || null,
  llmTimeoutMs: parsed.data.LLM_TIMEOUT_MS,
  logLevel: parsed.data.LOG_LEVEL,
  databaseUrl: databaseUrl as string,
  directDatabaseUrl,
  databaseSsl,
  databaseSslMode,
  repositoryRoot,
};
