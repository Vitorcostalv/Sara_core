# Sara Core API Contracts

## Shared package

Pacote: `@sara/shared-types`

Arquivos base:
- `src/api.ts`: envelope genérico de API (item, lista paginada, erro, health)
- `src/index.ts`: re-exports

Os tipos específicos do domínio ecológico (terreno, fauna, cenário, etc.) ficam em `apps/frontend/src/services/api/ecology.ts`, espelhando as respostas do backend.

## Error contract

```ts
interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown | null;
}

interface ApiErrorResponse {
  error: ApiErrorPayload;
}
```

## Authentication contract

- Header opcional nesta fase: `x-sara-api-key: <valor>`
- Necessário para endpoints de `/api/v1` quando `AUTH_MODE=api-key`
- `GET /api/v1/health` permanece público

## Pagination contract

```ts
interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
```

## Consulta grounded

`POST /api/v1/ecology/generate`

Request:

```json
{
  "prompt": "Quais são as principais características do manguezal?",
  "ecosystems": ["manguezal"],
  "maxFacts": 12,
  "dryRun": true
}
```

Response (`{ "data": EcologicalLlmResult }`):

```json
{
  "data": {
    "provider": "disabled",
    "model": "not-configured",
    "answer": null,
    "dryRun": true,
    "queryType": "factual",
    "contextPreview": "Grounded ecological context...",
    "factsUsed": 1,
    "ecosystemsFound": ["manguezal"],
    "warnings": [],
    "inspection": null,
    "groundingCoverage": "sufficient"
  }
}
```

Observações:
- `dryRun=true` não chama provider externo; serve para auditar a montagem de contexto.
- A resposta usa exclusivamente os fatos do banco (tabelas `grounding_facts`, `ecosystems`, `species`, etc.).
- Quando o grounding for insuficiente, `groundingCoverage="insufficient"` e `answer` traz a mensagem de insuficiência.

## Texto → terreno

`POST /api/v1/ecology/prompt-terrain`

Request:

```json
{ "prompt": "um cerrado com relevo irregular e rios", "seed": 42 }
```

Response (`{ "data": TerrainPromptResult }`): `{ biomeName, biomeSlug, interpretation, terrainParams, terrain, source }`, onde `source` é `"llm" | "keyword" | "default"` (fallback por palavra-chave quando não há provider configurado).
