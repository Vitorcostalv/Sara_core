import assert from "node:assert/strict";
import test from "node:test";
import type { ConversationTurn, LlmGenerateResult, ToolCall } from "@sara/shared-types";
import { AppError } from "../../core/errors/app-error";
import { VoiceService } from "./voice.service";

function createToolCall(id: string, overrides: Partial<ToolCall> = {}): ToolCall {
  return {
    id,
    conversationTurnId: "turn-user",
    toolName: "llm.generate",
    inputPayload: {},
    outputPayload: null,
    status: "running",
    durationMs: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

test("VoiceService persists user and assistant turns and marks llm.generate as success", async () => {
  const turns: Array<{ role: string; content: string; source: string }> = [];
  const createdToolCalls: ToolCall[] = [];

  const service = new VoiceService(
    () => ({
      transcribe: () => "Quais ecossistemas existem hoje?",
    }),
    {
      audioConverter: () => undefined,
      userProfileRepository: {
        ensureLocalProfile: () => Promise.resolve({ id: "local-user" }),
      },
      runInTransaction: async (callback) => callback({ query: async () => { throw new Error("query should not be called in unit tests"); } } as never),
      createConversationTurnsRepository: () => ({
        create: (input) => {
          turns.push({ role: input.role, content: input.content, source: input.source });
          return Promise.resolve({
            id: input.role === "user" ? "turn-user" : "turn-assistant",
            userId: input.userId,
            role: input.role,
            content: input.content,
            source: input.source,
            createdAt: new Date().toISOString(),
          } as ConversationTurn);
        },
      }),
      createToolCallsRepository: () => ({
        create: (input) => {
          const toolCall = createToolCall("tool-1", {
            conversationTurnId: input.conversationTurnId,
            status: input.status,
            outputPayload: input.outputPayload ?? null,
            durationMs: input.durationMs ?? null,
          });
          createdToolCalls.push(toolCall);
          return Promise.resolve(toolCall);
        },
        updateStatusById: () => Promise.resolve(null),
      }),
      llmGenerator: {
        generate: () =>
          Promise.resolve({
            provider: "gemini",
            model: "gemini-2.5-flash",
            answer: "Hoje existem os ecossistemas sara-core, frontend e llm-grounding.",
            dryRun: false,
            contextPreview: "Grounded context",
            factsPreview: [],
            ecosystems: [],
            grounding: {
              userId: "local-user",
              profileIncluded: true,
              factCount: 4,
              ecosystemsUsed: ["sara-core", "frontend", "llm-grounding"],
              warnings: [],
            },
          } satisfies LlmGenerateResult),
      },
    }
  );

  const result = await service.processVoiceInteraction({
    audioBuffer: Buffer.from("audio"),
    mimeType: "audio/webm",
    language: "pt-BR",
  });

  assert.equal(result.transcription, "Quais ecossistemas existem hoje?");
  assert.equal(result.assistantText, "Hoje existem os ecossistemas sara-core, frontend e llm-grounding.");
  assert.deepEqual(
    turns.map((turn) => `${turn.role}:${turn.source}`),
    ["user:voice-user", "assistant:voice-assistant"]
  );
  assert.equal(createdToolCalls.length, 1);
  assert.equal(createdToolCalls[0]?.status, "success");
});

test("VoiceService falls back to the transcription echo and marks llm.generate as error when generation fails", async () => {
  const createdToolCalls: ToolCall[] = [];

  const service = new VoiceService(
    () => ({
      transcribe: () => "Transcricao offline disponivel",
    }),
    {
      audioConverter: () => undefined,
      userProfileRepository: {
        ensureLocalProfile: () => Promise.resolve({ id: "local-user" }),
      },
      runInTransaction: async (callback) => callback({ query: async () => { throw new Error("query should not be called in unit tests"); } } as never),
      createConversationTurnsRepository: () => ({
        create: (input) =>
          Promise.resolve({
            id: input.role === "user" ? "turn-user" : "turn-assistant",
            userId: input.userId,
            role: input.role,
            content: input.content,
            source: input.source,
            createdAt: new Date().toISOString(),
          } as ConversationTurn),
      }),
      createToolCallsRepository: () => ({
        create: (input) => {
          const toolCall = createToolCall("tool-1", {
            conversationTurnId: input.conversationTurnId,
            status: input.status,
            outputPayload: input.outputPayload ?? null,
            durationMs: input.durationMs ?? null,
          });
          createdToolCalls.push(toolCall);
          return Promise.resolve(toolCall);
        },
        updateStatusById: () => Promise.resolve(null),
      }),
      llmGenerator: {
        generate: () => Promise.reject(new AppError("LLM_PROVIDER_NOT_CONFIGURED", 503, "Provider disabled")),
      },
    }
  );

  const result = await service.processVoiceInteraction({
    audioBuffer: Buffer.from("audio"),
    mimeType: "audio/webm",
    language: "pt-BR",
  });

  assert.equal(result.assistantText, "Entendi: Transcricao offline disponivel");
  assert.equal(createdToolCalls.length, 1);
  assert.equal(createdToolCalls[0]?.status, "error");
  assert.deepEqual(createdToolCalls[0]?.outputPayload, {
    code: "LLM_PROVIDER_NOT_CONFIGURED",
    message: "Provider disabled",
  });
});
