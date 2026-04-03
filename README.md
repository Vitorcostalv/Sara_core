# Sara Core

Sara Core e uma assistente pessoal local/offline em evolucao incremental.

O projeto hoje ja possui:
- backend Node.js + TypeScript
- frontend React + TypeScript + Vite
- SQLite
- monorepo com contratos compartilhados
- STT local com Vosk + Python + FFmpeg
- modulo LLM grounded no backend

## Estado atual

Esta fase nao e mais apenas fundacao.

Hoje o projeto ja suporta:
- validacao de voz por upload de arquivo no frontend
- transcricao via `POST /api/v1/voice/interactions`
- grounding de LLM via `POST /api/v1/llm/generate`
- contexto limitado a `user_profile` + `facts`
- ecossistemas modelados em `facts` usando `category = ecosystem:<slug>`
- `dryRun=true` para auditar contexto sem chamar provider externo

## Objetivo desta fase

O foco atual e:
- popular o banco com contexto util
- manter a LLM grounded no banco
- endurecer seguranca e performance
- deixar design para uma fase posterior

## Estrutura do monorepo

- `apps/backend`: API HTTP, camadas de aplicacao e acesso ao banco
- `apps/frontend`: painel React para validacao e debug
- `packages/shared-types`: contratos compartilhados entre backend e frontend
- `packages/shared-config`: configuracoes base de TypeScript
- `database`: migrations, seeds e documentacao do schema SQLite
- `docs`: arquitetura, contratos e convencoes
- `services`: placeholders e referencias para servicos auxiliares

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Garanta um arquivo `.env` local.

3. Resete banco, migrations e seeds:

```bash
npm run db:reset
```

4. Suba backend e frontend:

```bash
npm run dev
```

## Scripts principais

- `npm run dev`: sobe backend + frontend
- `npm run dev:backend`: sobe apenas backend
- `npm run dev:frontend`: sobe apenas frontend
- `npm run db:migrate`: aplica migrations
- `npm run db:seed`: aplica seeds locais
- `npm run db:reset`: limpa schema, reaplica migrations e reaplica seeds
- `npm run build`: build de todos os workspaces
- `npm run typecheck`: checagem de tipos em todos os workspaces

## LLM grounded

O backend possui um modulo `llm` seguindo a arquitetura existente:
- `llm.routes.ts`
- `llm.controller.ts`
- `llm.service.ts`
- `llm.schemas.ts`
- `llm.provider.ts`
- `context-builder.service.ts`

Fluxo atual:
1. o endpoint recebe `prompt`, `ecosystems`, `maxFacts`, `includeProfile` e `dryRun`
2. o `context-builder` monta contexto usando `user_profile` e `facts`
3. facts de ecossistemas usam `category = ecosystem:<slug>`
4. facts fora da convencao sao ignorados no grounding
5. se o contexto for insuficiente, o backend responde explicitamente:
   `Nao encontrei informacao suficiente no banco para responder com seguranca.`
6. se `dryRun=true`, o backend retorna preview do contexto sem chamar provider externo

Providers suportados hoje:
- Gemini
- Grok

## Convencao de ecossistemas

- categoria: `ecosystem:<slug>`
- `slug`: lowercase kebab-case
- `key`: lowercase com `.` ou `-`
- `value`: contexto objetivo e auditavel
- `isImportant`: prioridade de grounding, nao permissao ampla

Detalhes: `docs/conventions/ecosystem-facts.md`

## Endpoints principais

- `GET /api/v1/health`
- `POST /api/v1/voice/interactions`
- `POST /api/v1/llm/generate`

## Documentacao

- Arquitetura inicial: `docs/architecture/initial-architecture.md`
- Convencoes gerais: `docs/conventions/project-conventions.md`
- Convencao de facts de ecossistemas: `docs/conventions/ecosystem-facts.md`
- Modelo de dados: `database/schema/README.md`
- Endpoints API: `docs/api/endpoints.md`
- Contratos API: `docs/api/contracts.md`
