import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ConversationTurn, JsonValue, LlmGenerateResult, ToolCall } from "@sara/shared-types";
import { env } from "../../config/env";
import { AppError } from "../../core/errors/app-error";
import { logger } from "../../logging/logger";
import type { GenerateLlmInput } from "../llm/llm.schemas";
import { llmService } from "../llm/llm.service";
import { ConversationTurnsRepository } from "../conversation-turns/conversation-turns.repository";
import { ToolCallsRepository } from "../tool-calls/tool-calls.repository";
import { UserProfileRepository } from "../user-profile/user-profile.repository";
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

type SttProviderFactory = () => SttProvider;
type AudioConverter = typeof convertAudioToPcm;

interface ConversationTurnsWriter {
  create(input: {
    userId: string;
    role: "user" | "assistant" | "system";
    content: string;
    source: string;
  }): Promise<ConversationTurn>;
}

interface ToolCallsWriter {
  create(input: {
    conversationTurnId: string;
    toolName: string;
    inputPayload: JsonValue;
    outputPayload?: JsonValue | null;
    status: "running" | "success" | "error";
    durationMs?: number | null;
  }): Promise<ToolCall>;
  updateStatusById(
    id: string,
    input: { status: "running" | "success" | "error"; outputPayload?: JsonValue | null; durationMs?: number | null }
  ): Promise<ToolCall | null>;
}

interface UserProfileEnsurer {
  ensureLocalProfile(): Promise<{ id: string }>;
}

interface LlmGenerator {
  generate(input: GenerateLlmInput): Promise<LlmGenerateResult>;
}

interface VoiceServiceDependencies {
  audioConverter?: AudioConverter;
  conversationTurnsRepository?: ConversationTurnsWriter;
  toolCallsRepository?: ToolCallsWriter;
  userProfileRepository?: UserProfileEnsurer;
  llmGenerator?: LlmGenerator;
}

const insufficientAudioMessage = "Nao consegui entender o audio com clareza.";
const userTurnSource = "voice-user";
const assistantTurnSource = "voice-assistant";
const llmToolName = "llm.generate";

export class VoiceService {
  private readonly audioConverter: AudioConverter;
  private readonly conversationTurnsRepository: ConversationTurnsWriter;
  private readonly toolCallsRepository: ToolCallsWriter;
  private readonly userProfileRepository: UserProfileEnsurer;
  private readonly llmGenerator: LlmGenerator;

  constructor(
    private readonly providerFactory: SttProviderFactory,
    dependencies: VoiceServiceDependencies = {}
  ) {
    this.audioConverter = dependencies.audioConverter ?? convertAudioToPcm;
    this.conversationTurnsRepository =
      dependencies.conversationTurnsRepository ?? new ConversationTurnsRepository();
    this.toolCallsRepository = dependencies.toolCallsRepository ?? new ToolCallsRepository();
    this.userProfileRepository = dependencies.userProfileRepository ?? new UserProfileRepository();
    this.llmGenerator = dependencies.llmGenerator ?? llmService;
  }

  async processVoiceInteraction(input: ProcessVoiceInteractionInput): Promise<VoiceInteractionResponse> {
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
      this.audioConverter({
        ffmpegPath: env.sttFfmpegPath,
        inputPath: sourceAudioPath,
        outputPath: pcmAudioPath,
        sampleRate
      });

      const sttProvider = this.providerFactory();
      const transcription = sttProvider.transcribe({
        audioPcmPath: pcmAudioPath,
        sampleRate,
        language: input.language
      });

      const normalizedTranscription = transcription.trim();
      const userProfile = await this.userProfileRepository.ensureLocalProfile();
      const llmResult =
        normalizedTranscription.length > 0
          ? await this.generateAssistantReply({
              prompt: normalizedTranscription,
              userId: userProfile.id,
            })
          : null;
      const assistantText = llmResult?.answer?.trim() || this.buildFallbackAssistantText(normalizedTranscription);

      await this.conversationTurnsRepository.create({
        userId: userProfile.id,
        role: "assistant",
        content: assistantText,
        source: assistantTurnSource,
      });

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

  private buildFallbackAssistantText(transcription: string) {
    return transcription.length > 0 ? `Entendi: ${transcription}` : insufficientAudioMessage;
  }

  private buildLlmInput(prompt: string, userId: string): GenerateLlmInput {
    return {
      prompt,
      userId,
      ecosystems: [],
      includeProfile: true,
      maxFacts: 12,
      dryRun: false,
    };
  }

  private buildToolCallSuccessPayload(result: LlmGenerateResult): JsonValue {
    return {
      provider: result.provider,
      model: result.model,
      answer: result.answer,
      dryRun: result.dryRun,
      grounding: {
        factCount: result.grounding.factCount,
        ecosystemsUsed: result.grounding.ecosystemsUsed,
        warnings: result.grounding.warnings,
      },
    };
  }

  private buildToolCallErrorPayload(error: unknown): JsonValue {
    if (error instanceof AppError) {
      return {
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof Error) {
      return {
        code: "VOICE_LLM_GENERATION_FAILED",
        message: error.message,
      };
    }

    return {
      code: "VOICE_LLM_GENERATION_FAILED",
      message: "Unknown LLM generation error",
    };
  }

  private async generateAssistantReply(input: {
    prompt: string;
    userId: string;
  }): Promise<LlmGenerateResult | null> {
    const userTurn = await this.conversationTurnsRepository.create({
      userId: input.userId,
      role: "user",
      content: input.prompt,
      source: userTurnSource,
    });

    const llmInput = this.buildLlmInput(input.prompt, input.userId);
    const toolCall = await this.toolCallsRepository.create({
      conversationTurnId: userTurn.id,
      toolName: llmToolName,
      inputPayload: {
        prompt: llmInput.prompt,
        userId: llmInput.userId,
        includeProfile: llmInput.includeProfile,
        maxFacts: llmInput.maxFacts,
        dryRun: llmInput.dryRun,
      },
      status: "running",
    });

    const startedAt = Date.now();

    try {
      const result = await this.llmGenerator.generate(llmInput);

      await this.toolCallsRepository.updateStatusById(toolCall.id, {
        status: "success",
        durationMs: Date.now() - startedAt,
        outputPayload: this.buildToolCallSuccessPayload(result),
      });

      return result;
    } catch (error) {
      await this.toolCallsRepository.updateStatusById(toolCall.id, {
        status: "error",
        durationMs: Date.now() - startedAt,
        outputPayload: this.buildToolCallErrorPayload(error),
      });

      voiceLogger.warn(
        {
          toolName: llmToolName,
          userId: input.userId,
          message: error instanceof Error ? error.message : "unknown llm error",
        },
        "Voice interaction fell back after LLM generation failure"
      );

      return null;
    }
  }
}

function createSttProvider(): SttProvider {
  const normalizedProvider = env.sttProvider.trim().toLowerCase();

  switch (normalizedProvider) {
    case "vosk":
      return new VoskSttProvider(env.sttModelPath);
    default:
      throw new AppError("VOICE_STT_PROVIDER_INVALID", 500, `Unsupported STT provider: ${env.sttProvider}`);
  }
}

export const voiceService = new VoiceService(createSttProvider);
