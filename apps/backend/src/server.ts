import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./logging/logger";

function startServer(): void {
  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    logger.info({ host: env.host, port: env.port }, "Sara Core backend started");
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      logger.fatal({ host: env.host, port: env.port }, "Backend port is already in use");
    } else {
      logger.fatal({ err: error }, "Failed to start backend server");
    }

    process.exit(1);
  });
}

try {
  startServer();
} catch (error) {
  logger.fatal({ err: error }, "Backend crashed during bootstrap");
  process.exit(1);
}
