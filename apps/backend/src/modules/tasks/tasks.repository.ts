import { randomUUID } from "node:crypto";
import type { Task, TaskPriority, TaskStatus } from "@sara/shared-types";
import { db } from "../../database/client";
import { getPaginationOffset, type PaginatedResult } from "../../core/http/pagination";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./tasks.schemas";

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TasksRepository {
  list(query: ListTasksQuery): PaginatedResult<Task> {
    const filters: string[] = ["user_id = ?"];
    const params: unknown[] = [query.userId];

    if (query.status) {
      filters.push("status = ?");
      params.push(query.status);
    }

    if (query.priority) {
      filters.push("priority = ?");
      params.push(query.priority);
    }

    const whereSql = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
    const offset = getPaginationOffset(query);

    const totalRow = db.prepare(`SELECT COUNT(*) AS total FROM tasks ${whereSql}`).get(...params) as {
      total: number;
    };

    const rows = db
      .prepare(
        `
        SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at
        FROM tasks
        ${whereSql}
        ORDER BY updated_at DESC, id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(...params, query.pageSize, offset) as TaskRow[];

    return {
      items: rows.map(mapTask),
      total: totalRow.total
    };
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const id = randomUUID();

    db.prepare(
      `
      INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      input.userId,
      input.title,
      input.description ?? null,
      "pending",
      input.priority,
      input.dueDate ?? null,
      now,
      now
    );

    return this.findById(id)!;
  }

  findById(id: string): Task | null {
    const row = db
      .prepare(
        `
        SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at
        FROM tasks
        WHERE id = ?
      `
      )
      .get(id) as TaskRow | undefined;

    return row ? mapTask(row) : null;
  }

  updateById(id: string, input: UpdateTaskInput): Task | null {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (input.title !== undefined) {
      fields.push("title = ?");
      values.push(input.title);
    }

    if (input.description !== undefined) {
      fields.push("description = ?");
      values.push(input.description);
    }

    if (input.status !== undefined) {
      fields.push("status = ?");
      values.push(input.status);
    }

    if (input.priority !== undefined) {
      fields.push("priority = ?");
      values.push(input.priority);
    }

    if (input.dueDate !== undefined) {
      fields.push("due_date = ?");
      values.push(input.dueDate);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    const result = db
      .prepare(
        `
        UPDATE tasks
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

  completeById(id: string): Task | null {
    return this.updateById(id, { status: "done" });
  }

  deleteById(id: string): boolean {
    const result = db
      .prepare(
        `
        DELETE FROM tasks
        WHERE id = ?
      `
      )
      .run(id);

    return result.changes > 0;
  }
}
