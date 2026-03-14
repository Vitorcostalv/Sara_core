import { spawnSync } from "node:child_process";
import { AppError } from "../../../core/errors/app-error";

interface ConvertAudioToPcmInput {
  ffmpegPath: string;
  inputPath: string;
  outputPath: string;
  sampleRate: number;
}

export function convertAudioToPcm(input: ConvertAudioToPcmInput): void {
  const result = spawnSync(
    input.ffmpegPath,
    [
      "-y",
      "-i",
      input.inputPath,
      "-ac",
      "1",
      "-ar",
      String(input.sampleRate),
      "-f",
      "s16le",
      input.outputPath
    ],
    {
      encoding: "utf8"
    }
  );

  if (result.error) {
    const errorCode = (result.error as NodeJS.ErrnoException).code;

    if (errorCode === "ENOENT") {
      throw new AppError(
        "VOICE_FFMPEG_NOT_FOUND",
        500,
        `FFmpeg not found at path "${input.ffmpegPath}". Configure STT_FFMPEG_PATH.`
      );
    }

    throw new AppError("VOICE_AUDIO_CONVERSION_FAILED", 500, "Failed to execute FFmpeg conversion", {
      message: result.error.message
    });
  }

  if (result.status !== 0) {
    throw new AppError("VOICE_AUDIO_CONVERSION_FAILED", 422, "Failed to convert audio to PCM", {
      stderr: result.stderr?.trim() || null
    });
  }
}
