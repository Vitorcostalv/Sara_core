# Sara Core API Endpoints (MVP)

Base URL: `/api/v1`

## Response pattern

- Success (single): `{ "data": { ... } }`
- Success (list): `{ "data": [...], "meta": { ...pagination } }`
- Error: `{ "error": { "code": "...", "message": "...", "details": ... } }`

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
