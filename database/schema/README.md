# Sara Core Data Model

## Camadas atuais

### Core app tables

- `user_profile`
- `facts`
- `tasks`
- `conversation_turns`
- `tool_calls`

Essas tabelas sustentam o MVP atual do produto.

### Environmental ecology foundation

A partir da migration `004_environmental_ecology_foundation.sql`, o repositorio passa a ter uma camada relacional canônica para ecologia ambiental real.

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

## Compatibilidade

- `grounding_facts` e a base canônica nova para o dominio `environmental_ecology`
- `facts` continua sendo a camada de compatibilidade do grounding operacional atual
- `internal:project-context` e `reference:environmental-practices` ficam fora do grounding ecologico principal

## Convencoes

- grounding legacy em `facts`: `docs/conventions/ecosystem-facts.md`
- dominio cientifico novo: `database/schema/environmental-ecology-foundation.md`
