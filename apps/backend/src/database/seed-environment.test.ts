/**
 * seed-environment.test.ts
 *
 * Validates that 003_seed_environment.sql was applied correctly.
 * Requires DATABASE_URL and an already-seeded database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "./postgres";

test("environment facts: at least 15 records under ecosystem:environment", async () => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category = 'ecosystem:environment'`
  );
  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  assert.ok(count >= 15, `Expected >= 15 environment facts, found: ${count}`);
});

test("environment tasks: at least 10 records with id task-env-", async () => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM tasks
     WHERE user_id = 'local-user'
       AND id LIKE 'task-env-%'`
  );
  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  assert.ok(count >= 10, `Expected >= 10 environment tasks, found: ${count}`);
});

test("seed idempotency: re-inserting an existing environment fact does not change the total", async () => {
  const before = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category = 'ecosystem:environment'`
  );
  const countBefore = parseInt(before.rows[0]?.count ?? "0", 10);

  await pool.query(`
    INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
    VALUES (
      'fact-env-reciclagem-separacao',
      'local-user',
      'environment.reciclagem.separacao-residuos',
      'Separar residuos reciclaveis facilita a destinacao correta e reduz o descarte inadequado.',
      'ecosystem:environment',
      TRUE,
      '2026-04-26T00:00:00.000Z',
      '2026-04-26T00:00:00.000Z'
    )
    ON CONFLICT (id) DO UPDATE SET
      key = EXCLUDED.key,
      value = EXCLUDED.value,
      category = EXCLUDED.category,
      is_important = EXCLUDED.is_important,
      updated_at = EXCLUDED.updated_at
  `);

  const after = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category = 'ecosystem:environment'`
  );
  const countAfter = parseInt(after.rows[0]?.count ?? "0", 10);

  assert.equal(countAfter, countBefore, "Re-inserting an existing fact must not create duplicates");
});

test("environment tasks keep valid status and priority ranges", async () => {
  const result = await pool.query<{ id: string; status: string; priority: number }>(
    `SELECT id, status, priority
     FROM tasks
     WHERE user_id = 'local-user'
       AND id LIKE 'task-env-%'`
  );

  for (const row of result.rows) {
    assert.ok(
      ["pending", "in_progress", "done", "archived"].includes(row.status),
      `Task ${row.id} has invalid status: ${row.status}`
    );
    assert.ok(
      row.priority >= 1 && row.priority <= 5,
      `Task ${row.id} has invalid priority: ${row.priority}`
    );
  }
});

process.on("exit", () => {
  void pool.end();
});
