# Sara Core API Endpoints

Base URL: `/api/v1`

## Autenticação e limites

- `GET /health` e `GET /health/...` permanecem públicos.
- Os demais endpoints em `/api/v1` exigem o header `x-sara-api-key` quando `AUTH_MODE=api-key`.

## Padrão de resposta

- Sucesso (item): `{ "data": { ... } }`
- Sucesso (lista paginada): `{ "data": [...], "meta": { ...pagination } }`
- Erro: `{ "error": { "code": "...", "message": "...", "details": ... } }`

## Health

### GET `/health`
Healthcheck público da API.
```json
{ "status": "ok", "service": "sara-core-backend", "environment": "development", "timestamp": "..." }
```

## Ecologia — consulta grounded

### POST `/ecology/generate`
Responde uma pergunta de ecologia usando **apenas** os fatos do banco (grounding).
- Request: `{ "prompt": string, "ecosystems"?: string[], "categories"?: string[], "maxFacts"?: number, "dryRun"?: boolean, "includeInspection"?: boolean }`
- Response: `EcologicalLlmResult` — `{ provider, model, answer, dryRun, queryType, contextPreview, factsUsed, ecosystemsFound[], warnings[], inspection, groundingCoverage }`
- Notes: `dryRun=true` monta o contexto e retorna o preview sem chamar o provider externo. Se o grounding for insuficiente, `answer` traz a mensagem de insuficiência e `groundingCoverage="insufficient"`.
- Erros: `AUTH_UNAUTHORIZED`, `LLM_PROVIDER_NOT_CONFIGURED`, `LLM_API_KEY_MISSING`, `LLM_PROVIDER_ERROR`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### POST `/ecology/inspect`
Monta o contexto de grounding e retorna o objeto de inspeção (sem gerar resposta).
- Request: `{ "ecosystems"?: string[], "categories"?: string[], "maxFacts"?: number }`

## Ecologia — catálogo do domínio

### GET `/ecology/ecosystems`
Lista paginada de ecossistemas. Query: `medium`, `kind`, `page`, `pageSize`.

### GET `/ecology/ecosystems/:slug`
Detalhe de um ecossistema. Erro: `ECOLOGY_ECOSYSTEM_NOT_FOUND`.

### GET `/ecology/species`
Lista paginada de espécies. Query: `ecosystem`, `trophicRole`, `page`, `pageSize`.

### GET `/ecology/abiotic-factors`
Lista de fatores abióticos.

### GET `/ecology/artificial-projects`
Lista paginada de projetos artificiais. Query: `page`, `pageSize`.

### GET `/ecology/modeling-approaches`
Lista de abordagens de modelagem.

### GET `/ecology/coverage`
Estatísticas de cobertura do domínio (contagem de fatos por categoria, etc.).

## Ecologia — geração e simulação

### POST `/ecology/prompt-terrain`
Interpreta uma descrição em linguagem natural e gera o terreno do bioma correspondente.
- Request: `{ "prompt": string, "width"?: number, "height"?: number, "seed"?: number }`
- Response: `TerrainPromptResult` — `{ biomeName, biomeSlug, interpretation, terrainParams, terrain, source }`. `source` é `"llm" | "keyword" | "default"` (com fallback por palavra-chave quando o provider está desabilitado).

### POST `/ecology/ecosystem-report`
Pipeline completo: interpreta a descrição, gera o terreno + fauna e devolve um **relatório estruturado** do ecossistema.
- Request: `{ "prompt": string, "width"?: number, "height"?: number, "seed"?: number }`
- Response: `TerrainPromptResult` + `{ species, report }`, onde `report` traz `climate`, `relief`, `vegetation`, `fauna`, `abioticFactors`, `scientificExplanation` (grounded, com cobertura e fontes) e `limitations`.

### POST `/ecology/fauna`
Resolve a fauna compatível para um conjunto de biomas ou para um grid de terreno.
- Request: `{ "biomes"?: string[], "grid"?: TerrainGrid }`

### POST `/ecology/simulate/terrain`
Gera um grid de terreno a partir de parâmetros explícitos.
- Request: `{ "width"?, "height"?, "seed"?, "baseTemperatureC"?, "basePrecipitationMm"?, "baseHumidityPct"? }`

### POST `/ecology/simulate/succession`
Simula sucessão ecológica entre estágios.
- Request: `{ "type"?, "startingStage"?, "disturbanceIntensity"?, "ecosystemSlug"? }`

### POST `/ecology/simulate/scenario`
Calcula o impacto de mudanças climáticas/distúrbios sobre um ecossistema (baseline vs. modificado + risco).
- Request: `{ "ecosystemSlug": string, "baseTemperatureC"?, "basePrecipitationMmYear"?, "deltaTemperatureC"?, "deltaPrecipitationPct"?, "disturbanceType"?, "disturbanceIntensity"?, "connectivityIndex"? }`

### POST `/ecology/simulate/artificial`
Gera o desenho de um ambiente artificial a partir de um projeto cadastrado.
- Request: `{ "projectSlug": string, "scale"? }`. Erro: `ECOLOGY_PROJECT_NOT_FOUND`.
