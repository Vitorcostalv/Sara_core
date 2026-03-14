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
  STT_PROVIDER: z.string().default("vosk"),
  STT_MODEL_PATH: z.string().default(path.resolve(repositoryRoot, "services", "stt", "models", "pt-br")),
  STT_AUDIO_MAX_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
  STT_FFMPEG_PATH: z.string().default("ffmpeg"),
  STT_PYTHON_PATH: z.string().default("python"),
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

const resolvedSttModelPath = path.isAbsolute(parsed.data.STT_MODEL_PATH)
  ? parsed.data.STT_MODEL_PATH
  : path.resolve(repositoryRoot, parsed.data.STT_MODEL_PATH);

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  host: parsed.data.BACKEND_HOST,
  port: parsed.data.BACKEND_PORT,
  corsOrigin: parsed.data.CORS_ORIGIN,
  sttProvider: parsed.data.STT_PROVIDER,
  sttModelPath: resolvedSttModelPath,
  sttAudioMaxBytes: parsed.data.STT_AUDIO_MAX_BYTES,
  sttFfmpegPath: parsed.data.STT_FFMPEG_PATH,
  sttPythonPath: parsed.data.STT_PYTHON_PATH,
  logLevel: parsed.data.LOG_LEVEL,
  databasePath: resolvedDatabasePath,
  repositoryRoot
};
