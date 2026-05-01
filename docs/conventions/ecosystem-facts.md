# Ecosystem Facts Convention

Convencao incremental adotada para grounding da LLM nesta fase.

## Objetivo

Usar a tabela `facts` como base estruturada para contexto de ecossistemas, sem criar nova tabela antes de validar uso real.

## Category

- Regra para ecossistemas: `ecosystem:<slug>`
- `slug` deve usar lowercase kebab-case
- Exemplos:
  - `ecosystem:sara-core`
  - `ecosystem:voice-stt`
  - `ecosystem:llm-grounding`
  - `ecosystem:environment`

Categorias globais ainda aceitas no grounding:
- `context`
- `concept`
- `concepts`
- `preference`
- `preferences`
- `profile`

## Key

- Regra: lowercase com segmentos separados por `.` ou `-`
- Regex operacional: `^[a-z0-9]+(?:[.-][a-z0-9]+)*$`
- Exemplos:
  - `identity.summary`
  - `api.llm-generate`
  - `security.secret-handling`
  - `performance.max-facts-guideline`

## Value

- Deve conter informacao objetiva, auditavel e curta o bastante para caber em grounding limitado
- Evitar instrucoes ao modelo, texto excessivamente longo, segredos, credenciais ou conteudo operacional sensivel
- O valor deve ser dado de contexto, nao comando

## isImportant

- `true` para fatos que precisam aparecer primeiro no grounding
- `false` para detalhes complementares
- Nao usar `isImportant=true` indiscriminadamente; reservar para fatos de alta prioridade

## Regras praticas

- Um ecossistema deve ter pelo menos 1 fato de identidade ou resumo
- Priorizar fatos sobre:
  - identidade
  - arquitetura
  - contratos
  - restricoes
  - roadmap
  - seguranca
  - performance
- Nao usar `tasks` ou `conversation_turns` como base principal nesta fase
- Nao armazenar API keys, tokens ou segredos em `facts`
