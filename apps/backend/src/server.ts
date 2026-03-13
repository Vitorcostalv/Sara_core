import { createApp } from "./app";
import { env } from "./config/env";
import { runMigrations } from "./database/migrate";
import { logger } from "./logging/logger";

runMigrations();

const app = createApp();

app.listen(env.port, env.host, () => {
  logger.info({ host: env.host, port: env.port }, "Sara Core backend started");
});
