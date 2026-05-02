import { query } from "../../../database/postgres";
import type { GroundingCategory } from "../ecology.schemas";

export interface GroundingFactRow {
  id: string;
  domain_id: string;
  category: string;
  slug: string;
  title: string;
  fact_text: string;
  language: string;
  importance: number;
  entity_table: string | null;
  entity_id: string | null;
  source_id: string | null;
  citation_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  source_title: string | null;
  source_type: string | null;
  source_year: number | null;
}

export interface EcosystemRow {
  id: string;
  slug: string;
  title: string;
  ecosystem_kind: string;
  medium: string;
  description: string;
  operational_definition: string;
  biotic_summary: string | null;
  abiotic_summary: string | null;
  energy_flow_summary: string | null;
  biogeochemical_summary: string | null;
  ecological_interactions_summary: string | null;
  habitat_scope: string | null;
  ecoregion_label: string | null;
  is_active: boolean;
  climate_code: string | null;
  biome_title: string | null;
  realm_title: string | null;
}

export interface SpeciesRow {
  id: string;
  scientific_name: string;
  common_name: string | null;
  native_range: string | null;
  conservation_status: string | null;
  trophic_role_label: string | null;
  trophic_level: number | null;
  intraspecific_notes: string | null;
  ecosystem_slugs: string[];
}

export interface ArtificialProjectRow {
  id: string;
  slug: string;
  title: string;
  project_type: string;
  ecosystem_kind: string;
  description: string;
  objective: string;
  intervention_scale: string | null;
  caution_notes: string | null;
  is_active: boolean;
  target_ecosystem_slugs: string[];
}

export interface ModelingApproachRow {
  id: string;
  slug: string;
  title: string;
  family: string;
  description: string;
  primary_use: string | null;
  strengths: string | null;
  limitations: string | null;
  caution_notes: string | null;
  source_citation_key: string | null;
}

export interface AbioticFactorRow {
  id: string;
  slug: string;
  label: string;
  factor_group: string;
  unit_hint: string | null;
  description: string;
}

export interface ListGroundingFactsQuery {
  ecosystemSlugs?: string[];
  categories?: GroundingCategory[];
  maxFacts: number;
  language?: string;
}

export interface DomainCoverageStats {
  totalFacts: number;
  activeFacts: number;
  categoryCounts: Record<string, number>;
  ecosystemCount: number;
  sourceCount: number;
}

const DOMAIN_ID = "domain-environmental-ecology";

export class EcologicalGroundingRepository {
  async listGroundingFacts(q: ListGroundingFactsQuery): Promise<GroundingFactRow[]> {
    const params: unknown[] = [DOMAIN_ID];
    let idx = 2;

    const categoryCondition =
      q.categories && q.categories.length > 0
        ? `AND gf.category = ANY($${idx++}::text[])`
        : "";
    if (q.categories && q.categories.length > 0) {
      params.push(q.categories);
    }

    const ecosystemCondition =
      q.ecosystemSlugs && q.ecosystemSlugs.length > 0
        ? `AND (
            gf.category != 'ecosystem'
            OR EXISTS (
              SELECT 1 FROM ecosystems e
              WHERE e.id = gf.entity_id
                AND e.slug = ANY($${idx++}::text[])
            )
          )`
        : "";
    if (q.ecosystemSlugs && q.ecosystemSlugs.length > 0) {
      params.push(q.ecosystemSlugs);
    }

    // Requested ecosystem priority — boost facts linked to requested ecosystems
    const prioritySql =
      q.ecosystemSlugs && q.ecosystemSlugs.length > 0
        ? `CASE
            WHEN gf.entity_table = 'ecosystems'
              AND EXISTS (
                SELECT 1 FROM ecosystems e
                WHERE e.id = gf.entity_id AND e.slug = ANY($${idx++}::text[])
              ) THEN 0
            ELSE 1
          END,`
        : "";
    if (q.ecosystemSlugs && q.ecosystemSlugs.length > 0) {
      params.push(q.ecosystemSlugs);
    }

    params.push(q.maxFacts);
    const limitPlaceholder = `$${idx}`;

    const sql = `
      SELECT
        gf.id,
        gf.domain_id,
        gf.category::text,
        gf.slug,
        gf.title,
        gf.fact_text,
        gf.language,
        gf.importance,
        gf.entity_table,
        gf.entity_id,
        gf.source_id,
        gf.citation_key,
        gf.is_active,
        gf.created_at,
        gf.updated_at,
        s.title AS source_title,
        s.source_type::text AS source_type,
        s.year AS source_year
      FROM grounding_facts gf
      LEFT JOIN sources s ON s.id = gf.source_id
      WHERE gf.domain_id = $1
        AND gf.is_active = TRUE
        AND gf.source_id IS NOT NULL
        AND gf.citation_key IS NOT NULL
        ${categoryCondition}
        ${ecosystemCondition}
      ORDER BY
        ${prioritySql}
        gf.importance DESC,
        gf.updated_at DESC,
        gf.id
      LIMIT ${limitPlaceholder}
    `;

    const result = await query<GroundingFactRow>(sql, params);
    return result.rows;
  }

