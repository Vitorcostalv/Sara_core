# Sara Core API Contracts

## Shared package

Pacote: `@sara/shared-types`

Arquivos base:
- `src/domain.ts`: entidades de domínio.
- `src/api.ts`: DTOs request/response, paginação, erro.
- `src/client.ts`: helpers de query params e paginação para client tipado.

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

## Accepted enums

- `TaskStatus`: `pending | in_progress | done | archived`
- `TaskPriority`: `1 | 2 | 3 | 4 | 5`
- `ConversationRole`: `user | assistant | system`
- `ToolCallStatus`: `running | success | error`

## Voice interaction payload

`POST /api/v1/voice/interactions`

Request:
- `multipart/form-data`
- `audio`: arquivo de audio (obrigatorio)
- `language`: string opcional (`pt-BR` por padrao)

Response:

```json
{
  "transcription": "texto transcrito",
  "assistantText": "Entendi: texto transcrito",
  "audioReplyUrl": null,
  "wakeWordDetected": null
}
```

Observacoes:
- `audioReplyUrl` fica `null` neste MVP (TTS futuro).
- `wakeWordDetected` fica `null` neste MVP (wake word futuro).

## User profile payload

`PATCH /api/v1/user-profile`

```json
{
  "displayName": "Sara",
  "preferredName": "Sá",
  "fullName": "Sara Silva",
  "email": "sara@example.com",
  "locale": "pt-BR",
  "timezone": "America/Sao_Paulo",
  "birthDate": "1994-10-23"
}
```

Response:

```json
{
  "data": {
    "id": "local-user",
    "displayName": "Sara",
    "preferredName": "Sá",
    "fullName": "Sara Silva",
    "email": "sara@example.com",
    "locale": "pt-BR",
    "timezone": "America/Sao_Paulo",
    "birthDate": "1994-10-23",
    "createdAt": "2026-03-13T18:00:00.000Z",
    "updatedAt": "2026-03-13T18:10:00.000Z"
  }
}
```

## LLM generation payload

`POST /api/v1/llm/generate`

Request:

```json
{
  "prompt": "Quais ecossistemas eu ja defini para o projeto?",
  "userId": "local-user",
  "ecosystems": ["sara-core"],
  "maxFacts": 12,
  "includeProfile": true,
  "dryRun": true
}
```

Response:

```json
{
  "data": {
    "provider": "disabled",
    "model": "not-configured",
    "answer": null,
    "dryRun": true,
    "contextPreview": "Grounding policy...\nUser profile...\nEcosystems...",
    "factsPreview": [
      {
        "id": "fact-id",
        "key": "ecosystem-description",
        "category": "ecosystem:sara-core",
        "isImportant": true,
        "valuePreview": "..."
      }
    ],
    "ecosystems": [
      {
        "slug": "sara-core",
        "factCount": 1,
        "facts": [
          {
            "id": "fact-id",
            "key": "ecosystem-description",
            "category": "ecosystem:sara-core",
            "isImportant": true,
            "valuePreview": "..."
          }
        ]
      }
    ],
    "grounding": {
      "userId": "local-user",
      "profileIncluded": true,
      "factCount": 1,
      "ecosystemsUsed": ["sara-core"],
      "warnings": []
    }
  }
}
```

Observacoes:
- `dryRun=true` nao chama Gemini nem Grok; serve para auditar a montagem de contexto.
- Nesta fase o grounding usa `user_profile` e `facts`.
- `tasks` e `conversation_turns` ficam fora do contexto principal.
- Convencao inicial recomendada para ecossistemas: `category = "ecosystem:<slug>"`.
- Quando o contexto grounded for insuficiente, a resposta deve ser: `Nao encontrei informacao suficiente no banco para responder com seguranca.`

## Typed client base (shared)

Helpers disponíveis:
- `toQueryParams(params)`
- `withQuery(path, params)`
- `normalizePaginationQuery(query)`
- `canGoNextPage(meta)`

Objetivo:
- evitar mapeamento manual de query string no frontend;
- padronizar consumo de paginação;
- manter contratos tipados entre backend e frontend.
