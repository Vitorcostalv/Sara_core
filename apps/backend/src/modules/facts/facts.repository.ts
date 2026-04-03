import { randomUUID } from "node:crypto";
import type { Fact } from "@sara/shared-types";
import { db } from "../../database/client";
import { getPaginationOffset, type PaginatedResult } from "../../core/http/pagination";
import type { CreateFactInput, ListFactsQuery, UpdateFactInput } from "./facts.schemas";

interface FactRow {
  id: string;
  user_id: string;
  key: string;
  value: string;
  category: string;
  is_important: number;
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
    isImportant: row.is_important === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
  "profile"
] as const;

export class FactsRepository {
  constructor(private readonly database: import("better-sqlite3").Database = db) {}

  list(query: ListFactsQuery): PaginatedResult<Fact> {
    const filters: string[] = ["user_id = ?"];
    const params: unknown[] = [query.userId];

    if (query.category) {
      filters.push("category = ?");
      params.push(query.category);
    }

    if (query.isImportant !== undefined) {
      filters.push("is_important = ?");
      params.push(query.isImportant ? 1 : 0);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const offset = getPaginationOffset(query);

    const totalRow = this.database.prepare(`SELECT COUNT(*) AS total FROM facts ${whereSql}`).get(...params) as {
      total: number;
    };

    const rows = this.database
      .prepare(
        `
        SELECT id, user_id, key, value, category, is_important, created_at, updated_at
        FROM facts
        ${whereSql}
        ORDER BY updated_at DESC, id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, query.pageSize, offset) as FactRow[];

    return {
      items: rows.map(mapFact),
      total: totalRow.total
    };
  }

  listGroundingFacts(query: ListGroundingFactsQuery): Fact[] {
    const normalizedEcosystems = Array.from(
      new Set(
        (query.ecosystems ?? [])
          .map((ecosystem) => ecosystem.trim().toLowerCase())
          .filter((ecosystem) => ecosystem.length > 0)
      )
    );
    const ecosystemCategories = normalizedEcosystems.map((ecosystem) => `ecosystem:${ecosystem}`);
    const params: unknown[] = [query.userId];
    const globalCategoryPlaceholders = groundingGlobalCategories.map(() => "?").join(", ");
    const ecosystemClause =
      ecosystemCategories.length > 0
        ? `category IN (${ecosystemCategories.map(() => "?").join(", ")})`
        : "category LIKE 'ecosystem:%'";

    params.push(...ecosystemCategories);
    params.push(...groundingGlobalCategories);

    const requestedOrderSql =
      ecosystemCategories.length > 0
        ? `CASE ${ecosystemCategories.map(() => "WHEN category = ? THEN 0").join(" ")} ELSE 1 END,`
        : "";

    const orderParams = ecosystemCategories.length > 0 ? [...ecosystemCategories] : [];

    const rows = this.database
      .prepare(
        `
        SELECT id, user_id, key, value, category, is_important, created_at, updated_at
        FROM facts
        WHERE user_id = ?
          AND (
            ${ecosystemClause}
            OR category IN (${globalCategoryPlaceholders})
          )
        ORDER BY
          ${requestedOrderSql}
          CASE WHEN category LIKE 'ecosystem:%' THEN 0 ELSE 1 END,
          is_important DESC,
          updated_at DESC,
          id DESC
        LIMIT ?
      `
      )
      .all(...params, ...orderParams, query.limit) as FactRow[];

    return rows.map(mapFact);
  }

  create(input: CreateFactInput): Fact {
    const now = new Date().toISOString();
    const id = randomUUID();

    this.database.prepare(
      `
      INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(id, input.userId, input.key, input.value, input.category, input.isImportant ? 1 : 0, now, now);

    return this.findById(id)!;
  }

  findById(id: string): Fact | null {
    const row = this.database
      .prepare(
        `
        SELECT id, user_id, key, value, category, is_important, created_at, updated_at
        FROM facts
        WHERE id = ?
      `
      )
      .get(id) as FactRow | undefined;

    return row ? mapFact(row) : null;
  }

  updateById(id: string, input: UpdateFactInput): Fact | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.key !== undefined) {
      fields.push("key = ?");
      values.push(input.key);
    }

    if (input.value !== undefined) {
      fields.push("value = ?");
      values.push(input.value);
    }

    if (input.category !== undefined) {
      fields.push("category = ?");
      values.push(input.category);
    }

    if (input.isImportant !== undefined) {
      fields.push("is_important = ?");
      values.push(input.isImportant ? 1 : 0);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    const result = this.database
      .prepare(
        `
        UPDATE facts
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

  markImportantById(id: string, isImportant: boolean): Fact | null {
    return this.updateById(id, { isImportant });
  }

  deleteById(id: string): boolean {
    const result = this.database
      .prepare(
        `
        DELETE FROM facts
        WHERE id = ?
      `
      )
      .run(id);

    return result.changes > 0;
  }
}
