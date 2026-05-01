import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ConversationTurn, JsonValue, LlmGenerateResult, ToolCall } from "@sara/shared-types";
import { env } from "../../config/env";
import { type Queryable, withTransaction } from "../../database/postgres";
import { AppError } from "../../core/errors/app-error";
import { logger } from "../../logging/logger";
import type { GenerateLlmInput } from "../llm/llm.schemas";
import { llmService } from "../llm/llm.service";
import { ConversationTurnsRepository } from "../conversation-turns/conversation-turns.repository";
import { ToolCallsRepository } from "../tool-calls/tool-calls.repository";
import { UserProfileRepository } from "../user-profile/user-profile.repository";
import { ttsService } from "../tts/tts.service";
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

interface TtsSynthesizer {
  synthesize(text: string, requestId: string, language: string): string | null;
}

interface VoiceServiceDependencies {
  audioConverter?: AudioConverter;
  userProfileRepository?: UserProfileEnsurer;
  llmGenerator?: LlmGenerator;
  runInTransaction?: <T>(callback: (db: Queryable) => Promise<T>) => Promise<T>;
  createConversationTurnsRepository?: (db: Queryable) => ConversationTurnsWriter;
  createToolCallsRepository?: (db: Queryable) => ToolCallsWriter;
  ttsService?: TtsSynthesizer;
}

const insufficientAudioMessage = "Nao consegui entender o audio com clareza.";
const userTurnSource = "voice-user";
const assistantTurnSource = "voice-assistant";
const llmToolName = "llm.generate";

export class VoiceService {
  private readonly audioConverter: AudioConverter;
  private readonly userProfileRepository: UserProfileEnsurer;
  private readonly llmGenerator: LlmGenerator;
  private readonly runInTransaction: <T>(callback: (db: Queryable) => Promise<T>) => Promise<T>;
  private readonly createConversationTurnsRepository: (db: Queryable) => ConversationTurnsWriter;
  private readonly createToolCallsRepository: (db: Queryable) => ToolCallsWriter;
  private readonly ttsServiceInstance: TtsSynthesizer;

