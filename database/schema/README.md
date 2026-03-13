# Sara Core Data Model (Phase 1)

## `user_profile`
Representa o perfil local principal do usuario dono da instÃ¢ncia Sara Core.
Na migration inicial, um perfil padrao `local-user` e criado para bootstrap local.

## `facts`
Armazena fatos persistidos sobre o usuario, preferÃªncias e contexto Ãºtil para memÃ³ria da assistente.

## `tasks`
Registra tarefas do dia a dia com status, prioridade e data limite opcional.

## `conversation_turns`
HistÃ³rico de turnos de conversa para auditoria e futura recuperaÃ§Ã£o de contexto.

## `tool_calls`
Rastreamento de chamadas de ferramentas relacionadas a um turno de conversa.
