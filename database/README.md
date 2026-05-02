# Database

Pasta de schema, correcoes incrementais e seeds do PostgreSQL usado pelo runtime atual.

- `postgres/migrations/`: migrations SQL versionadas do runtime real
- `schema/`: documentacao do modelo de dados
- `seeds/`: dados idempotentes para dev/local

## Stack real de banco

- runtime: PostgreSQL / Neon
- conexao: `pg` puro no backend
- migrations: `tsx src/database/migrate-postgres.ts`
- seeds: `tsx src/database/seed-postgres.ts`
- reset: `tsx src/database/reset-postgres.ts`

Observacao operacional:
- `DATABASE_URL` e `DIRECT_DATABASE_URL` sao as fontes de conexao
- `DATABASE_SSL_MODE` controla SSL sem depender de `sslmode` na URL

## Camadas de dados

### 1. Core runtime

Tabelas do produto ja em uso:
- `user_profile`
- `facts`
- `tasks`
- `conversation_turns`
- `tool_calls`

### 2. Environmental ecology foundation

Tabelas canônicas novas para ecologia ambiental real:
- `domains`
- `sources`
- `source_topics`
- `biomes`
- `climates_koppen`
- `life_zones_holdridge`
- `biogeographic_realms`
- `ecosystems`
- `ecosystem_classifications`
- `taxa`
- `species`
- `populations`
- `abiotic_factors`
- `trophic_roles`
- `biotic_interactions`
- `formation_processes`
- `ecosystem_processes`
- `restoration_methods`
- `artificial_projects`
- `project_target_ecosystems`
- `project_metrics`
- `modeling_approaches`
- `metrics`
- `grounding_facts`
- `fact_links`

## Seeds atuais

- `001_seed_dev.sql`: perfil local e contexto tecnico interno
- `002_seed_ecosystems.sql`: memoria historica do projeto fora do dominio ambiental
- `003_seed_environment.sql`: camada de compatibilidade do grounding atual em `facts`
- `004_seed_environmental_practices.sql`: referencias de praticas ambientais fora do grounding principal legacy
- `005_seed_environmental_ecology_foundation.sql`: taxonomias, entidades ecologicas, fontes e `grounding_facts` canônicos

## Convencao atual

- `ecosystem:<slug>` em `facts` continua reservado a ecossistemas ambientais reais
- `grounding_facts` passa a ser a base canônica nova de fatos ambientais com proveniencia
- `internal:project-context` e `reference:environmental-practices` permanecem fora do grounding ecologico principal

Documentacao detalhada:
- `database/schema/environmental-ecology-foundation.md`
- `docs/conventions/ecosystem-facts.md`

## Comandos reais

```bash
npm run db:migrate
npm run db:seed
npm run db:check
npm run db:reset
```

Observacao:
- `db:reset` apenas remove o schema atual em ambiente local/dev
- para reconstruir a base, rode `db:migrate` e depois `db:seed`
