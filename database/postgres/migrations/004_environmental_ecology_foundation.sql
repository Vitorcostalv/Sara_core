-- Environmental ecology foundation
-- Part 1: scientific grounding reflected in relational schema.

CREATE TYPE source_type_enum AS ENUM (
  'book',
  'article',
  'report',
  'dataset',
  'website',
  'thesis',
  'standard',
  'internal_document'
);

CREATE TYPE grounding_category_enum AS ENUM (
  'concept',
  'ecosystem',
  'formation-process',
  'abiotic-factor',
  'species',
  'artificial-project',
  'modeling-approach',
  'reference'
);

CREATE TYPE ecosystem_kind_enum AS ENUM (
  'natural',
  'restored',
  'artificial',
  'improved',
  'novel',
  'closed',
  'theoretical'
);

CREATE TYPE ecosystem_medium_enum AS ENUM (
  'terrestrial',
  'freshwater',
  'marine',
  'brackish',
  'subterranean',
  'urban',
  'mixed'
);

CREATE TYPE taxon_rank_enum AS ENUM (
  'domain',
  'kingdom',
  'phylum',
  'class',
  'order',
  'family',
  'genus',
  'species',
  'subspecies',
  'ecotype',
  'population',
  'metapopulation',
  'strain',
  'breed',
  'cultivar'
);

CREATE TYPE taxon_status_enum AS ENUM (
  'accepted',
  'synonym',
  'provisional'
);

CREATE TYPE interaction_type_enum AS ENUM (
  'predation',
  'competition',
  'mutualism',
  'commensalism',
  'parasitism',
  'facilitation',
  'engineering',
  'pollination',
  'seed-dispersal',
  'decomposition'
);

CREATE TYPE project_type_enum AS ENUM (
  'constructed-wetland',
  'coral-restoration',
  'artificial-reef',
  'agroforestry',
  'closed-biosphere',
  'urban-restoration',
  'enhanced-urban-ecosystem',
  'permaculture',
  'syntropic-agriculture',
  'rewilding',
  'novel-ecosystem',
  'theoretical-terraforming',
  'genetic-intervention-reference'
);

CREATE TYPE modeling_family_enum AS ENUM (
  'procedural-generation',
  'agent-based-modeling',
  'system-dynamics',
  'machine-learning',
  'geospatial-modeling',
  'statistical-modeling',
  'digital-twin',
  'knowledge-grounding',
  'simulation'
);

CREATE TYPE metric_type_enum AS ENUM (
  'biodiversity',
  'productivity',
  'hydrology',
  'soil',
  'climate',
  'water-quality',
  'restoration',
  'resilience',
  'connectivity',
  'simulation',
  'grounding-quality'
);

CREATE TYPE factor_group_enum AS ENUM (
  'climate',
  'chemistry',
  'hydrology',
  'geomorphology',
  'edaphic',
  'radiation',
  'topography',
  'substrate'
);

CREATE TYPE method_family_enum AS ENUM (
  'restoration',
  'rehabilitation',
  'rewilding',
  'biomimicry',
  'constructed-system',
  'agroecology',
  'urban-ecology',
  'genetic-reference',
  'theoretical'
);

CREATE TYPE fact_link_type_enum AS ENUM (
  'broader',
  'narrower',
  'related',
  'supports',
  'applies-to',
  'implemented-by',
  'modeled-by'
);

