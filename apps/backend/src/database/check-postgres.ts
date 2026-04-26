import pg from "pg";
import { env } from "../config/env";

async function checkConnection(): Promise<void> {
  const client = new pg.Client({
    connectionString: env.directDatabaseUrl ?? env.databaseUrl,
    ssl: env.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const result = await client.query<{ ok: number }>("SELECT 1 AS ok");
    if (result.rows[0]?.ok === 1) {
      console.log("PostgreSQL connection OK — Neon is reachable.");
    } else {
      console.error("Unexpected result from SELECT 1.");
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

checkConnection().catch((err) => {
  console.error("PostgreSQL connection FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
