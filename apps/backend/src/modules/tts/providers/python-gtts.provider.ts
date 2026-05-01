import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { env } from "../../../config/env";
import { AppError } from "../../../core/errors/app-error";
import { logger } from "../../../logging/logger";
import type { TtsProvider, TtsSynthesisInput } from "../tts.provider";

const gttsLogger = logger.child({ module: "tts-gtts-provider" });

export class PythonGttsTtsProvider implements TtsProvider {
  readonly name = "python-gtts";

  private readonly scriptPath = path.resolve(
    env.repositoryRoot,
    "services",
    "tts",
    "scripts",
    "gtts_synthesize.py"
  );

  constructor(private readonly pythonPath: string = env.sttPythonPath) {}

  synthesize(input: TtsSynthesisInput): void {
    if (!existsSync(this.scriptPath)) {
      throw new AppError(
        "TTS_SCRIPT_NOT_FOUND",
        500,
        `gTTS script not found: ${this.scriptPath}`
      );
    }

    gttsLogger.debug(
      { language: input.language, textLength: input.text.length },
      "Starting gTTS synthesis"
    );

    const startedAt = Date.now();
    const result = spawnSync(
      this.pythonPath,
      [
        this.scriptPath,
        "--text", input.text,
        "--output", input.outputPath,
        "--language", input.language,
      ],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 512,
      }
    );
    const durationMs = Date.now() - startedAt;

    if (result.error) {
      const errorCode = (result.error as NodeJS.ErrnoException).code;

      if (errorCode === "ENOENT") {
        throw new AppError(
          "TTS_PYTHON_NOT_FOUND",
          500,
          `Python executable not found at "${this.pythonPath}". Configure STT_PYTHON_PATH.`
        );
      }

      throw new AppError("TTS_SYNTHESIS_FAILED", 500, "Failed to execute gTTS script", {
        message: result.error.message,
      });
    }

    if (result.status !== 0) {
      gttsLogger.warn(
        { durationMs, stderr: result.stderr?.trim() || null },
        "gTTS script exited with non-zero status"
      );
      throw new AppError("TTS_SYNTHESIS_FAILED", 500, "gTTS synthesis script failed", {
        stderr: result.stderr?.trim() || null,
      });
    }

    gttsLogger.debug(
      { durationMs, textLength: input.text.length, language: input.language },
      "gTTS synthesis complete"
    );
  }
}