CREATE TYPE population_unit_enum AS ENUM (
  'population',
  'metapopulation',
  'subspecies',
  'ecotype',
  'strain',
  'breed',
  'cultivar'
);

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z][a-z0-9_]*$'),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  citation_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  source_type source_type_enum NOT NULL,
  publisher TEXT,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(authors) = 'array'),
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1500 AND 2100),
  doi TEXT,
  url TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  abstract_text TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(abstract_text, ''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS source_topics (
  source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  topic_slug TEXT NOT NULL CHECK (topic_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  topic_label TEXT NOT NULL,
  topic_notes TEXT,
  PRIMARY KEY (source_id, topic_slug)
);

CREATE TABLE IF NOT EXISTS biomes (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  whittaker_group TEXT NOT NULL,
  climate_signature TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS climates_koppen (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  thermal_group TEXT NOT NULL,
  moisture_pattern TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS life_zones_holdridge (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  biotemperature_band TEXT NOT NULL,
  precipitation_band TEXT NOT NULL,
  pet_ratio_band TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biogeographic_realms (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trophic_roles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  trophic_level SMALLINT CHECK (trophic_level IS NULL OR trophic_level BETWEEN 0 AND 9),
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metrics (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  metric_type metric_type_enum NOT NULL,
  unit_hint TEXT,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS abiotic_factors (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  factor_group factor_group_enum NOT NULL,
  unit_hint TEXT,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS formation_processes (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  process_family TEXT NOT NULL,
  temporal_scale TEXT,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS restoration_methods (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label TEXT NOT NULL,
  method_family method_family_enum NOT NULL,
  description TEXT NOT NULL,
  caution_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS modeling_approaches (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  family modeling_family_enum NOT NULL,
  description TEXT NOT NULL,
  primary_use TEXT,
  strengths TEXT,
  limitations TEXT,
  caution_notes TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS taxa (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  parent_taxon_id TEXT REFERENCES taxa(id) ON DELETE SET NULL,
  scientific_name TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  rank taxon_rank_enum NOT NULL,
  authorship TEXT,
  common_name TEXT,
  taxon_status taxon_status_enum NOT NULL DEFAULT 'accepted',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (rank, canonical_name)
);

CREATE TABLE IF NOT EXISTS species (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  accepted_taxon_id TEXT NOT NULL UNIQUE REFERENCES taxa(id) ON DELETE CASCADE,
  scientific_name TEXT NOT NULL,
  common_name TEXT,
  native_range TEXT,
  conservation_status TEXT,
  trophic_role_id TEXT REFERENCES trophic_roles(id) ON DELETE SET NULL,
  intraspecific_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(scientific_name, '') || ' ' || coalesce(common_name, '') || ' ' || coalesce(native_range, ''))
  ) STORED,
  UNIQUE (domain_id, scientific_name)
);

CREATE TABLE IF NOT EXISTS ecosystems (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  ecosystem_kind ecosystem_kind_enum NOT NULL,
  medium ecosystem_medium_enum NOT NULL,
  description TEXT NOT NULL,
  operational_definition TEXT NOT NULL,
  biotic_summary TEXT,
  abiotic_summary TEXT,
  energy_flow_summary TEXT,
  biogeochemical_summary TEXT,
  ecological_interactions_summary TEXT,
  habitat_scope TEXT,
  ecoregion_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(operational_definition, '') || ' ' ||
      coalesce(biotic_summary, '') || ' ' ||
      coalesce(abiotic_summary, '')
    )
  ) STORED,
  UNIQUE (domain_id, slug)
);

CREATE TABLE IF NOT EXISTS ecosystem_classifications (
  id TEXT PRIMARY KEY,
  ecosystem_id TEXT NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
  biome_id TEXT REFERENCES biomes(id) ON DELETE SET NULL,
  climate_id TEXT REFERENCES climates_koppen(id) ON DELETE SET NULL,
  life_zone_id TEXT REFERENCES life_zones_holdridge(id) ON DELETE SET NULL,
  realm_id TEXT REFERENCES biogeographic_realms(id) ON DELETE SET NULL,
  ecoregion_label TEXT,
  habitat_label TEXT,
  classification_notes TEXT,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (ecosystem_id, biome_id, climate_id, life_zone_id, realm_id)
);

CREATE TABLE IF NOT EXISTS populations (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  ecosystem_id TEXT REFERENCES ecosystems(id) ON DELETE SET NULL,
  unit_type population_unit_enum NOT NULL,
  label TEXT NOT NULL,
  location_notes TEXT,
  genetic_notes TEXT,
  status_notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (species_id, label)
);

CREATE TABLE IF NOT EXISTS ecosystem_species (
  id TEXT PRIMARY KEY,
  ecosystem_id TEXT NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
  species_id TEXT NOT NULL REFERENCES species(id) ON DELETE CASCADE,
  trophic_role_id TEXT REFERENCES trophic_roles(id) ON DELETE SET NULL,
  ecological_function TEXT,
  native_status TEXT,
  abundance_qualifier TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (ecosystem_id, species_id)
);

CREATE TABLE IF NOT EXISTS ecosystem_factors (
  id TEXT PRIMARY KEY,
  ecosystem_id TEXT NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
  abiotic_factor_id TEXT NOT NULL REFERENCES abiotic_factors(id) ON DELETE CASCADE,
  typical_min NUMERIC,
  typical_max NUMERIC,
  unit TEXT,
  seasonality TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (ecosystem_id, abiotic_factor_id)
);

CREATE TABLE IF NOT EXISTS biotic_interactions (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  interaction_type interaction_type_enum NOT NULL,
  source_species_id TEXT REFERENCES species(id) ON DELETE SET NULL,
  target_species_id TEXT REFERENCES species(id) ON DELETE SET NULL,
  source_ecosystem_id TEXT REFERENCES ecosystems(id) ON DELETE SET NULL,
  target_ecosystem_id TEXT REFERENCES ecosystems(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  interaction_strength NUMERIC(5,2),
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (
    source_species_id IS NOT NULL OR
    target_species_id IS NOT NULL OR
    source_ecosystem_id IS NOT NULL OR
    target_ecosystem_id IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS ecosystem_processes (
  id TEXT PRIMARY KEY,
  ecosystem_id TEXT NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
  formation_process_id TEXT NOT NULL REFERENCES formation_processes(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  evidence_source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (ecosystem_id, formation_process_id, role_label)
);

CREATE TABLE IF NOT EXISTS artificial_projects (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL,
  project_type project_type_enum NOT NULL,
  ecosystem_kind ecosystem_kind_enum NOT NULL,
  description TEXT NOT NULL,
  objective TEXT NOT NULL,
  intervention_scale TEXT,
  caution_notes TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain_id, slug)
);

CREATE TABLE IF NOT EXISTS project_target_ecosystems (
  project_id TEXT NOT NULL REFERENCES artificial_projects(id) ON DELETE CASCADE,
  ecosystem_id TEXT NOT NULL REFERENCES ecosystems(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  notes TEXT,
  PRIMARY KEY (project_id, ecosystem_id)
);

CREATE TABLE IF NOT EXISTS project_metrics (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES artificial_projects(id) ON DELETE CASCADE,
  metric_id TEXT NOT NULL REFERENCES metrics(id) ON DELETE CASCADE,
  target_description TEXT NOT NULL,
  target_value NUMERIC,
  unit TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  UNIQUE (project_id, metric_id, target_description)
);

CREATE TABLE IF NOT EXISTS grounding_facts (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  category grounding_category_enum NOT NULL,
  slug TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:[.-][a-z0-9]+)*$'),
  title TEXT NOT NULL,
  fact_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  importance SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  entity_table TEXT CHECK (
    entity_table IS NULL OR entity_table IN (
      'domains',
      'sources',
      'ecosystems',
      'ecosystem_classifications',
      'species',
      'abiotic_factors',
      'formation_processes',
      'restoration_methods',
      'artificial_projects',
      'modeling_approaches',
      'biomes'
    )
  ),
  entity_id TEXT,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  citation_key TEXT,
  doi TEXT,
  url TEXT,
  publisher TEXT,
  authors JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(authors) = 'array'),
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1500 AND 2100),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(fact_text, '') || ' ' || coalesce(slug, ''))
  ) STORED,
  UNIQUE (domain_id, category, slug)
);

CREATE TABLE IF NOT EXISTS fact_links (
  id TEXT PRIMARY KEY,
  fact_id TEXT NOT NULL REFERENCES grounding_facts(id) ON DELETE CASCADE,
  linked_fact_id TEXT NOT NULL REFERENCES grounding_facts(id) ON DELETE CASCADE,
  relation_type fact_link_type_enum NOT NULL,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  CHECK (fact_id <> linked_fact_id),
  UNIQUE (fact_id, linked_fact_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_sources_domain_id ON sources(domain_id);
CREATE INDEX IF NOT EXISTS idx_sources_source_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_year ON sources(year);
CREATE INDEX IF NOT EXISTS idx_sources_is_active ON sources(is_active);
CREATE INDEX IF NOT EXISTS idx_sources_search_vector ON sources USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_sources_metadata ON sources USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_metrics_domain_id ON metrics(domain_id);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_type ON metrics(metric_type);

CREATE INDEX IF NOT EXISTS idx_abiotic_factors_domain_id ON abiotic_factors(domain_id);
CREATE INDEX IF NOT EXISTS idx_abiotic_factors_group ON abiotic_factors(factor_group);

CREATE INDEX IF NOT EXISTS idx_formation_processes_domain_id ON formation_processes(domain_id);
CREATE INDEX IF NOT EXISTS idx_formation_processes_family ON formation_processes(process_family);

CREATE INDEX IF NOT EXISTS idx_restoration_methods_domain_id ON restoration_methods(domain_id);
CREATE INDEX IF NOT EXISTS idx_restoration_methods_family ON restoration_methods(method_family);

CREATE INDEX IF NOT EXISTS idx_modeling_approaches_domain_id ON modeling_approaches(domain_id);
CREATE INDEX IF NOT EXISTS idx_modeling_approaches_family ON modeling_approaches(family);
CREATE INDEX IF NOT EXISTS idx_modeling_approaches_source_id ON modeling_approaches(source_id);
CREATE INDEX IF NOT EXISTS idx_modeling_approaches_metadata ON modeling_approaches USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_taxa_domain_id ON taxa(domain_id);
CREATE INDEX IF NOT EXISTS idx_taxa_parent_taxon_id ON taxa(parent_taxon_id);
CREATE INDEX IF NOT EXISTS idx_taxa_rank ON taxa(rank);

CREATE INDEX IF NOT EXISTS idx_species_domain_id ON species(domain_id);
CREATE INDEX IF NOT EXISTS idx_species_trophic_role_id ON species(trophic_role_id);
CREATE INDEX IF NOT EXISTS idx_species_search_vector ON species USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_species_metadata ON species USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_ecosystems_domain_id ON ecosystems(domain_id);
CREATE INDEX IF NOT EXISTS idx_ecosystems_kind ON ecosystems(ecosystem_kind);
CREATE INDEX IF NOT EXISTS idx_ecosystems_medium ON ecosystems(medium);
CREATE INDEX IF NOT EXISTS idx_ecosystems_is_active ON ecosystems(is_active);
CREATE INDEX IF NOT EXISTS idx_ecosystems_search_vector ON ecosystems USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_ecosystems_metadata ON ecosystems USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_ecosystem_classifications_biome_id ON ecosystem_classifications(biome_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_classifications_climate_id ON ecosystem_classifications(climate_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_classifications_life_zone_id ON ecosystem_classifications(life_zone_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_classifications_realm_id ON ecosystem_classifications(realm_id);

CREATE INDEX IF NOT EXISTS idx_populations_species_id ON populations(species_id);
CREATE INDEX IF NOT EXISTS idx_populations_ecosystem_id ON populations(ecosystem_id);
CREATE INDEX IF NOT EXISTS idx_populations_unit_type ON populations(unit_type);

CREATE INDEX IF NOT EXISTS idx_ecosystem_species_species_id ON ecosystem_species(species_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_species_trophic_role_id ON ecosystem_species(trophic_role_id);

CREATE INDEX IF NOT EXISTS idx_ecosystem_factors_factor_id ON ecosystem_factors(abiotic_factor_id);

CREATE INDEX IF NOT EXISTS idx_biotic_interactions_domain_id ON biotic_interactions(domain_id);
CREATE INDEX IF NOT EXISTS idx_biotic_interactions_type ON biotic_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_biotic_interactions_source_id ON biotic_interactions(source_id);

CREATE INDEX IF NOT EXISTS idx_ecosystem_processes_formation_process_id ON ecosystem_processes(formation_process_id);
CREATE INDEX IF NOT EXISTS idx_ecosystem_processes_evidence_source_id ON ecosystem_processes(evidence_source_id);

CREATE INDEX IF NOT EXISTS idx_artificial_projects_domain_id ON artificial_projects(domain_id);
CREATE INDEX IF NOT EXISTS idx_artificial_projects_type ON artificial_projects(project_type);
CREATE INDEX IF NOT EXISTS idx_artificial_projects_kind ON artificial_projects(ecosystem_kind);
CREATE INDEX IF NOT EXISTS idx_artificial_projects_source_id ON artificial_projects(source_id);
CREATE INDEX IF NOT EXISTS idx_artificial_projects_is_active ON artificial_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_artificial_projects_metadata ON artificial_projects USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_project_metrics_project_id ON project_metrics(project_id);
CREATE INDEX IF NOT EXISTS idx_project_metrics_metric_id ON project_metrics(metric_id);

CREATE INDEX IF NOT EXISTS idx_grounding_facts_source_id ON grounding_facts(source_id);
CREATE INDEX IF NOT EXISTS idx_grounding_facts_importance ON grounding_facts(importance);
CREATE INDEX IF NOT EXISTS idx_grounding_facts_is_active ON grounding_facts(is_active);
CREATE INDEX IF NOT EXISTS idx_grounding_facts_category ON grounding_facts(category);
CREATE INDEX IF NOT EXISTS idx_grounding_facts_entity ON grounding_facts(entity_table, entity_id);
CREATE INDEX IF NOT EXISTS idx_grounding_facts_search_vector ON grounding_facts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_grounding_facts_metadata ON grounding_facts USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_fact_links_linked_fact_id ON fact_links(linked_fact_id);
