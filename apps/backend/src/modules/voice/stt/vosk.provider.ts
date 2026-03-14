import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { env } from "../../../config/env";
import { AppError } from "../../../core/errors/app-error";
import { logger } from "../../../logging/logger";
import type { SttProvider, SttTranscriptionInput } from "./stt.provider";

interface VoskScriptOutput {
  text?: unknown;
}

const voskLogger = logger.child({ module: "stt-vosk-provider" });

function parseVoskScriptOutput(rawOutput: string): string {
  try {
    const parsed = JSON.parse(rawOutput) as VoskScriptOutput;
    return typeof parsed.text === "string" ? parsed.text.trim() : "";
  } catch {
    throw new AppError("VOICE_TRANSCRIPTION_FAILED", 500, "Invalid STT provider output");
  }
}

export class VoskSttProvider implements SttProvider {
  private readonly scriptPath = path.resolve(
    env.repositoryRoot,
    "services",
    "stt",
    "scripts",
    "vosk_transcribe.py"
  );

  constructor(
    private readonly modelPath: string = env.sttModelPath,
    private readonly pythonPath: string = env.sttPythonPath
  ) {}

  transcribe(input: SttTranscriptionInput): string {
    if (!existsSync(this.modelPath)) {
      throw new AppError(
        "VOICE_STT_MODEL_NOT_FOUND",
        500,
        `Vosk model path not found: ${this.modelPath}. Configure STT_MODEL_PATH.`
      );
    }

    if (!existsSync(this.scriptPath)) {
      throw new AppError("VOICE_STT_PROVIDER_UNAVAILABLE", 500, `Vosk script not found: ${this.scriptPath}`);
    }

    const scriptResult = spawnSync(
      this.pythonPath,
      [
        this.scriptPath,
        "--model",
        this.modelPath,
        "--audio-pcm",
        input.audioPcmPath,
        "--sample-rate",
        String(input.sampleRate),
        "--language",
        input.language ?? "pt-BR"
      ],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 5
      }
    );

    if (scriptResult.error) {
      const errorCode = (scriptResult.error as NodeJS.ErrnoException).code;

      if (errorCode === "ENOENT") {
        throw new AppError(
          "VOICE_STT_PROVIDER_UNAVAILABLE",
          500,
          `Python executable not found at "${this.pythonPath}". Configure STT_PYTHON_PATH.`
        );
      }

      throw new AppError("VOICE_TRANSCRIPTION_FAILED", 500, "Failed to execute Vosk transcription script", {
        message: scriptResult.error.message
      });
    }

    if (scriptResult.status !== 0) {
      throw new AppError("VOICE_TRANSCRIPTION_FAILED", 500, "Vosk transcription script failed", {
        stderr: scriptResult.stderr?.trim() || null
      });
    }

    const transcription = parseVoskScriptOutput(scriptResult.stdout);
    voskLogger.debug({ transcriptionLength: transcription.length }, "Audio transcribed with Vosk script");
    return transcription;
  }
}
