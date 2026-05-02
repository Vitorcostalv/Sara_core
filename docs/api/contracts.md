# Sara Core API Contracts

## Shared package

Pacote: `@sara/shared-types`

Arquivos base:
- `src/domain.ts`: entidades de dominio
- `src/api.ts`: DTOs request/response, paginacao e erro
- `src/client.ts`: helpers de query params e paginacao

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
- Necessario para endpoints de `/api/v1` quando `AUTH_MODE=api-key`
- `GET /api/v1/health` permanece publico

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

## Voice interaction payload

`POST /api/v1/voice/interactions`

Request:
- `multipart/form-data`
- `audio`: arquivo de audio obrigatorio
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

## LLM generation payload

`POST /api/v1/llm/generate`

Request:

```json
{
  "prompt": "Quais sao as principais caracteristicas do manguezal?",
  "userId": "local-user",
  "ecosystems": ["manguezal"],
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
    "contextPreview": "Grounding policy...\nConcepts...\nEcosystems...",
    "factsPreview": [
      {
        "id": "fact-eco-manguezal-definicao",
        "key": "definicao",
        "category": "ecosystem:manguezal",
        "isImportant": true,
        "valuePreview": "Manguezal e um ecossistema costeiro..."
      }
    ],
    "ecosystems": [
      {
        "slug": "manguezal",
        "factCount": 1,
        "facts": [
          {
            "id": "fact-eco-manguezal-definicao",
            "key": "definicao",
            "category": "ecosystem:manguezal",
            "isImportant": true,
            "valuePreview": "Manguezal e um ecossistema costeiro..."
          }
        ]
      }
    ],
    "grounding": {
      "userId": "local-user",
      "profileIncluded": true,
      "factCount": 1,
      "ecosystemsUsed": ["manguezal"],
      "warnings": []
    }
  }
}
```

Observacoes:
- `dryRun=true` nao chama provider externo; serve para auditar a montagem de contexto
- nesta fase o grounding usa `user_profile` e `facts`
- `tasks` e `conversation_turns` ficam fora do contexto principal
- `category = "ecosystem:<slug>"` ficou reservada para ecossistemas ecologicos reais
- fatos tecnicos do projeto nao entram mais como `ecosystem:*`
- quando o contexto grounded for insuficiente, a resposta deve ser:
  `Nao encontrei informacao suficiente no banco para responder com seguranca.`
