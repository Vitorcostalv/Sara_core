import pg from "pg";
import { env } from "../config/env";
import { logger } from "../logging/logger";

const { Pool } = pg;

export interface Queryable {
  query: pg.Pool["query"];
}

function removeSslModeFromConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function resolveSslOptions() {
  switch (env.databaseSslMode) {
    case "disable":
      return undefined;
    case "verify-full":
      return { rejectUnauthorized: true };
    case "require":
    default:
      return { rejectUnauthorized: false };
  }
}

export function createPgConnectionOptions(connectionString: string) {
  return {
    connectionString: removeSslModeFromConnectionString(connectionString),
    ssl: resolveSslOptions(),
  };
}

export const pool = new Pool({
  ...createPgConnectionOptions(env.databaseUrl),
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ message: err.message, code: (err as NodeJS.ErrnoException).code }, "Unexpected PostgreSQL pool error");
});

pool.on("connect", () => {
  logger.debug(
    { poolTotal: pool.totalCount, poolIdle: pool.idleCount, poolWaiting: pool.waitingCount },
    "PostgreSQL pool: new physical connection established"
  );
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(sql, params);
}

export async function withTransaction<T>(callback: (db: Queryable) => Promise<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