  constructor(
    private readonly providerFactory: SttProviderFactory,
    dependencies: VoiceServiceDependencies = {}
  ) {
    this.audioConverter = dependencies.audioConverter ?? convertAudioToPcm;
    this.userProfileRepository = dependencies.userProfileRepository ?? new UserProfileRepository();
    this.llmGenerator = dependencies.llmGenerator ?? llmService;
    this.runInTransaction = dependencies.runInTransaction ?? withTransaction;
    this.createConversationTurnsRepository =
      dependencies.createConversationTurnsRepository ?? ((db) => new ConversationTurnsRepository(db));
    this.createToolCallsRepository =
      dependencies.createToolCallsRepository ?? ((db) => new ToolCallsRepository(db));
    this.ttsServiceInstance = dependencies.ttsService ?? ttsService;
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
    const interactionStartedAt = Date.now();

    voiceLogger.info(
      {
        requestId,
        audioSizeBytes: input.audioBuffer.length,
        mimeType: normalizedMimeType,
        language: input.language ?? "default",
      },
      "Voice interaction started"
    );

    mkdirSync(workDirectory, { recursive: true });
    writeFileSync(sourceAudioPath, input.audioBuffer);

    try {
      const conversionStartedAt = Date.now();
      this.audioConverter({
        ffmpegPath: env.sttFfmpegPath,
        inputPath: sourceAudioPath,
        outputPath: pcmAudioPath,
        sampleRate
      });
      voiceLogger.debug(
        { requestId, conversionDurationMs: Date.now() - conversionStartedAt },
        "Voice audio conversion complete"
      );

      const sttStartedAt = Date.now();
      const sttProvider = this.providerFactory();
      const transcription = sttProvider.transcribe({
        audioPcmPath: pcmAudioPath,
        sampleRate,
        language: input.language
      });
      const normalizedTranscription = transcription.trim();
      const sttDurationMs = Date.now() - sttStartedAt;

      if (normalizedTranscription.length > 0) {
        voiceLogger.info(
          {
            requestId,
            sttDurationMs,
            transcriptionLength: normalizedTranscription.length,
            language: input.language ?? "default",
          },
          "Voice transcription succeeded"
        );
      } else {
        voiceLogger.warn(
          { requestId, sttDurationMs, language: input.language ?? "default" },
          "Voice transcription returned empty — audio may be silent or inaudible"
        );
      }

      const userProfile = await this.userProfileRepository.ensureLocalProfile();
      const llmResult =
        normalizedTranscription.length > 0
          ? await this.generateAssistantReply({
              prompt: normalizedTranscription,
              userId: userProfile.id,
              requestId,
            })
          : null;
      const assistantText = this.resolveAssistantText(normalizedTranscription, llmResult);

      const ttsStartedAt = Date.now();
      const audioReplyUrl = assistantText?.trim()
        ? this.ttsServiceInstance.synthesize(assistantText, requestId, input.language ?? "pt-BR")
        : null;

      if (audioReplyUrl) {
        voiceLogger.info(
          { requestId, durationMs: Date.now() - ttsStartedAt },
          "TTS synthesis succeeded"
        );
      } else {
        voiceLogger.debug(
          { requestId, durationMs: Date.now() - ttsStartedAt },
          "TTS skipped or unavailable — text-only response"
        );
      }

      const persistStartedAt = Date.now();
      await this.persistInteraction({
        userId: userProfile.id,
        transcription: normalizedTranscription,
        assistantText,
        llmResult
      });
      voiceLogger.debug(
        { requestId, userId: userProfile.id, persistDurationMs: Date.now() - persistStartedAt, hasLlmResult: llmResult !== null },
        "Voice interaction persisted"
      );

      voiceLogger.info(
        {
          requestId,
          totalDurationMs: Date.now() - interactionStartedAt,
          usedLlm: llmResult !== null,
          llmStatus: llmResult?.status ?? "skipped",
        },
        "Voice interaction complete"
      );

      return {
        requestId,
        transcription: normalizedTranscription,
        assistantText,
        audioReplyUrl: audioReplyUrl ?? null,
        wakeWordDetected: null
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      voiceLogger.error(
        {
          requestId,
          totalDurationMs: Date.now() - interactionStartedAt,
          err: error,
        },
        "Voice interaction failed with unexpected error"
      );

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

  private resolveAssistantText(transcription: string, llmResult: LlmGenerationOutcome | null) {
    if (llmResult?.result?.answer?.trim()) {
      return llmResult.result.answer.trim();
    }

    return this.buildFallbackAssistantText(transcription);
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
      responseLength: typeof result.answer === "string" ? result.answer.length : null,
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
    requestId: string;
  }): Promise<LlmGenerationOutcome | null> {
    const llmInput = this.buildLlmInput(input.prompt, input.userId);
    const startedAt = Date.now();

    try {
      const result = await this.llmGenerator.generate(llmInput);
      const durationMs = Date.now() - startedAt;

      voiceLogger.info(
        {
          requestId: input.requestId,
          provider: result.provider,
          model: result.model,
          durationMs,
          factCount: result.grounding.factCount,
          ecosystemsUsed: result.grounding.ecosystemsUsed,
          groundingWarnings: result.grounding.warnings,
          responseLength: typeof result.answer === "string" ? result.answer.length : 0,
        },
        "LLM generation succeeded for voice interaction"
      );

      return {
        input: llmInput,
        result,
        status: "success",
        durationMs,
        outputPayload: this.buildToolCallSuccessPayload(result)
      };
    } catch (error) {
      voiceLogger.warn(
        {
          requestId: input.requestId,
          toolName: llmToolName,
          userId: input.userId,
          durationMs: Date.now() - startedAt,
          err: error,
        },
        "Voice interaction fell back after LLM generation failure"
      );

      return {
        input: llmInput,
        result: null,
        status: "error",
        durationMs: Date.now() - startedAt,
        outputPayload: this.buildToolCallErrorPayload(error)
      };
    }
  }

  private buildToolCallInputPayload(input: GenerateLlmInput): JsonValue {
    return {
      prompt: input.prompt,
      userId: input.userId,
      ecosystems: input.ecosystems,
      includeProfile: input.includeProfile,
      maxFacts: input.maxFacts,
      dryRun: input.dryRun,
    };
  }

  private async persistInteraction(input: PersistVoiceInteractionInput) {
    try {
      await this.runInTransaction(async (db) => {
        const conversationTurnsRepository = this.createConversationTurnsRepository(db);
        const toolCallsRepository = this.createToolCallsRepository(db);

        let userTurnId: string | null = null;

        if (input.transcription.length > 0) {
          const userTurn = await conversationTurnsRepository.create({
            userId: input.userId,
            role: "user",
            content: input.transcription,
            source: userTurnSource,
          });

          userTurnId = userTurn.id;

          if (input.llmResult !== null) {
            await toolCallsRepository.create({
              conversationTurnId: userTurnId,
              toolName: llmToolName,
              inputPayload: this.buildToolCallInputPayload(input.llmResult.input),
              outputPayload: input.llmResult.outputPayload,
              status: input.llmResult.status,
              durationMs: input.llmResult.durationMs,
            });
          }
        }

        await conversationTurnsRepository.create({
          userId: input.userId,
          role: "assistant",
          content: input.assistantText,
          source: assistantTurnSource,
        });

        return userTurnId;
      });
    } catch (error) {
      throw new AppError("VOICE_PERSISTENCE_FAILED", 500, "Voice interaction could not be persisted safely.", {
        message: error instanceof Error ? error.message : "unknown persistence error"
      });
    }
  }
}

interface LlmGenerationOutcome {
  input: GenerateLlmInput;
  result: LlmGenerateResult | null;
  status: "success" | "error";
  durationMs: number;
  outputPayload: JsonValue;
}

interface PersistVoiceInteractionInput {
  userId: string;
  transcription: string;
  assistantText: string;
  llmResult: LlmGenerationOutcome | null;
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
