# Sara Core Data Model

## Environmental ecology foundation

A migration `004_environmental_ecology_foundation.sql` define a camada relacional canônica para ecologia ambiental, e `005_grounding_facts_entity_table_whitelist_fix.sql` ajusta a whitelist de entidades de `grounding_facts`.

Resumo:
- `domains`, `sources`, `source_topics`
- `biomes`, `climates_koppen`, `life_zones_holdridge`, `biogeographic_realms`
- `ecosystems`, `ecosystem_classifications`
- `taxa`, `species`, `populations`
- `abiotic_factors`, `trophic_roles`, `biotic_interactions`
- `formation_processes`, `ecosystem_processes`
- `restoration_methods`, `artificial_projects`, `project_target_ecosystems`, `project_metrics`
- `modeling_approaches`, `metrics`
- `grounding_facts`, `fact_links`

Documento detalhado:
- `database/schema/environmental-ecology-foundation.md`

## Grounding

- `grounding_facts` é a base canônica de fatos do domínio `environmental_ecology`, com proveniência via `sources` e `fact_links`.

## Convencoes

- convenções de fatos/grounding: `docs/conventions/ecosystem-facts.md`
- domínio científico detalhado: `database/schema/environmental-ecology-foundation.md`
