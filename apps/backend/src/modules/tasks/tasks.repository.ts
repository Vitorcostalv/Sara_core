import { randomUUID } from "node:crypto";
import type { Task, TaskPriority, TaskStatus } from "@sara/shared-types";
import { query } from "../../database/postgres";
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
    updatedAt: row.updated_at,
  };
}

export class TasksRepository {
  async list(q: ListTasksQuery): Promise<PaginatedResult<Task>> {
    const filters: string[] = ["user_id = $1"];
    const params: unknown[] = [q.userId];
    let idx = 2;

    if (q.status) { filters.push(`status = $${idx++}`); params.push(q.status); }
    if (q.priority) { filters.push(`priority = $${idx++}`); params.push(q.priority); }

    const whereSql = `WHERE ${filters.join(" AND ")}`;
    const offset = getPaginationOffset(q);

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM tasks ${whereSql}`,
      params
    );

    const rowsResult = await query<TaskRow>(
      `SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at
       FROM tasks
       ${whereSql}
       ORDER BY updated_at DESC, id DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, q.pageSize, offset]
    );

    return {
      items: rowsResult.rows.map(mapTask),
      total: parseInt(countResult.rows[0]?.total ?? "0", 10),
    };
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const now = new Date().toISOString();
    const id = randomUUID();

    await query(
      `INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, input.userId, input.title, input.description ?? null, "pending", input.priority, input.dueDate ?? null, now, now]
    );

    return (await this.findById(id))!;
  }

  async findById(id: string): Promise<Task | null> {
    const result = await query<TaskRow>(
      `SELECT id, user_id, title, description, status, priority, due_date, created_at, updated_at
       FROM tasks WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    return row ? mapTask(row) : null;
  }

  async updateById(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.title !== undefined) { fields.push(`title = $${idx++}`); values.push(input.title); }
    if (input.description !== undefined) { fields.push(`description = $${idx++}`); values.push(input.description); }
    if (input.status !== undefined) { fields.push(`status = $${idx++}`); values.push(input.status); }
    if (input.priority !== undefined) { fields.push(`priority = $${idx++}`); values.push(input.priority); }
    if (input.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(input.dueDate); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = $${idx++}`);
    values.push(new Date().toISOString());
    values.push(id);

    const result = await query(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${idx}`,
      values
    );

    if ((result.rowCount ?? 0) === 0) return null;
    return this.findById(id);
  }

  async completeById(id: string): Promise<Task | null> {
    return this.updateById(id, { status: "done" });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await query("DELETE FROM tasks WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
