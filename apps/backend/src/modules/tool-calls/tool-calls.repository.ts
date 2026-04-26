import { randomUUID } from "node:crypto";
import type { JsonValue, ToolCall, ToolCallStatus } from "@sara/shared-types";
import { query } from "../../database/postgres";
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
  if (payload === null) return null;
  try {
    return JSON.parse(payload) as JsonValue;
  } catch {
    return null;
  }
}

function mapToolCall(row: ToolCallRow): ToolCall {
  return {
    id: row.id,
    conversationTurnId: row.conversation_turn_id,
    toolName: row.tool_name,
    inputPayload: safeParsePayload(row.input_payload),
    outputPayload: safeParsePayload(row.output_payload),
    status: row.status,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

export class ToolCallsRepository {
  async list(q: ListToolCallsQuery): Promise<PaginatedResult<ToolCall>> {
    const filters: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (q.conversationTurnId) { filters.push(`conversation_turn_id = $${idx++}`); params.push(q.conversationTurnId); }
    if (q.status) { filters.push(`status = $${idx++}`); params.push(q.status); }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const offset = getPaginationOffset(q);

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM tool_calls ${whereSql}`,
      params
    );

    const rowsResult = await query<ToolCallRow>(
      `SELECT id, conversation_turn_id, tool_name, input_payload, output_payload, status, duration_ms, created_at
       FROM tool_calls
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, q.pageSize, offset]
    );

    return {
      items: rowsResult.rows.map(mapToolCall),
      total: parseInt(countResult.rows[0]?.total ?? "0", 10),
    };
  }

  async create(input: CreateToolCallInput): Promise<ToolCall> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const inputPayload = JSON.stringify(input.inputPayload ?? null);
    const outputPayload = input.outputPayload === undefined ? null : JSON.stringify(input.outputPayload);

    await query(
      `INSERT INTO tool_calls (id, conversation_turn_id, tool_name, input_payload, output_payload, status, duration_ms, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, input.conversationTurnId, input.toolName, inputPayload, outputPayload, input.status, input.durationMs ?? null, now]
    );

    return (await this.findById(id))!;
  }

  async findById(id: string): Promise<ToolCall | null> {
    const result = await query<ToolCallRow>(
      `SELECT id, conversation_turn_id, tool_name, input_payload, output_payload, status, duration_ms, created_at
       FROM tool_calls WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? mapToolCall(row) : null;
  }

  async updateStatusById(id: string, input: UpdateToolCallStatusInput): Promise<ToolCall | null> {
    const fields: string[] = ["status = $1"];
    const values: unknown[] = [input.status];
    let idx = 2;

    if (input.outputPayload !== undefined) {
      fields.push(`output_payload = $${idx++}`);
      values.push(JSON.stringify(input.outputPayload));
    }

    if (input.durationMs !== undefined) {
      fields.push(`duration_ms = $${idx++}`);
      values.push(input.durationMs);
    }

    values.push(id);

    const result = await query(
      `UPDATE tool_calls SET ${fields.join(", ")} WHERE id = $${idx}`,
      values
    );

    if ((result.rowCount ?? 0) === 0) return null;
    return this.findById(id);
  }

  async conversationTurnExists(conversationTurnId: string): Promise<boolean> {
    const result = await query<{ id: string }>(
      "SELECT id FROM conversation_turns WHERE id = $1",
      [conversationTurnId]
    );
    return result.rows.length > 0;
  }
}
