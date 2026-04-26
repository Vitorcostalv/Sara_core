import pg from "pg";
import { env } from "../config/env";
import { logger } from "../logging/logger";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ message: err.message, code: (err as NodeJS.ErrnoException).code }, "Unexpected PostgreSQL pool error");
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
