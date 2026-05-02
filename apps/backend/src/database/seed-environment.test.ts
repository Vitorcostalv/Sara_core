/**
 * seed-environment.test.ts
 *
 * Validates the ecological ecosystem grounding seed.
 * Requires DATABASE_URL and an already-seeded database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "./postgres";

const deprecatedGroundingCategories = [
  "ecosystem:sara-core",
  "ecosystem:backend",
  "ecosystem:frontend",
  "ecosystem:voice-stt",
  "ecosystem:llm-grounding",
  "ecosystem:security",
  "ecosystem:performance",
  "ecosystem:environment",
];

test("ecological ecosystem facts: at least 70 records under ecosystem:<slug>", async () => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category LIKE 'ecosystem:%'`
  );
  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  assert.ok(count >= 70, `Expected >= 70 ecological ecosystem facts, found: ${count}`);
});

test("deprecated project and generic environment ecosystem categories are absent", async () => {
  const result = await pool.query<{ category: string }>(
    `SELECT DISTINCT category
     FROM facts
     WHERE user_id = 'local-user'
       AND category = ANY($1::text[])`,
    [deprecatedGroundingCategories]
  );

  assert.deepEqual(
    result.rows.map((row) => row.category).sort(),
    [],
    "Deprecated ecosystem categories must not remain in the grounding path"
  );
});

test("environmental practice references were preserved outside ecosystem grounding", async () => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category = 'reference:environmental-practices'`
  );
  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  assert.ok(count >= 15, `Expected >= 15 environmental practice references, found: ${count}`);
});

test("seed idempotency: re-inserting an ecological ecosystem fact does not change the total", async () => {
  const before = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category LIKE 'ecosystem:%'`
  );
  const countBefore = parseInt(before.rows[0]?.count ?? "0", 10);

  await pool.query(`
    INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
    VALUES (
      'fact-eco-oceano-definicao',
      'local-user',
      'definicao',
      'Oceano e o grande ecossistema marinho global.',
      'ecosystem:oceano',
      TRUE,
      '2026-05-01T00:00:00.000Z',
      '2026-05-01T00:00:00.000Z'
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
       AND category LIKE 'ecosystem:%'`
  );
  const countAfter = parseInt(after.rows[0]?.count ?? "0", 10);

  assert.equal(countAfter, countBefore, "Re-inserting an existing ecological fact must not create duplicates");
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