  async listEcosystems(filters: {
    medium?: string;
    kind?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: EcosystemRow[]; total: number }> {
    const params: unknown[] = [DOMAIN_ID];
    const conditions: string[] = ["e.domain_id = $1", "e.is_active = TRUE"];
    let idx = 2;

    if (filters.medium) {
      conditions.push(`e.medium = $${idx++}::ecosystem_medium_enum`);
      params.push(filters.medium);
    }
    if (filters.kind) {
      conditions.push(`e.ecosystem_kind = $${idx++}::ecosystem_kind_enum`);
      params.push(filters.kind);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM ecosystems e ${where}`,
      params
    );

    params.push(filters.limit, filters.offset);

    const rowsResult = await query<EcosystemRow>(
      `SELECT
        e.id, e.slug, e.title, e.ecosystem_kind::text, e.medium::text,
        e.description, e.operational_definition, e.biotic_summary,
        e.abiotic_summary, e.energy_flow_summary, e.biogeochemical_summary,
        e.ecological_interactions_summary, e.habitat_scope, e.ecoregion_label,
        e.is_active,
        ck.code AS climate_code,
        b.title AS biome_title,
        br.title AS realm_title
       FROM ecosystems e
       LEFT JOIN ecosystem_classifications ec ON ec.ecosystem_id = e.id
       LEFT JOIN climates_koppen ck ON ck.id = ec.climate_id
       LEFT JOIN biomes b ON b.id = ec.biome_id
       LEFT JOIN biogeographic_realms br ON br.id = ec.realm_id
       ${where}
       ORDER BY e.title
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    return {
      rows: rowsResult.rows,
      total: parseInt(countResult.rows[0]?.total ?? "0", 10),
    };
  }

  async findEcosystemBySlug(slug: string): Promise<EcosystemRow | null> {
    const result = await query<EcosystemRow>(
      `SELECT
        e.id, e.slug, e.title, e.ecosystem_kind::text, e.medium::text,
        e.description, e.operational_definition, e.biotic_summary,
        e.abiotic_summary, e.energy_flow_summary, e.biogeochemical_summary,
        e.ecological_interactions_summary, e.habitat_scope, e.ecoregion_label,
        e.is_active,
        ck.code AS climate_code,
        b.title AS biome_title,
        br.title AS realm_title
       FROM ecosystems e
       LEFT JOIN ecosystem_classifications ec ON ec.ecosystem_id = e.id
       LEFT JOIN climates_koppen ck ON ck.id = ec.climate_id
       LEFT JOIN biomes b ON b.id = ec.biome_id
       LEFT JOIN biogeographic_realms br ON br.id = ec.realm_id
       WHERE e.domain_id = $1 AND e.slug = $2 AND e.is_active = TRUE
       LIMIT 1`,
      [DOMAIN_ID, slug]
    );
    return result.rows[0] ?? null;
  }

  async listSpecies(filters: {
    ecosystemSlug?: string;
    trophicRole?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: SpeciesRow[]; total: number }> {
    const params: unknown[] = [DOMAIN_ID];
    const conditions: string[] = ["sp.domain_id = $1"];
    let idx = 2;

    if (filters.ecosystemSlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM ecosystem_species es
        JOIN ecosystems e ON e.id = es.ecosystem_id
        WHERE es.species_id = sp.id AND e.slug = $${idx++}
      )`);
      params.push(filters.ecosystemSlug);
    }
    if (filters.trophicRole) {
      conditions.push(`tr.slug = $${idx++}`);
      params.push(filters.trophicRole);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(DISTINCT sp.id) AS total
       FROM species sp
       LEFT JOIN trophic_roles tr ON tr.id = sp.trophic_role_id
       ${where}`,
      params
    );

    params.push(filters.limit, filters.offset);

    const rowsResult = await query<Omit<SpeciesRow, "ecosystem_slugs"> & { ecosystem_slugs_raw: string | null }>(
      `SELECT
        sp.id, sp.scientific_name, sp.common_name, sp.native_range,
        sp.conservation_status, sp.intraspecific_notes,
        tr.label AS trophic_role_label,
        tr.trophic_level,
        (
          SELECT string_agg(e.slug, ',')
          FROM ecosystem_species es
          JOIN ecosystems e ON e.id = es.ecosystem_id
          WHERE es.species_id = sp.id
        ) AS ecosystem_slugs_raw
       FROM species sp
       LEFT JOIN trophic_roles tr ON tr.id = sp.trophic_role_id
       ${where}
       ORDER BY sp.scientific_name
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const rows: SpeciesRow[] = rowsResult.rows.map((r) => ({
      id: r.id,
      scientific_name: r.scientific_name,
      common_name: r.common_name,
      native_range: r.native_range,
      conservation_status: r.conservation_status,
      trophic_role_label: r.trophic_role_label,
      trophic_level: r.trophic_level,
      intraspecific_notes: r.intraspecific_notes,
      ecosystem_slugs: r.ecosystem_slugs_raw ? r.ecosystem_slugs_raw.split(",") : [],
    }));

    return { rows, total: parseInt(countResult.rows[0]?.total ?? "0", 10) };
  }

  async listAbioticFactors(): Promise<AbioticFactorRow[]> {
    const result = await query<AbioticFactorRow>(
      `SELECT id, slug, label, factor_group::text, unit_hint, description
       FROM abiotic_factors
       WHERE domain_id = $1
       ORDER BY label`,
      [DOMAIN_ID]
    );
    return result.rows;
  }

  async listArtificialProjects(filters: {
    limit: number;
    offset: number;
  }): Promise<{ rows: ArtificialProjectRow[]; total: number }> {
    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM artificial_projects WHERE domain_id = $1 AND is_active = TRUE`,
      [DOMAIN_ID]
    );

    const rowsResult = await query<Omit<ArtificialProjectRow, "target_ecosystem_slugs"> & { target_slugs_raw: string | null }>(
      `SELECT
        ap.id, ap.slug, ap.title, ap.project_type::text, ap.ecosystem_kind::text,
        ap.description, ap.objective, ap.intervention_scale, ap.caution_notes, ap.is_active,
        (
          SELECT string_agg(e.slug, ',')
          FROM project_target_ecosystems pte
          JOIN ecosystems e ON e.id = pte.ecosystem_id
          WHERE pte.project_id = ap.id
        ) AS target_slugs_raw
       FROM artificial_projects ap
       WHERE ap.domain_id = $1 AND ap.is_active = TRUE
       ORDER BY ap.title
       LIMIT $2 OFFSET $3`,
      [DOMAIN_ID, filters.limit, filters.offset]
    );

    const rows: ArtificialProjectRow[] = rowsResult.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      project_type: r.project_type,
      ecosystem_kind: r.ecosystem_kind,
      description: r.description,
      objective: r.objective,
      intervention_scale: r.intervention_scale,
      caution_notes: r.caution_notes,
      is_active: r.is_active,
      target_ecosystem_slugs: r.target_slugs_raw ? r.target_slugs_raw.split(",") : [],
    }));

