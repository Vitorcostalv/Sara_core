# Backend (`@sara/backend`)

API HTTP da Sara Core com arquitetura em camadas:

- `http/routes`: registro de endpoints
- `modules/*/controller`: entrada e saida HTTP
- `modules/*/service`: regras de aplicacao
- `modules/*/repository`: acesso ao PostgreSQL (Neon)
- `database`: conexao, migracao e reset de schema
- `core/errors`: erros padronizados
- `core/middleware`: validacao e middleware cross-cutting
- `logging`: logger estruturado

Documentacao de API, contratos e modelagem:
- `docs/api/endpoints.md`
- `docs/api/contracts.md`
- `docs/conventions/ecosystem-facts.md`
- `database/schema/environmental-ecology-foundation.md`

## Voice STT MVP

Endpoint disponivel para o MVP de voz:
- `POST /api/v1/voice/interactions`

Endpoint para a fase de LLM grounded:
- `POST /api/v1/llm/generate`

## Hardening operacional atual

- `GET /api/v1/health` permanece publico para monitoramento
- demais endpoints em `/api/v1` podem exigir `x-sara-api-key` quando `AUTH_MODE=api-key`
- `voice` e `llm.generate` possuem rate limiting basico em memoria por IP
- o fluxo persistido de voz grava turno do usuario, tool call e turno do assistente dentro de uma transacao unica
- logs HTTP e de aplicacao redigem headers sensiveis e API keys
- a conexao com Neon/PostgreSQL usa `DATABASE_SSL_MODE` para controlar SSL sem depender de `sslmode` na URL

## Como funciona a LLM hoje

O modulo `llm` segue a arquitetura atual do backend:
- `routes`: registro do endpoint
- `controller`: adaptacao HTTP fina
- `service`: orquestracao de grounding + chamada ao provider
- `provider`: adapter de Gemini ou Grok
- `context-builder`: montagem de contexto a partir do banco

### Fontes de grounding

Hoje, a LLM operacional usa apenas:
- `user_profile`
- `facts`

Ela nao usa como base principal:
- `tasks`
- `conversation_turns`

### Ecossistemas

Ecossistemas sao modelados dentro de `facts` com a convencao:
- `category = ecosystem:<slug-ambiental>`

Exemplos:
- `ecosystem:floresta-tropical`
- `ecosystem:manguezal`
- `ecosystem:cerrado`
- `ecosystem:rio`
- `ecosystem:oceano`

Fatos tecnicos do projeto nao usam mais `ecosystem:*`.
Eles foram migrados para:
- `internal:project-context`
- `reference:environmental-practices`

### Camada canonica nova

O backend agora tambem possui uma base relacional canônica para ecologia ambiental real:
- `domains`
- `sources`
- `ecosystems`
- `ecosystem_classifications`
- `taxa`
- `species`
- `abiotic_factors`
- `formation_processes`
- `artificial_projects`
- `modeling_approaches`
- `grounding_facts`
- tabelas auxiliares relacionadas

Essa camada foi introduzida para suportar:
- proveniencia cientifica
- classificacoes ecologicas explicitas
- modelagem extensivel de especies, fatores e projetos artificiais
- grounding futuro menos dependente da tabela legacy `facts`

### Fluxo de geracao

1. `POST /api/v1/llm/generate` recebe `prompt`, `ecosystems`, `maxFacts`, `includeProfile` e `dryRun`
2. o `context-builder` busca apenas facts ecologicos validos e conceitos globais aceitos
3. o `llm.service` reforca regras de grounding no prompt de sistema
4. se `dryRun=true`, retorna preview do contexto sem chamar provider externo
5. se o grounding for insuficiente, retorna a mensagem explicita de insuficiencia
6. se houver grounding suficiente, chama o provider configurado

### Regras de seguranca do grounding

- profile e facts persistidos sao tratados como dados nao confiaveis
- facts fora da convencao ecologica de grounding sao ignorados
- o provider nao deve responder com conhecimento solto nesta fase
- se o banco nao sustentar a resposta, o backend responde:
  `Nao encontrei informacao suficiente no banco para responder com seguranca.`

### Seeds e banco

`db:reset` hoje:
- limpa o schema PostgreSQL local/de desenvolvimento
- nao reaplica migrations nem seeds automaticamente

Fluxo real de rebootstrap:
1. `npm run db:reset`
2. `npm run db:migrate`
3. `npm run db:seed`

Seeds atuais:
- `database/seeds/001_seed_dev.sql`
- `database/seeds/002_seed_ecosystems.sql`
- `database/seeds/003_seed_environment.sql`
- `database/seeds/004_seed_environmental_practices.sql`
- `database/seeds/005_seed_environmental_ecology_foundation.sql`

O runtime principal do backend nesta fase e:
- PostgreSQL/Neon como store persistido
- `database/postgres/migrations` como fonte de schema aplicada em runtime
- scripts SQLite mantidos apenas como legado de migracao
