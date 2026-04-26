/**
 * seed-environment.test.ts
 *
 * Valida que a seed 003_seed_environment.sql foi aplicada corretamente.
 * Requer DATABASE_URL configurado e npm run db:seed já executado.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "./postgres";

test("facts ambientais: pelo menos 15 registros com category environment:", async () => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM facts
     WHERE user_id = 'local-user'
       AND category LIKE 'environment:%'`
  );
  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  assert.ok(count >= 15, `Esperado >= 15 facts ambientais, encontrado: ${count}`);
});

test("tasks ambientais: pelo menos 10 registros com id task-env-", async () => {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM tasks
     WHERE user_id = 'local-user'
       AND id LIKE 'task-env-%'`
  );
  const count = parseInt(result.rows[0]?.count ?? "0", 10);
  assert.ok(count >= 10, `Esperado >= 10 tasks ambientais, encontrado: ${count}`);
});

test("idempotência: re-inserir fact existente não aumenta o total", async () => {
  const before = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM facts WHERE category LIKE 'environment:%' AND user_id = 'local-user'`
  );
  const countBefore = parseInt(before.rows[0]?.count ?? "0", 10);

  await pool.query(`
    INSERT INTO facts (id, user_id, key, value, category, is_important, created_at, updated_at)
    VALUES (
      'fact-env-reciclagem-separacao',
      'local-user',
      'environment.reciclagem.separacao-residuos',
      'Separar resíduos recicláveis facilita a destinação correta e reduz o descarte inadequado.',
      'environment:reciclagem',
      TRUE,
      '2026-04-26T00:00:00.000Z',
      '2026-04-26T00:00:00.000Z'
    )
    ON CONFLICT (id) DO UPDATE SET
      key        = EXCLUDED.key,
      value      = EXCLUDED.value,
      category   = EXCLUDED.category,
      is_important = EXCLUDED.is_important,
      updated_at = EXCLUDED.updated_at
  `);

  const after = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM facts WHERE category LIKE 'environment:%' AND user_id = 'local-user'`
  );
  const countAfter = parseInt(after.rows[0]?.count ?? "0", 10);

  assert.equal(countAfter, countBefore, "Re-inserir não deve criar duplicata");
});

test("tasks ambientais: status válido (pending) e priority entre 1 e 5", async () => {
  const result = await pool.query<{ id: string; status: string; priority: number }>(
    `SELECT id, status, priority
     FROM tasks
     WHERE user_id = 'local-user'
       AND id LIKE 'task-env-%'`
  );

  for (const row of result.rows) {
    assert.ok(
      ["pending", "in_progress", "done", "archived"].includes(row.status),
      `task ${row.id} tem status inválido: ${row.status}`
    );
    assert.ok(
      row.priority >= 1 && row.priority <= 5,
      `task ${row.id} tem priority inválida: ${row.priority}`
    );
  }
});

process.on("exit", () => { void pool.end(); });
