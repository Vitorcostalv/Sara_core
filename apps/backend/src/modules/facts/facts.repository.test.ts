/**
 * facts.repository.test.ts
 *
 * This test requires a live PostgreSQL connection via DATABASE_URL.
 * Set DATABASE_URL (and optionally DIRECT_DATABASE_URL) in your .env before running.
 *
 * The test uses the real pg pool and expects the schema to already be migrated
 * (run `npm run db:migrate` first).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { FactsRepository } from "./facts.repository";
import { pool } from "../../database/postgres";

const TEST_USER_ID = `test-facts-repo-${randomUUID()}`;

async function ensureTestUser(): Promise<void> {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO user_profile (id, display_name, locale, timezone, created_at, updated_at)
     VALUES ($1, 'Test User', 'pt-BR', 'America/Sao_Paulo', $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [TEST_USER_ID, now, now]
  );
}

async function cleanupTestUser(): Promise<void> {
  await pool.query("DELETE FROM user_profile WHERE id = $1", [TEST_USER_ID]);
}

test("FactsRepository creates, filters and updates facts", async () => {
  await ensureTestUser();

  try {
    const repository = new FactsRepository();

    const created = await repository.create({
      userId: TEST_USER_ID,
      key: "favorite_color",
      value: "blue",
      category: "preferences",
      isImportant: false,
    });

    assert.equal(created.key, "favorite_color");
    assert.equal(created.isImportant, false);

    const marked = await repository.markImportantById(created.id, true);
    assert.ok(marked);
    assert.equal(marked?.isImportant, true);

    const listed = await repository.list({
      userId: TEST_USER_ID,
      page: 1,
      pageSize: 20,
      category: "preferences",
      isImportant: true,
    });

    assert.equal(listed.total, 1);
    assert.equal(listed.items[0]?.id, created.id);

    const deleted = await repository.deleteById(created.id);
    assert.equal(deleted, true);
  } finally {
    await cleanupTestUser();
  }
});

test("FactsRepository.listGroundingFacts prioritizes requested ecosystems and relevant global facts", async () => {
  await ensureTestUser();

  try {
    const repository = new FactsRepository();

    await repository.create({
      userId: TEST_USER_ID,
      key: "definicao",
      value: "Cerrado e um ecossistema savanico.",
      category: "ecosystem:cerrado",
      isImportant: true,
    });

    await repository.create({
      userId: TEST_USER_ID,
      key: "definicao",
      value: "Rio e um ecossistema lotico de agua corrente.",
      category: "ecosystem:rio",
      isImportant: false,
    });

    await repository.create({
      userId: TEST_USER_ID,
      key: "ecossistema.classificacao",
      value: "Ecossistemas podem ser terrestres, aquaticos e de transicao.",
      category: "concept",
      isImportant: true,
    });

    const facts = await repository.listGroundingFacts({
      userId: TEST_USER_ID,
      ecosystems: ["cerrado"],
      limit: 10,
    });

    assert.equal(facts.length, 2);
    assert.equal(facts[0]?.category, "ecosystem:cerrado");
    assert.equal(facts[1]?.category, "concept");
  } finally {
    await cleanupTestUser();
  }
});

// Close the pool after all tests
process.on("exit", () => { void pool.end(); });
