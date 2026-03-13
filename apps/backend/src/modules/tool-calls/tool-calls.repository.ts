import { randomUUID } from "node:crypto";
import type { JsonValue, ToolCall, ToolCallStatus } from "@sara/shared-types";
import { db } from "../../database/client";
import { getPaginationOffset, type PaginatedResult } from "../../core/http/pagination";
import type { CreateToolCallInput, ListToolCallsQuery, UpdateToolCallStatusInput } from "./tool-calls.schemas";

interface ToolCallRow {
  id: string;
  conversation_turn_id: string;
  tool_name: string;
  input_payload: string;
  output_payload: string | null;
  status: ToolCallStatus;
  duration_ms: number | null;
  created_at: string;
}

function safeParsePayload(payload: string | null): JsonValue | null {
  if (payload === null) {
    return null;
  }

  try {
    return JSON.parse(payload) as JsonValue;
  } catch {
    return null;
  }
}

function mapToolCall(row: ToolCallRow): ToolCall {
  const parsedInputPayload = safeParsePayload(row.input_payload);

  return {
    id: row.id,
    conversationTurnId: row.conversation_turn_id,
    toolName: row.tool_name,
    inputPayload: parsedInputPayload ?? null,
    outputPayload: safeParsePayload(row.output_payload),
    status: row.status,
    durationMs: row.duration_ms,
    createdAt: row.created_at
  };
}

export class ToolCallsRepository {
  list(query: ListToolCallsQuery): PaginatedResult<ToolCall> {
    const filters: string[] = [];
    const params: unknown[] = [];

    if (query.conversationTurnId) {
      filters.push("conversation_turn_id = ?");
      params.push(query.conversationTurnId);
    }

    if (query.status) {
      filters.push("status = ?");
      params.push(query.status);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const offset = getPaginationOffset(query);

    const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM tool_calls ${whereSql}`).get(...params) as {
      total: number;
    };

    const rows = db
      .prepare(
        `
        SELECT id, conversation_turn_id, tool_name, input_payload, output_payload, status, duration_ms, created_at
        FROM tool_calls
        ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, query.pageSize, offset) as ToolCallRow[];

    return {
      items: rows.map(mapToolCall),
      total: totalRow.total
    };
  }

  create(input: CreateToolCallInput): ToolCall {
    const id = randomUUID();
    const now = new Date().toISOString();
    const inputPayload = JSON.stringify(input.inputPayload ?? null);
    const outputPayload = input.outputPayload === undefined ? null : JSON.stringify(input.outputPayload);

    db.prepare(
      `
      INSERT INTO tool_calls (
        id, conversation_turn_id, tool_name, input_payload, output_payload, status, duration_ms, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      input.conversationTurnId,
      input.toolName,
      inputPayload,
      outputPayload,
      input.status,
      input.durationMs ?? null,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): ToolCall | null {
    const row = db
      .prepare(
        `
        SELECT id, conversation_turn_id, tool_name, input_payload, output_payload, status, duration_ms, created_at
        FROM tool_calls
        WHERE id = ?
      `
      )
      .get(id) as ToolCallRow | undefined;

    return row ? mapToolCall(row) : null;
  }

  updateStatusById(id: string, input: UpdateToolCallStatusInput): ToolCall | null {
    const outputPayload = input.outputPayload === undefined ? undefined : JSON.stringify(input.outputPayload);

    const fields: string[] = ["status = ?"];
    const values: unknown[] = [input.status];

    if (outputPayload !== undefined) {
      fields.push("output_payload = ?");
      values.push(outputPayload);
    }

    if (input.durationMs !== undefined) {
      fields.push("duration_ms = ?");
      values.push(input.durationMs);
    }

    values.push(id);

    const result = db
      .prepare(
        `
        UPDATE tool_calls
        SET ${fields.join(", ")}
        WHERE id = ?
      `
      )
      .run(...values);

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
  }

  conversationTurnExists(conversationTurnId: string): boolean {
    const row = db
      .prepare(
        `
        SELECT id
        FROM conversation_turns
        WHERE id = ?
      `
      )
      .get(conversationTurnId) as { id: string } | undefined;

    return !!row;
  }
}
