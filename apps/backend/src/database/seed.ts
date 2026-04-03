import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { logger } from "../logging/logger";
import { db } from "./client";

export function runSeeds(): void {
  const seedDir = path.resolve(env.repositoryRoot, "database", "seeds");

  if (!fs.existsSync(seedDir)) {
    logger.warn({ seedDir }, "Seed directory not found; skipping seeds");
    return;
  }

  const files = fs
    .readdirSync(seedDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of files) {
    const absoluteFile = path.resolve(seedDir, fileName);
    const sql = fs.readFileSync(absoluteFile, "utf8");

    if (sql.trim().length === 0) {
      logger.debug({ fileName }, "Skipping empty seed file");
      continue;
    }

    const transaction = db.transaction(() => {
      db.exec(sql);
    });

    transaction();
    logger.info({ fileName }, "Applied seed");
  }
}

if (require.main === module) {
  runSeeds();
  logger.info("Seeds completed");
}
