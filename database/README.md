# Database

Pasta para evolucao do banco PostgreSQL usado pelo runtime atual da Sara Core.

- `postgres/migrations/`: schema versionado e aplicavel automaticamente pelo backend.
- `schema/`: documentacao do modelo de dados.
- `seeds/`: dados de apoio opcionais para desenvolvimento local.

Observacao operacional:
- o runtime usa `DATABASE_URL` e `DIRECT_DATABASE_URL` para Neon/PostgreSQL
- a politica de SSL fica em `DATABASE_SSL_MODE`, sem depender de `sslmode` na connection string

Seeds atuais:
- `001_seed_dev.sql`: perfil local + fatos globais de contexto/preferencias.
- `002_seed_ecosystems.sql`: facts organizados por `category = ecosystem:<slug>`.
- `003_seed_environment.sql`: base inicial de conhecimento ambiental em facts e tasks.

## Seeds ambientais

`003_seed_environment.sql` insere dados iniciais sobre meio ambiente como base de conhecimento para demonstração e grounding.

- **facts**: 15 registros normalizados em `category = ecosystem:environment`, mantendo chaves detalhadas por tema ambiental.
- **tasks**: 10 registros com `id = task-env-*` representando ações práticas sustentáveis.
- Para aplicar: `npm run db:seed`
- A seed é idempotente: pode ser executada mais de uma vez sem duplicar dados (`ON CONFLICT (id) DO UPDATE`).
