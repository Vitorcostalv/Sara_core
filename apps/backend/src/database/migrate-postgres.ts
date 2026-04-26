import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { env } from "../config/env";
import { logger } from "../logging/logger";

async function runMigrationsPostgres(): Promise<void> {
  const connectionString = env.directDatabaseUrl ?? env.databaseUrl;
  const client = new pg.Client({
    connectionString,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  logger.info("Connected for migrations");

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const migrationDir = path.resolve(env.repositoryRoot, "database", "postgres", "migrations");

    if (!fs.existsSync(migrationDir)) {
      logger.warn({ migrationDir }, "PostgreSQL migration directory not found; skipping");
      return;
    }

    const files = fs
      .readdirSync(migrationDir)
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of files) {
      const { rows } = await client.query<{ id: string }>(
        "SELECT id FROM schema_migrations WHERE id = $1",
        [fileName]
      );

      if (rows.length > 0) {
        logger.debug({ fileName }, "Migration already applied, skipping");
        continue;
      }

      const sql = fs.readFileSync(path.resolve(migrationDir, fileName), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [fileName]);
        await client.query("COMMIT");
        logger.info({ fileName }, "Applied migration");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(
          `Migration failed for ${fileName}: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err }
        );
      }
    }

    logger.info("All migrations completed");
  } finally {
    await client.end();
  }
}

runMigrationsPostgres().catch((err) => {
  logger.error({ message: err instanceof Error ? err.message : String(err) }, "Migration error");
  process.exit(1);
});
