# Sara Core API Endpoints (MVP)

Base URL: `/api/v1`

## Response pattern

- Success (single): `{ "data": { ... } }`
- Success (list): `{ "data": [...], "meta": { ...pagination } }`
- Error: `{ "error": { "code": "...", "message": "...", "details": ... } }`
- Exception: `POST /voice/interactions` retorna objeto direto no MVP para manter compatibilidade com o frontend de voz.

## Health

### GET `/health`
- Description: healthcheck da API.
- Path params: none.
- Query params: none.
- Request body: none.
- Response body:
```json
{
  "status": "ok",
  "service": "sara-core-backend",
  "environment": "development",
  "timestamp": "2026-03-13T17:00:00.000Z"
}
```
- Possible errors: `INTERNAL_SERVER_ERROR`.
- Notes: endpoint público para monitoramento.

## Voice

### POST `/voice/interactions`
- Description: recebe audio multipart e retorna transcricao STT offline (Vosk).
- Path params: none.
- Query params: none.
- Request body: `multipart/form-data` com `audio` (arquivo obrigatorio) e `language` (opcional).
- Response body:
```json
{
  "transcription": "texto transcrito",
  "assistantText": "Entendi: texto transcrito",
  "audioReplyUrl": null,
  "wakeWordDetected": null
}
```
- Possible errors: `VOICE_AUDIO_REQUIRED`, `VOICE_AUDIO_TOO_LARGE`, `VOICE_AUDIO_UNSUPPORTED_TYPE`, `VOICE_AUDIO_EMPTY`, `VOICE_FFMPEG_NOT_FOUND`, `VOICE_STT_PROVIDER_UNAVAILABLE`, `VOICE_STT_MODEL_NOT_FOUND`, `VOICE_AUDIO_CONVERSION_FAILED`, `VOICE_TRANSCRIPTION_FAILED`, `VOICE_PROCESSING_FAILED`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: conversao para PCM mono 16k via FFmpeg antes da transcricao.
- Notes: quando a transcricao nao estiver vazia, o backend persiste automaticamente turno do usuario, tentativa de `llm.generate`, tool call e turno do assistente.

## LLM

### POST `/llm/generate`
- Description: gera resposta grounded usando `user_profile` + `facts`, com foco em ecossistemas e sem usar tasks ou conversation turns nesta fase.
- Path params: none.
- Query params: none.
- Request body: `GenerateLlmRequest`.
- Response body: `LlmGenerateResponse`.
- Possible errors: `LLM_PROVIDER_NOT_CONFIGURED`, `LLM_API_KEY_MISSING`, `LLM_PROVIDER_REQUEST_FAILED`, `LLM_EMPTY_RESPONSE`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: `dryRun=true` monta o contexto e retorna preview sem chamar provider externo.
- Notes: se o grounding for insuficiente, o backend retorna resposta explicita sem deixar o provider responder fora do banco.
- Notes: facts historicos de meio ambiente foram normalizados para `ecosystem:environment`, entrando no grounding atual sem ampliar a whitelist.

## Facts

### GET `/facts`
- Description: lista fatos com filtros e paginação.
- Path params: none.
- Query params: `userId`, `category`, `isImportant`, `page`, `pageSize`.
- Request body: none.
- Response body: `PaginatedResponse<Fact>`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: ordenação estável por `updatedAt DESC, id DESC`.

### POST `/facts`
- Description: cria um fato.
- Path params: none.
- Query params: none.
- Request body: `CreateFactRequest`.
- Response body: `FactResponse`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: `userId` default é `local-user`.

### GET `/facts/:id`
- Description: busca fato por id.
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `FactResponse`.
- Possible errors: `FACT_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### PATCH `/facts/:id`
- Description: atualiza um fato.
- Path params: `id`.
- Query params: none.
- Request body: `UpdateFactRequest`.
- Response body: `FactResponse`.
- Possible errors: `FACT_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### PATCH `/facts/:id/important`
- Description: marca/desmarca fato como importante.
- Path params: `id`.
- Query params: none.
- Request body: `MarkFactImportantRequest`.
- Response body: `FactResponse`.
- Possible errors: `FACT_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### DELETE `/facts/:id`
- Description: remove fato.
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `204 No Content`.
- Possible errors: `FACT_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

