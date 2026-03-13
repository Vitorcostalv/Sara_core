import { randomUUID } from "node:crypto";
import type { Task, TaskStatus } from "@sara/shared-types";
import { db } from "../../database/client";
import type { CreateTaskInput, ListTasksQuery } from "./tasks.schemas";

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  due_at: string | null;
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
    dueAt: row.due_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TasksRepository {
  list(query: ListTasksQuery): Task[] {
    const baseSql = `
      SELECT id, user_id, title, description, status, priority, due_at, created_at, updated_at
      FROM tasks
    `;

    if (query.status) {
      const rows = db
        .prepare(`${baseSql} WHERE status = ? ORDER BY updated_at DESC LIMIT ?`)
        .all(query.status, query.limit) as TaskRow[];

      return rows.map(mapTask);
    }

    const rows = db.prepare(`${baseSql} ORDER BY updated_at DESC LIMIT ?`).all(query.limit) as TaskRow[];
    return rows.map(mapTask);
  }

  create(input: CreateTaskInput): Task {
    const now = new Date().toISOString();
    const id = randomUUID();

    db.prepare(
      `
      INSERT INTO tasks (id, user_id, title, description, status, priority, due_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    ).run(
      id,
      input.userId,
      input.title,
      input.description ?? null,
      "pending",
      input.priority,
      input.dueAt ?? null,
      now,
      now
    );

    const row = db
      .prepare(
        `
      SELECT id, user_id, title, description, status, priority, due_at, created_at, updated_at
      FROM tasks
      WHERE id = ?
    `
      )
      .get(id) as TaskRow;

    return mapTask(row);
  }
}
