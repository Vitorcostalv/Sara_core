ALTER TABLE grounding_facts
DROP CONSTRAINT IF EXISTS grounding_facts_entity_table_check;

ALTER TABLE grounding_facts
ADD CONSTRAINT grounding_facts_entity_table_check
CHECK (
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
);
