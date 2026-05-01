import { randomUUID } from "node:crypto";
import type { ConversationRole, ConversationTurn } from "@sara/shared-types";
import { pool, type Queryable } from "../../database/postgres";
import { getPaginationOffset, type PaginatedResult } from "../../core/http/pagination";
import type {
  CreateConversationTurnInput,
  ListConversationTurnsQuery,
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
    createdAt: row.created_at,
  };
}

export class ConversationTurnsRepository {
  constructor(private readonly db: Queryable = pool) {}

  async list(q: ListConversationTurnsQuery): Promise<PaginatedResult<ConversationTurn>> {
    const filters: string[] = ["user_id = $1"];
    const params: unknown[] = [q.userId];
    let idx = 2;

    if (q.role) { filters.push(`role = $${idx++}`); params.push(q.role); }
    if (q.source) { filters.push(`source = $${idx++}`); params.push(q.source); }

    const whereSql = `WHERE ${filters.join(" AND ")}`;
    const offset = getPaginationOffset(q);

    const countResult = await this.db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM conversation_turns ${whereSql}`,
      params
    );

    const rowsResult = await this.db.query<ConversationTurnRow>(
      `SELECT id, user_id, role, content, source, created_at
       FROM conversation_turns
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, q.pageSize, offset]
    );

    return {
      items: rowsResult.rows.map(mapConversationTurn),
      total: parseInt(countResult.rows[0]?.total ?? "0", 10),
    };
  }

  async create(input: CreateConversationTurnInput): Promise<ConversationTurn> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.db.query(
      `INSERT INTO conversation_turns (id, user_id, role, content, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, input.userId, input.role, input.content, input.source, now]
    );

    return (await this.findById(id))!;
  }

  async findById(id: string): Promise<ConversationTurn | null> {
    const result = await this.db.query<ConversationTurnRow>(
      `SELECT id, user_id, role, content, source, created_at
       FROM conversation_turns WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? mapConversationTurn(row) : null;
  }
}
