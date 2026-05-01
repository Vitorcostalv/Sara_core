/**
 * voice.persistence.integration.test.ts
 *
 * Requires a live PostgreSQL connection via DATABASE_URL.
 * Run `npm run db:migrate` before executing this test.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { pool, withTransaction } from "../../database/postgres";
import { ConversationTurnsRepository } from "../conversation-turns/conversation-turns.repository";
import { ToolCallsRepository } from "../tool-calls/tool-calls.repository";
import { VoiceService } from "./voice.service";

const TEST_USER_ID = `test-voice-persistence-${randomUUID()}`;

async function ensureTestUser(): Promise<void> {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO user_profile (id, display_name, locale, timezone, created_at, updated_at)
     VALUES ($1, 'Voice Test User', 'pt-BR', 'America/Sao_Paulo', $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID, now, now]
  );
}

async function cleanupTestUser(): Promise<void> {
  await pool.query("DELETE FROM user_profile WHERE id = $1", [TEST_USER_ID]);
}

test("VoiceService persists a user turn, a tool call and an assistant turn in PostgreSQL", async () => {
  await ensureTestUser();

  try {
    const service = new VoiceService(
      () => ({
        transcribe: () => "Quero auditar o grounding atual",
      }),
      {
        audioConverter: () => undefined,
        userProfileRepository: {
          ensureLocalProfile: () => Promise.resolve({ id: TEST_USER_ID }),
        },
        llmGenerator: {
          generate: () =>
            Promise.resolve({
              provider: "mock",
              model: "mock-grounded-model",
              answer: "Grounding auditado com sucesso.",
              dryRun: false,
              contextPreview: "Grounded context",
              factsPreview: [],
              ecosystems: [],
              grounding: {
                userId: TEST_USER_ID,
                profileIncluded: true,
                factCount: 2,
                ecosystemsUsed: ["sara-core"],
                warnings: [],
              },
            }),
        },
      }
    );

    const response = await service.processVoiceInteraction({
      audioBuffer: Buffer.from("audio"),
      mimeType: "audio/webm",
      language: "pt-BR",
    });

    assert.equal(response.transcription, "Quero auditar o grounding atual");
    assert.equal(response.assistantText, "Grounding auditado com sucesso.");

    const turns = await pool.query<{
      id: string;
      role: string;
      content: string;
      source: string;
    }>(
      `SELECT id, role, content, source
       FROM conversation_turns
       WHERE user_id = $1
       ORDER BY created_at ASC, id ASC`,
      [TEST_USER_ID]
    );

    assert.equal(turns.rows.length, 2);
    assert.equal(turns.rows[0]?.role, "user");
    assert.equal(turns.rows[0]?.source, "voice-user");
    assert.equal(turns.rows[1]?.role, "assistant");
    assert.equal(turns.rows[1]?.source, "voice-assistant");

    const toolCalls = await pool.query<{
      tool_name: string;
      status: string;
      conversation_turn_id: string;
    }>(
      `SELECT tool_name, status, conversation_turn_id
       FROM tool_calls
       WHERE conversation_turn_id = $1`,
      [turns.rows[0]?.id]
    );

    assert.equal(toolCalls.rows.length, 1);
    assert.equal(toolCalls.rows[0]?.tool_name, "llm.generate");
    assert.equal(toolCalls.rows[0]?.status, "success");
  } finally {
    await cleanupTestUser();
  }
});

test("VoiceService rolls back persisted writes when the transactional persistence phase fails", async () => {
  await ensureTestUser();

  try {
    let createCallCount = 0;

    const service = new VoiceService(
      () => ({
        transcribe: () => "Quero validar rollback operacional",
      }),
      {
        audioConverter: () => undefined,
        userProfileRepository: {
          ensureLocalProfile: () => Promise.resolve({ id: TEST_USER_ID }),
        },
        runInTransaction: withTransaction,
        createConversationTurnsRepository: (db) => {
          const repository = new ConversationTurnsRepository(db);
          return {
            create: async (input) => {
              createCallCount += 1;
              if (createCallCount === 2) {
                throw new Error("forced assistant turn failure");
              }

              return repository.create(input);
            },
          };
        },
        createToolCallsRepository: (db) => new ToolCallsRepository(db),
        llmGenerator: {
          generate: () =>
            Promise.resolve({
              provider: "mock",
              model: "mock-grounded-model",
              answer: "Resposta pronta antes da persistencia.",
              dryRun: false,
              contextPreview: "Grounded context",
              factsPreview: [],
              ecosystems: [],
              grounding: {
                userId: TEST_USER_ID,
                profileIncluded: true,
                factCount: 2,
                ecosystemsUsed: ["sara-core"],
                warnings: [],
              },
            }),
        },
      }
    );

    await assert.rejects(
      () =>
        service.processVoiceInteraction({
          audioBuffer: Buffer.from("audio"),
          mimeType: "audio/webm",
          language: "pt-BR",
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as { code?: string }).code, "VOICE_PERSISTENCE_FAILED");
        return true;
      }
    );

    const turns = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM conversation_turns
       WHERE user_id = $1
         AND source IN ('voice-user', 'voice-assistant')`,
      [TEST_USER_ID]
    );
    const toolCalls = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM tool_calls
       WHERE conversation_turn_id IN (
         SELECT id FROM conversation_turns WHERE user_id = $1 AND source = 'voice-user'
       )`,
      [TEST_USER_ID]
    );

    assert.equal(parseInt(turns.rows[0]?.count ?? "0", 10), 0);
    assert.equal(parseInt(toolCalls.rows[0]?.count ?? "0", 10), 0);
  } finally {
    await cleanupTestUser();
  }
});

process.on("exit", () => {
  void pool.end();
});
