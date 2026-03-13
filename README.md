# Sara Core

Fundacao inicial do projeto **Sara Core**, uma assistente pessoal local/offline controlada por voz (com integrações futuras para wake word, STT, TTS e LLM local).

## Objetivo desta fase

Esta entrega cria apenas a base arquitetural e de desenvolvimento:

- monorepo organizado para trabalho em paralelo
- backend HTTP em Node.js + TypeScript preparado para crescer como orquestrador
- frontend React preparado como dashboard/admin panel
- banco local SQLite com schema inicial e migrações
- tipos compartilhados e configuração de TypeScript centralizada
- Documentações e converções para time

Nao ha implementacao de STT, TTS, wake word ou LLM nesta fase.

## Estrutura do monorepo

- `apps/backend`: API HTTP, camadas de aplicacao e acesso ao banco
- `apps/frontend`: painel React para monitoramento e administracao
- `packages/shared-types`: contratos de tipos compartilhados
- `packages/shared-config`: configuracoes base de TypeScript
- `database`: migraçãos e documentacao do schema SQLite
- `docs`: arquitetura e convencoes
- `services`: placeholders para servicos futuros (stt, tts, wake-word, llm)

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

3. Execute Migrações iniciais iniciais:

```bash
npm run db:migrate
```

4. Suba backend e frontend em paralelo:

```bash
npm run dev
```

5. Acesso local:

- Frontend: `http://localhost:5180`
- Backend: `http://localhost:3333`

## Scripts principais

- `npm run dev`: sobe backend + frontend
- `npm run dev:backend`: sobe apenas backend
- `npm run dev:frontend`: sobe apenas frontend
- `npm run db:migrate`: aplica Migrações SQLite
- `npm run db:reset`: limpa schema local e reaplica migrations
- `npm run build`: build de todos os workspaces
- `npm run typecheck`: checagem de tipos em todos os workspaces

## Endpoints iniciais

- `GET /api/v1/health`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`

## Documentacao

- Arquitetura inicial: `docs/architecture/initial-architecture.md`
- Convencoes do projeto: `docs/conventions/project-conventions.md`
- Modelo de dados: `database/schema/README.md`
- Endpoints API: `docs/api/endpoints.md`
- Contratos tipados API: `docs/api/contracts.md`
