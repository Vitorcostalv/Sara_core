# Database

Pasta de schema, correções incrementais e seeds do PostgreSQL usado pelo runtime.

- `postgres/migrations/`: migrations SQL versionadas
- `schema/`: documentação do modelo de dados
- `seeds/`: dados idempotentes para dev/local

## Stack de banco

- runtime: PostgreSQL / Neon
- conexão: `pg` puro no backend
- migrations: `tsx src/database/migrate-postgres.ts`
- seeds: `tsx src/database/seed-postgres.ts`
- reset: `tsx src/database/reset-postgres.ts`

Observação operacional:
- `DATABASE_URL` e `DIRECT_DATABASE_URL` são as fontes de conexão
- `DATABASE_SSL_MODE` controla SSL sem depender de `sslmode` na URL

## Schema ecológico

Migrations (`postgres/migrations/`):
- `004_environmental_ecology_foundation.sql`: cria todas as tabelas e enums do domínio
- `005_grounding_facts_entity_table_whitelist_fix.sql`: ajuste de whitelist de entidades em `grounding_facts`

Tabelas canônicas:
- taxonomia/classificação: `domains`, `biomes`, `climates_koppen`, `life_zones_holdridge`, `biogeographic_realms`
- ecossistemas: `ecosystems`, `ecosystem_classifications`, `ecosystem_factors`, `ecosystem_processes`, `ecosystem_species`
- biota: `taxa`, `species`, `populations`, `trophic_roles`, `biotic_interactions`
- abióticos/processos: `abiotic_factors`, `formation_processes`, `restoration_methods`, `metrics`
- projetos artificiais: `artificial_projects`, `project_target_ecosystems`, `project_metrics`, `modeling_approaches`
- grounding: `grounding_facts`, `sources`, `source_topics`, `fact_links`

## Seeds atuais

- `005_seed_environmental_ecology_foundation.sql`: taxonomias, entidades ecológicas, fontes e `grounding_facts` canônicos
- `006_seed_ecological_part2.sql`: extensão do domínio (mais interações, processos e `grounding_facts`)
- `007_seed_biome_enrichment.sql`: fatos detalhados por bioma (cerrado, manguezal, caatinga, pantanal, mata-atlântica, ...)

## Convenção de grounding

- `grounding_facts` é a base canônica de fatos ambientais, com proveniência via `sources` e `fact_links`
- a consulta grounded (`/api/v1/ecology/generate`) usa exclusivamente essas tabelas

Documentação detalhada:
- `database/schema/environmental-ecology-foundation.md`
- `docs/conventions/ecosystem-facts.md`

## Comandos

```bash
npm run db:migrate
npm run db:seed
npm run db:check
npm run db:reset
```

Observação:
- `db:reset` remove o schema atual em ambiente local/dev
- para reconstruir a base, rode `db:migrate` e depois `db:seed`
