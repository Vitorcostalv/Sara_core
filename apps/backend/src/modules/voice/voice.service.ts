import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/app-error";
import { logger } from "../../logging/logger";
import { convertAudioToPcm } from "./stt/audio-converter";
import type { SttProvider } from "./stt/stt.provider";
import { VoskSttProvider } from "./stt/vosk.provider";
import { isSupportedAudioMimeType, type VoiceInteractionResponse } from "./voice.schemas";

const voiceLogger = logger.child({ module: "voice-service" });

const audioExtensionByMimeType: Record<string, string> = {
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac"
};

export interface ProcessVoiceInteractionInput {
  audioBuffer: Buffer;
  mimeType: string;
  language?: string;
}

export class VoiceService {
  constructor(private readonly sttProvider: SttProvider) {}

  processVoiceInteraction(input: ProcessVoiceInteractionInput): VoiceInteractionResponse {
    if (input.audioBuffer.length === 0) {
      throw new AppError("VOICE_AUDIO_EMPTY", 400, "Uploaded audio file is empty");
    }

    if (input.audioBuffer.length > env.sttAudioMaxBytes) {
      throw new AppError(
        "VOICE_AUDIO_TOO_LARGE",
        413,
        `Audio file exceeds maximum allowed size (${env.sttAudioMaxBytes} bytes)`
      );
    }

    if (!isSupportedAudioMimeType(input.mimeType)) {
      throw new AppError("VOICE_AUDIO_UNSUPPORTED_TYPE", 415, `Unsupported audio mime type: ${input.mimeType}`);
    }

    const normalizedMimeType = input.mimeType.split(";")[0]?.trim() ?? input.mimeType;
    const extension = audioExtensionByMimeType[normalizedMimeType] ?? ".audio";
    const requestId = randomUUID();
    const workDirectory = path.resolve(env.repositoryRoot, ".tmp", "voice");
    const sourceAudioPath = path.resolve(workDirectory, `${requestId}-source${extension}`);
    const pcmAudioPath = path.resolve(workDirectory, `${requestId}-mono16k.pcm`);
    const sampleRate = 16000;

    mkdirSync(workDirectory, { recursive: true });
    writeFileSync(sourceAudioPath, input.audioBuffer);

    try {
      convertAudioToPcm({
        ffmpegPath: env.sttFfmpegPath,
        inputPath: sourceAudioPath,
        outputPath: pcmAudioPath,
        sampleRate
      });

      const transcription = this.sttProvider.transcribe({
        audioPcmPath: pcmAudioPath,
        sampleRate,
        language: input.language
      });

      const normalizedTranscription = transcription.trim();
      const assistantText =
        normalizedTranscription.length > 0
          ? `Entendi: ${normalizedTranscription}`
          : "Nao consegui entender o audio com clareza.";

      return {
        transcription: normalizedTranscription,
        assistantText,
        audioReplyUrl: null,
        wakeWordDetected: null
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("VOICE_PROCESSING_FAILED", 500, "Unexpected voice processing failure", {
        message: error instanceof Error ? error.message : "unknown processing error"
      });
    } finally {
      rmSync(sourceAudioPath, { force: true });
      rmSync(pcmAudioPath, { force: true });
      voiceLogger.debug({ requestId }, "Voice processing temporary files cleaned");
    }
  }
}

function createSttProvider(): SttProvider {
  switch (env.sttProvider) {
    case "vosk":
      return new VoskSttProvider(env.sttModelPath);
    default:
      throw new AppError("VOICE_STT_PROVIDER_INVALID", 500, `Unsupported STT provider: ${env.sttProvider}`);
  }
}

export const voiceService = new VoiceService(createSttProvider());
