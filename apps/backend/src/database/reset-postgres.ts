import pg from "pg";
import { env } from "../config/env";
import { logger } from "../logging/logger";
import { createPgConnectionOptions } from "./postgres";

async function resetPostgres(): Promise<void> {
  if (env.nodeEnv === "production") {
    logger.error("reset-postgres must not run in production. Set NODE_ENV=development or test.");
    process.exit(1);
  }

  const client = new pg.Client({
    ...createPgConnectionOptions(env.directDatabaseUrl ?? env.databaseUrl),
  });

  await client.connect();
  logger.info("Connected for database reset");

  try {
    await client.query("BEGIN");

    await client.query(`
      DROP TABLE IF EXISTS fact_links CASCADE;
      DROP TABLE IF EXISTS grounding_facts CASCADE;
      DROP TABLE IF EXISTS project_metrics CASCADE;
      DROP TABLE IF EXISTS project_target_ecosystems CASCADE;
      DROP TABLE IF EXISTS artificial_projects CASCADE;
      DROP TABLE IF EXISTS ecosystem_processes CASCADE;
      DROP TABLE IF EXISTS biotic_interactions CASCADE;
      DROP TABLE IF EXISTS ecosystem_factors CASCADE;
      DROP TABLE IF EXISTS ecosystem_species CASCADE;
      DROP TABLE IF EXISTS populations CASCADE;
      DROP TABLE IF EXISTS ecosystem_classifications CASCADE;
      DROP TABLE IF EXISTS ecosystems CASCADE;
      DROP TABLE IF EXISTS species CASCADE;
      DROP TABLE IF EXISTS taxa CASCADE;
      DROP TABLE IF EXISTS modeling_approaches CASCADE;
      DROP TABLE IF EXISTS restoration_methods CASCADE;
      DROP TABLE IF EXISTS formation_processes CASCADE;
      DROP TABLE IF EXISTS abiotic_factors CASCADE;
      DROP TABLE IF EXISTS metrics CASCADE;
      DROP TABLE IF EXISTS trophic_roles CASCADE;
      DROP TABLE IF EXISTS biogeographic_realms CASCADE;
      DROP TABLE IF EXISTS life_zones_holdridge CASCADE;
      DROP TABLE IF EXISTS climates_koppen CASCADE;
      DROP TABLE IF EXISTS biomes CASCADE;
      DROP TABLE IF EXISTS source_topics CASCADE;
      DROP TABLE IF EXISTS sources CASCADE;
      DROP TABLE IF EXISTS domains CASCADE;
      DROP TABLE IF EXISTS tool_calls CASCADE;
      DROP TABLE IF EXISTS conversation_turns CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS facts CASCADE;
      DROP TABLE IF EXISTS user_profile CASCADE;
      DROP TABLE IF EXISTS schema_migrations CASCADE;

      DROP TYPE IF EXISTS population_unit_enum CASCADE;
      DROP TYPE IF EXISTS fact_link_type_enum CASCADE;
      DROP TYPE IF EXISTS method_family_enum CASCADE;
      DROP TYPE IF EXISTS factor_group_enum CASCADE;
      DROP TYPE IF EXISTS metric_type_enum CASCADE;
      DROP TYPE IF EXISTS modeling_family_enum CASCADE;
      DROP TYPE IF EXISTS project_type_enum CASCADE;
      DROP TYPE IF EXISTS interaction_type_enum CASCADE;
      DROP TYPE IF EXISTS taxon_status_enum CASCADE;
      DROP TYPE IF EXISTS taxon_rank_enum CASCADE;
      DROP TYPE IF EXISTS ecosystem_medium_enum CASCADE;
      DROP TYPE IF EXISTS ecosystem_kind_enum CASCADE;
      DROP TYPE IF EXISTS grounding_category_enum CASCADE;
      DROP TYPE IF EXISTS source_type_enum CASCADE;
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
