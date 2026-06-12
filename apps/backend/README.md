# Backend (`@sara/backend`)

API HTTP da Sara Core com arquitetura em camadas:

- `http/routes`: registro de endpoints (`health`, `ecology`)
- `modules/*/controller`: entrada e saída HTTP
- `modules/*/service`: regras de aplicação
- `modules/*/repository`: acesso ao PostgreSQL (Neon)
- `database`: conexão, migração, reset e seed de schema
- `core/errors`: erros padronizados
- `core/middleware`: validação e middleware cross-cutting
- `logging`: logger estruturado

Documentação de API, contratos e modelagem:
- `docs/api/endpoints.md`
- `docs/api/contracts.md`
- `docs/conventions/ecosystem-facts.md`
- `database/schema/environmental-ecology-foundation.md`

## Domínio: ecologia

O módulo `ecology` concentra o produto:
- **grounding** (`grounding/`): contexto científico montado a partir do banco (`grounding_facts`, `ecosystems`, `species`, `abiotic_factors`, ...)
- **llm** (`llm/`): consulta grounded e interpretação de descrições textuais em biomas, usando a camada de provider (`modules/llm/llm.provider` → Gemini/Grok)
- **simulation** (`simulation/`): geração de terreno, biomas, fauna, sucessão, cenário e ambiente artificial

## Hardening operacional

- `GET /api/v1/health` permanece público para monitoramento
- demais endpoints em `/api/v1` exigem `x-sara-api-key` quando `AUTH_MODE=api-key`
- logs HTTP e de aplicação redigem headers sensíveis e API keys
- a conexão com Neon/PostgreSQL usa `DATABASE_SSL_MODE` para controlar SSL sem depender de `sslmode` na URL

## Consulta grounded

`POST /api/v1/ecology/generate`:
1. recebe `prompt`, e opcionalmente `ecosystems`, `categories`, `maxFacts`, `dryRun`, `includeInspection`
2. o context-builder recupera apenas fatos válidos de `grounding_facts` (com proveniência via `sources`)
3. o serviço reforça as regras de grounding no prompt de sistema
4. se `dryRun=true`, retorna o preview do contexto sem chamar o provider externo
5. se o grounding for insuficiente, retorna a mensagem explícita de insuficiência (`groundingCoverage="insufficient"`)
6. se houver grounding suficiente e provider configurado, chama o provider

### Provider de LLM

A interpretação por IA usa Gemini ou Grok (`LLM_PROVIDER` + `LLM_API_KEY`). Sem provider configurado, a geração de terreno cai num **fallback determinístico por palavra-chave**, e a consulta grounded só responde em `dryRun`/insuficiência.

## Banco

Fluxo de rebootstrap (local/dev):
1. `npm run db:reset` — limpa o schema
2. `npm run db:migrate` — aplica `database/postgres/migrations`
3. `npm run db:seed` — aplica os seeds idempotentes

Seeds atuais:
- `database/seeds/005_seed_environmental_ecology_foundation.sql`
- `database/seeds/006_seed_ecological_part2.sql`
- `database/seeds/007_seed_biome_enrichment.sql`
