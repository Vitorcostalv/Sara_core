import { db } from "./client";
import { logger } from "../logging/logger";
import { runMigrations } from "./migrate";
import { runSeeds } from "./seed";

const tables = db
  .prepare(
    `
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
  `
  )
  .all() as Array<{ name: string }>;

for (const table of tables) {
  const safeTableName = table.name.replaceAll("\"", "\"\"");
  db.exec(`DROP TABLE IF EXISTS \"${safeTableName}\";`);
}

logger.info({ droppedTables: tables.length }, "Database schema cleared");

runMigrations();
runSeeds();
logger.info("Database reset completed");

