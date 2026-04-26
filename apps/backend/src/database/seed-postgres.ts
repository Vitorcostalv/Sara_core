import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { env } from "../config/env";
import { logger } from "../logging/logger";

async function runSeedsPostgres(): Promise<void> {
  const client = new pg.Client({
    connectionString: env.directDatabaseUrl ?? env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  logger.info("Connected for seeding");

  try {
    const seedDir = path.resolve(env.repositoryRoot, "database", "seeds");

    if (!fs.existsSync(seedDir)) {
      logger.warn({ seedDir }, "Seed directory not found; skipping seeds");
      return;
    }

    const files = fs
      .readdirSync(seedDir)
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of files) {
      const sql = fs.readFileSync(path.resolve(seedDir, fileName), "utf8");

      if (sql.trim().length === 0) {
        logger.debug({ fileName }, "Skipping empty seed file");
        continue;
      }

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("COMMIT");
        logger.info({ fileName }, "Applied seed");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(
          `Seed failed for ${fileName}: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err }
        );
      }
    }

    logger.info("All seeds completed");
  } finally {
    await client.end();
  }
}

runSeedsPostgres().catch((err) => {
  logger.error({ message: err instanceof Error ? err.message : String(err) }, "Seed error");
  process.exit(1);
});
