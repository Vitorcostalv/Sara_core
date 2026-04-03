import assert from "node:assert/strict";
import test from "node:test";
import Database from "better-sqlite3";
import { FactsRepository } from "./facts.repository";

function createInMemoryDb() {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");

  database.exec(`
    CREATE TABLE user_profile (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      locale TEXT NOT NULL,
      timezone TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE facts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT NOT NULL,
      is_important INTEGER NOT NULL DEFAULT 0 CHECK (is_important IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
    );
  `);

  const now = new Date().toISOString();

  database
    .prepare(
      `
      INSERT INTO user_profile (id, display_name, locale, timezone, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
    .run("local-user", "Local User", "pt-BR", "America/Sao_Paulo", now, now);

  return database;
}

test("FactsRepository creates, filters and updates facts", () => {
  const database = createInMemoryDb();
  const repository = new FactsRepository(database);

  const created = repository.create({
    userId: "local-user",
    key: "favorite_color",
    value: "blue",
    category: "preferences",
    isImportant: false
  });

  assert.equal(created.key, "favorite_color");
  assert.equal(created.isImportant, false);

  const marked = repository.markImportantById(created.id, true);
  assert.ok(marked);
  assert.equal(marked?.isImportant, true);

  const listed = repository.list({
    userId: "local-user",
    page: 1,
    pageSize: 20,
    category: "preferences",
    isImportant: true
  });

  assert.equal(listed.total, 1);
  assert.equal(listed.items[0]?.id, created.id);

  const deleted = repository.deleteById(created.id);
  assert.equal(deleted, true);

  database.close();
});

test("FactsRepository.listGroundingFacts prioritizes requested ecosystems and relevant global facts", () => {
  const database = createInMemoryDb();
  const repository = new FactsRepository(database);

  repository.create({
    userId: "local-user",
    key: "identity.summary",
    value: "Sara Core is a local assistant platform.",
    category: "ecosystem:sara-core",
    isImportant: true
  });

  repository.create({
    userId: "local-user",
    key: "voice.endpoint",
    value: "Voice upload uses /api/v1/voice/interactions.",
    category: "ecosystem:voice-stt",
    isImportant: false
  });

  repository.create({
    userId: "local-user",
    key: "engineering.change-policy",
    value: "Evolve incrementally without recreating architecture.",
    category: "preferences",
    isImportant: true
  });

  const facts = repository.listGroundingFacts({
    userId: "local-user",
    ecosystems: ["sara-core"],
    limit: 10
  });

  assert.equal(facts.length, 2);
  assert.equal(facts[0]?.category, "ecosystem:sara-core");
  assert.equal(facts[1]?.category, "preferences");

  database.close();
});