    return { rows, total: parseInt(countResult.rows[0]?.total ?? "0", 10) };
  }

  async listModelingApproaches(): Promise<ModelingApproachRow[]> {
    const result = await query<ModelingApproachRow>(
      `SELECT
        ma.id, ma.slug, ma.title, ma.family::text, ma.description,
        ma.primary_use, ma.strengths, ma.limitations, ma.caution_notes,
        s.citation_key AS source_citation_key
       FROM modeling_approaches ma
       LEFT JOIN sources s ON s.id = ma.source_id
       WHERE ma.domain_id = $1
       ORDER BY ma.title`,
      [DOMAIN_ID]
    );
    return result.rows;
  }

  async findArtificialProjectBySlug(slug: string): Promise<ArtificialProjectRow | null> {
    const result = await query<Omit<ArtificialProjectRow, "target_ecosystem_slugs"> & { target_slugs_raw: string | null }>(
      `SELECT
        ap.id, ap.slug, ap.title, ap.project_type::text, ap.ecosystem_kind::text,
        ap.description, ap.objective, ap.intervention_scale, ap.caution_notes, ap.is_active,
        (
          SELECT string_agg(e.slug, ',')
          FROM project_target_ecosystems pte
          JOIN ecosystems e ON e.id = pte.ecosystem_id
          WHERE pte.project_id = ap.id
        ) AS target_slugs_raw
       FROM artificial_projects ap
       WHERE ap.domain_id = $1 AND ap.slug = $2 AND ap.is_active = TRUE
       LIMIT 1`,
      [DOMAIN_ID, slug]
    );
    if (!result.rows[0]) return null;
    const r = result.rows[0];
    return {
      ...r,
      target_ecosystem_slugs: r.target_slugs_raw ? r.target_slugs_raw.split(",") : [],
    };
  }

  async getDomainCoverageStats(): Promise<DomainCoverageStats> {
    const [total, byCategory, ecosystemCount, sourceCount] = await Promise.all([
      query<{ total: string; active: string }>(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active = TRUE) AS active
         FROM grounding_facts WHERE domain_id = $1`,
        [DOMAIN_ID]
      ),
      query<{ category: string; cnt: string }>(
        `SELECT category::text, COUNT(*) AS cnt
         FROM grounding_facts WHERE domain_id = $1 AND is_active = TRUE
         GROUP BY category`,
        [DOMAIN_ID]
      ),
      query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt FROM ecosystems WHERE domain_id = $1 AND is_active = TRUE`,
        [DOMAIN_ID]
      ),
      query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt FROM sources WHERE domain_id = $1 AND is_active = TRUE`,
        [DOMAIN_ID]
      ),
    ]);

    const categoryCounts: Record<string, number> = {};
    byCategory.rows.forEach((row) => {
      categoryCounts[row.category] = parseInt(row.cnt, 10);
    });

    return {
      totalFacts: parseInt(total.rows[0]?.total ?? "0", 10),
      activeFacts: parseInt(total.rows[0]?.active ?? "0", 10),
      categoryCounts,
      ecosystemCount: parseInt(ecosystemCount.rows[0]?.cnt ?? "0", 10),
      sourceCount: parseInt(sourceCount.rows[0]?.cnt ?? "0", 10),
    };
  }
}

export const ecologicalGroundingRepository = new EcologicalGroundingRepository();
