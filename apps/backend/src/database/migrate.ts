import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { env } from "../config/env";
import { db } from "./client";
import { logger } from "../logging/logger";

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function ensureMigrationTable(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function runMigrations(): void {
  ensureMigrationTable();

  const migrationDir = path.resolve(env.repositoryRoot, "database", "migrations");

  if (!fs.existsSync(migrationDir)) {
    logger.warn({ migrationDir }, "Migration directory not found; skipping migrations");
    return;
  }

  const files = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const findAppliedStmt = db.prepare("SELECT checksum FROM schema_migrations WHERE file_name = ?");
  const registerStmt = db.prepare("INSERT INTO schema_migrations (file_name, checksum) VALUES (?, ?)");

  for (const fileName of files) {
    const absoluteFile = path.resolve(migrationDir, fileName);
    const sql = fs.readFileSync(absoluteFile, "utf8");
    const currentChecksum = checksum(sql);
    const existing = findAppliedStmt.get(fileName) as { checksum: string } | undefined;

    if (existing) {
      if (existing.checksum !== currentChecksum) {
        throw new Error(`Migration checksum mismatch for ${fileName}`);
      }
      continue;
    }

    const transaction = db.transaction(() => {
      db.exec(sql);
      registerStmt.run(fileName, currentChecksum);
    });

    transaction();
    logger.info({ fileName }, "Applied migration");
  }
}

if (require.main === module) {
  runMigrations();
  logger.info("Migrations completed");
}