## Tasks

### GET `/tasks`
- Description: lista tarefas com filtros e paginação.
- Path params: none.
- Query params: `userId`, `status`, `priority`, `page`, `pageSize`.
- Request body: none.
- Response body: `PaginatedResponse<Task>`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: ordenação estável por `updatedAt DESC, id DESC`.

### POST `/tasks`
- Description: cria tarefa.
- Path params: none.
- Query params: none.
- Request body: `CreateTaskRequest`.
- Response body: `TaskResponse`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### GET `/tasks/:id`
- Description: busca tarefa por id.
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `TaskResponse`.
- Possible errors: `TASK_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### PATCH `/tasks/:id`
- Description: atualiza tarefa.
- Path params: `id`.
- Query params: none.
- Request body: `UpdateTaskRequest`.
- Response body: `TaskResponse`.
- Possible errors: `TASK_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### PATCH `/tasks/:id/complete`
- Description: conclui tarefa (status `done`).
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `TaskResponse`.
- Possible errors: `TASK_NOT_FOUND`, `TASK_ARCHIVED`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### DELETE `/tasks/:id`
- Description: remove tarefa.
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `204 No Content`.
- Possible errors: `TASK_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

## Conversation Turns

### GET `/conversation-turns`
- Description: lista turnos de conversa com filtros e paginação.
- Path params: none.
- Query params: `userId`, `role`, `source`, `page`, `pageSize`.
- Request body: none.
- Response body: `PaginatedResponse<ConversationTurn>`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: ordenação estável por `createdAt DESC, id DESC`.

### POST `/conversation-turns`
- Description: cria turno de conversa.
- Path params: none.
- Query params: none.
- Request body: `CreateConversationTurnRequest`.
- Response body: `ConversationTurnResponse`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### GET `/conversation-turns/:id`
- Description: busca turno por id.
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `ConversationTurnResponse`.
- Possible errors: `CONVERSATION_TURN_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

## Tool Calls

### GET `/tool-calls`
- Description: lista chamadas de ferramentas com filtros e paginação.
- Path params: none.
- Query params: `conversationTurnId`, `status`, `page`, `pageSize`.
- Request body: none.
- Response body: `PaginatedResponse<ToolCall>`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: ordenação estável por `createdAt DESC, id DESC`.

### POST `/tool-calls`
- Description: registra chamada de ferramenta.
- Path params: none.
- Query params: none.
- Request body: `CreateToolCallRequest`.
- Response body: `ToolCallResponse`.
- Possible errors: `CONVERSATION_TURN_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### GET `/tool-calls/:id`
- Description: busca tool call por id.
- Path params: `id`.
- Query params: none.
- Request body: none.
- Response body: `ToolCallResponse`.
- Possible errors: `TOOL_CALL_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

### PATCH `/tool-calls/:id/status`
- Description: atualiza status/resultado de execução.
- Path params: `id`.
- Query params: none.
- Request body: `UpdateToolCallStatusRequest`.
- Response body: `ToolCallResponse`.
- Possible errors: `TOOL_CALL_NOT_FOUND`, `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.

## User Profile

### GET `/user-profile`
- Description: busca perfil do usuário local (`local-user`).
- Path params: none.
- Query params: none.
- Request body: none.
- Response body: `UserProfileResponse`.
- Possible errors: `INTERNAL_SERVER_ERROR`.
- Notes: garante existência do `local-user` antes de responder.

### PATCH `/user-profile`
- Description: atualiza perfil do usuário local.
- Path params: none.
- Query params: none.
- Request body: `UpdateUserProfileRequest`.
- Response body: `UserProfileResponse`.
- Possible errors: `VALIDATION_ERROR`, `INTERNAL_SERVER_ERROR`.
- Notes: atualização parcial, sem quebrar contratos já existentes.
