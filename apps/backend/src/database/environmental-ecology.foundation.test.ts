import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "./postgres";

const requiredTables = [
  "domains",
  "sources",
  "source_topics",
  "biomes",
  "climates_koppen",
  "life_zones_holdridge",
  "biogeographic_realms",
  "ecosystems",
  "ecosystem_classifications",
  "taxa",
  "species",
  "populations",
  "abiotic_factors",
  "biotic_interactions",
  "trophic_roles",
  "formation_processes",
  "ecosystem_processes",
  "artificial_projects",
  "restoration_methods",
  "modeling_approaches",
  "metrics",
  "grounding_facts",
  "fact_links",
  "ecosystem_species",
  "ecosystem_factors",
  "project_target_ecosystems",
  "project_metrics",
] as const;

test("environmental ecology foundation: required tables exist", async () => {
  const result = await pool.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [requiredTables]
  );

  assert.deepEqual(
    result.rows.map((row) => row.table_name).sort(),
    [...requiredTables].sort()
  );
});

test("environmental ecology foundation: canonical domain exists and is active", async () => {
  const result = await pool.query<{ id: string; slug: string; is_active: boolean }>(
    `SELECT id, slug, is_active
     FROM domains
     WHERE slug = 'environmental_ecology'`
  );

  assert.equal(result.rowCount, 1);
  assert.equal(result.rows[0]?.id, "domain-environmental-ecology");
  assert.equal(result.rows[0]?.is_active, true);
});

test("environmental ecology foundation: base seed counts are present", async () => {
  const result = await pool.query<{ name: string; count: string }>(`
    SELECT 'sources' AS name, COUNT(*)::text AS count FROM sources
    UNION ALL SELECT 'ecosystems', COUNT(*)::text FROM ecosystems
    UNION ALL SELECT 'abiotic_factors', COUNT(*)::text FROM abiotic_factors
    UNION ALL SELECT 'formation_processes', COUNT(*)::text FROM formation_processes
    UNION ALL SELECT 'artificial_projects', COUNT(*)::text FROM artificial_projects
    UNION ALL SELECT 'modeling_approaches', COUNT(*)::text FROM modeling_approaches
    UNION ALL SELECT 'grounding_facts', COUNT(*)::text FROM grounding_facts
  `);

  const counts = new Map(result.rows.map((row) => [row.name, Number.parseInt(row.count, 10)]));

  assert.ok((counts.get("sources") ?? 0) >= 15);
  assert.ok((counts.get("ecosystems") ?? 0) >= 21);
  assert.ok((counts.get("abiotic_factors") ?? 0) >= 13);
  assert.ok((counts.get("formation_processes") ?? 0) >= 7);
  assert.ok((counts.get("artificial_projects") ?? 0) >= 9);
  assert.ok((counts.get("modeling_approaches") ?? 0) >= 10);
  assert.ok((counts.get("grounding_facts") ?? 0) >= 90);
});

test("environmental ecology foundation: grounding categories and provenance are complete", async () => {
  const categoryResult = await pool.query<{ category: string }>(`
    SELECT DISTINCT category::text AS category
    FROM grounding_facts
    ORDER BY category::text
  `);

  assert.deepEqual(categoryResult.rows.map((row) => row.category), [
    "abiotic-factor",
    "artificial-project",
    "concept",
    "ecosystem",
    "formation-process",
    "modeling-approach",
    "reference",
    "species",
  ]);

  const provenanceResult = await pool.query<{ count: string }>(`
    SELECT COUNT(*)::text AS count
    FROM grounding_facts
    WHERE source_id IS NULL
       OR citation_key IS NULL
  `);

  assert.equal(
    Number.parseInt(provenanceResult.rows[0]?.count ?? "0", 10),
    0,
    "All grounding_facts must keep source provenance"
  );
});

process.on("exit", () => {
  void pool.end();
});
