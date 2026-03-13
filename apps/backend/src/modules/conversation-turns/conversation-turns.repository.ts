import { randomUUID } from "node:crypto";
import type { ConversationRole, ConversationTurn } from "@sara/shared-types";
import { db } from "../../database/client";
import { getPaginationOffset, type PaginatedResult } from "../../core/http/pagination";
import type {
  CreateConversationTurnInput,
  ListConversationTurnsQuery
} from "./conversation-turns.schemas";

interface ConversationTurnRow {
  id: string;
  user_id: string;
  role: ConversationRole;
  content: string;
  source: string;
  created_at: string;
}

function mapConversationTurn(row: ConversationTurnRow): ConversationTurn {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    source: row.source,
    createdAt: row.created_at
  };
}

export class ConversationTurnsRepository {
  list(query: ListConversationTurnsQuery): PaginatedResult<ConversationTurn> {
    const filters: string[] = ["user_id = ?"];
    const params: unknown[] = [query.userId];

    if (query.role) {
      filters.push("role = ?");
      params.push(query.role);
    }

    if (query.source) {
      filters.push("source = ?");
      params.push(query.source);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const offset = getPaginationOffset(query);

    const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM conversation_turns ${whereSql}`).get(...params) as {
      total: number;
    };

    const rows = db
      .prepare(
        `
        SELECT id, user_id, role, content, source, created_at
        FROM conversation_turns
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, query.pageSize, offset) as ConversationTurnRow[];

    return {
      items: rows.map(mapConversationTurn),
      total: totalRow.total
    };
  }

  create(input: CreateConversationTurnInput): ConversationTurn {
    const id = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      `
      INSERT INTO conversation_turns (id, user_id, role, content, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    ).run(id, input.userId, input.role, input.content, input.source, now);

    return this.findById(id)!;
  }

  findById(id: string): ConversationTurn | null {
    const row = db
      .prepare(
        `
        SELECT id, user_id, role, content, source, created_at
        FROM conversation_turns
        WHERE id = ?
      `
      )
      .get(id) as ConversationTurnRow | undefined;

    return row ? mapConversationTurn(row) : null;
  }
}
