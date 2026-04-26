import { randomUUID } from "node:crypto";
import type { Fact } from "@sara/shared-types";
import { query } from "../../database/postgres";
import { getPaginationOffset, type PaginatedResult } from "../../core/http/pagination";
import type { CreateFactInput, ListFactsQuery, UpdateFactInput } from "./facts.schemas";

interface FactRow {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: string;
  is_important: boolean;
  created_at: string;
  updated_at: string;
}

function mapFact(row: FactRow): Fact {
  return {
    id: row.id,
    userId: row.user_id,
    key: row.key,
    value: row.value,
    category: row.category,
    isImportant: row.is_important,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ListGroundingFactsQuery {
  userId: string;
  ecosystems?: string[];
  limit: number;
}

const groundingGlobalCategories = [
  "context",
  "concept",
  "concepts",
  "preference",
  "preferences",
  "profile",
] as const;

export class FactsRepository {
  async list(q: ListFactsQuery): Promise<PaginatedResult<Fact>> {
    const filters: string[] = ["user_id = $1"];
    const params: unknown[] = [q.userId];
    let idx = 2;

    if (q.category) {
      filters.push(`category = $${idx++}`);
      params.push(q.category);
    }

    if (q.isImportant !== undefined) {
      filters.push(`is_important = $${idx++}`);
      params.push(q.isImportant);
    }

    const whereSql = `WHERE ${filters.join(" AND ")}`;
    const offset = getPaginationOffset(q);

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM facts ${whereSql}`,
      params
    );

    const rowsResult = await query<FactRow>(
      `SELECT id, user_id, key, value, category, is_important, created_at, updated_at
       FROM facts
       ${whereSql}
       ORDER BY updated_at DESC, id DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, q.pageSize, offset]
    );

    return {
      items: rowsResult.rows.map(mapFact),
      total: parseInt(countResult.rows[0]?.total ?? "0", 10),
    };
  }

  async listGroundingFacts(q: ListGroundingFactsQuery): Promise<Fact[]> {
    const normalizedEcosystems = Array.from(
      new Set(
        (q.ecosystems ?? [])
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.length > 0)
      )
    );
    const ecosystemCategories = normalizedEcosystems.map((e) => `ecosystem:${e}`);

    const params: unknown[] = [q.userId];
    let idx = 2;

    // ecosystem clause
    let ecosystemClause: string;
    if (ecosystemCategories.length > 0) {
      const placeholders = ecosystemCategories.map(() => `$${idx++}`).join(", ");
      params.push(...ecosystemCategories);
      ecosystemClause = `category IN (${placeholders})`;
    } else {
      ecosystemClause = "category LIKE 'ecosystem:%'";
    }

    // global categories
    const globalPlaceholders = groundingGlobalCategories.map(() => `$${idx++}`).join(", ");
    params.push(...groundingGlobalCategories);

    // ORDER BY CASE for requested ecosystem priority
    let requestedOrderSql = "";
    if (ecosystemCategories.length > 0) {
      const caseWhen = ecosystemCategories.map(() => `WHEN category = $${idx++} THEN 0`).join(" ");
      params.push(...ecosystemCategories);
      requestedOrderSql = `CASE ${caseWhen} ELSE 1 END,`;
    }

    params.push(q.limit);
    const limitPlaceholder = `$${idx++}`;

    const sql = `
      SELECT id, user_id, key, value, category, is_important, created_at, updated_at
      FROM facts
      WHERE user_id = $1
        AND (
          ${ecosystemClause}
          OR category IN (${globalPlaceholders})
        )
      ORDER BY
        ${requestedOrderSql}
        CASE WHEN category LIKE 'ecosystem:%' THEN 0 ELSE 1 END,
        is_important DESC,
        updated_at DESC,
        id DESC
      LIMIT ${limitPlaceholder}
    `;

    const result = await query<FactRow>(sql, params);
    return result.rows.map(mapFact);
  }

  async create(input: CreateFactInput): Promise<Fact> {
    const now = new Date().toISOString();
    const id = randomUUID();

    await query(
      `INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, input.userId, input.key, input.value, input.category, input.isImportant, now, now]
    );

    return (await this.findById(id))!;
  }

  async findById(id: string): Promise<Fact | null> {
    const result = await query<FactRow>(
      `SELECT id, user_id, key, value, category, is_important, created_at, updated_at
       FROM facts WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? mapFact(row) : null;
  }

  async updateById(id: string, input: UpdateFactInput): Promise<Fact | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.key !== undefined) { fields.push(`key = $${idx++}`); values.push(input.key); }
    if (input.value !== undefined) { fields.push(`value = $${idx++}`); values.push(input.value); }
    if (input.category !== undefined) { fields.push(`category = $${idx++}`); values.push(input.category); }
    if (input.isImportant !== undefined) { fields.push(`is_important = $${idx++}`); values.push(input.isImportant); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await query(
      `UPDATE facts SET ${fields.join(", ")} WHERE id = $${idx}`,
      values
    );

    if ((result.rowCount ?? 0) === 0) return null;
    return this.findById(id);
  }

  async markImportantById(id: string, isImportant: boolean): Promise<Fact | null> {
    return this.updateById(id, { isImportant });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await query("DELETE FROM facts WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
