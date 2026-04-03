# Database

Pasta para evolucao do banco local SQLite.

- `migrations/`: schema versionado e aplicavel automaticamente pelo backend.
- `schema/`: documentacao do modelo de dados.
- `seeds/`: dados de apoio opcionais para desenvolvimento local.

Seeds atuais:
- `001_seed_dev.sql`: perfil local + fatos globais de contexto/preferencias.
- `002_seed_ecosystems.sql`: facts organizados por `category = ecosystem:<slug>`.
