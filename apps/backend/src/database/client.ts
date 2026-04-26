// Legacy re-export kept for backwards-compatibility during SQLite → PostgreSQL migration.
// All new code should import directly from "./postgres".
export { pool as db, query, closeDatabase } from "./postgres";
