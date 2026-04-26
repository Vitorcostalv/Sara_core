import pg from "pg";
import { env } from "../config/env";
import { logger } from "../logging/logger";

async function resetPostgres(): Promise<void> {
  if (env.nodeEnv === "production") {
    logger.error("reset-postgres must not run in production. Set NODE_ENV=development or test.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: env.directDatabaseUrl ?? env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  logger.info("Connected for database reset");

  try {
    await client.query("BEGIN");

    await client.query(`
      DROP TABLE IF EXISTS tool_calls CASCADE;
      DROP TABLE IF EXISTS conversation_turns CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS facts CASCADE;
      DROP TABLE IF EXISTS user_profile CASCADE;
      DROP TABLE IF EXISTS schema_migrations CASCADE;
    `);

    await client.query("COMMIT");
    logger.info("All tables dropped");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

resetPostgres()
  .then(() => {
    logger.info("Database reset completed — run db:migrate and db:seed to reinitialize");
  })
  .catch((err) => {
    logger.error({ message: err instanceof Error ? err.message : String(err) }, "Reset error");
    process.exit(1);
  });
