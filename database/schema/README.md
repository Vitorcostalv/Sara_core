# Sara Core Data Model (MVP)

## `user_profile`
Representa o perfil local principal do usuario da instancia Sara Core.
O registro `local-user` e criado no bootstrap e mantido pelo modulo `user_profile`.
Campos adicionais da migration 004: `preferred_name`, `full_name`, `email`, `birth_date`.

## `facts`
Armazena fatos persistidos sobre o usuario para memoria semantica local.
Nesta fase, tambem armazena contexto de ecossistemas para grounding da LLM usando a convencao `category = ecosystem:<slug>`.
Convencao detalhada: `docs/conventions/ecosystem-facts.md`.

## `tasks`
Registra tarefas com status, prioridade e data limite opcional.

## `conversation_turns`
Historico de turnos de conversa para auditoria e contexto.

## `tool_calls`
Rastreamento de chamadas internas de ferramentas vinculadas a turnos.
