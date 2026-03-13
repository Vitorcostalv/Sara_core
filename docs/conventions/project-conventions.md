# Project Conventions

## Branches

- `main`: branch protegida e estavel
- `develop`: integracao continua do time
- `feature/<scope>-<descricao-curta>`: desenvolvimento de funcionalidades
- `chore/<scope>-<descricao-curta>`: infraestrutura, build, docs, tooling
- `fix/<scope>-<descricao-curta>`: correcoes

## Commits

Padrao sugerido (Conventional Commits):

- `feat(backend): add task module scaffolding`
- `feat(frontend): create dashboard shell routes`
- `chore(repo): setup npm workspaces`
- `docs(architecture): add initial architecture guide`
- `refactor(shared-types): normalize task status typing`

## TypeScript

- `strict` sempre habilitado
- sem `any` sem justificativa forte
- tipos de dominio no pacote compartilhado

## Backend

- nova feature deve seguir: `route -> controller -> service -> repository`
- validacao de entrada com `zod`
- sem acesso direto ao banco em controller
- erros devem ser padronizados por `AppError`

## Frontend

- paginas em `pages`
- componentes reutilizaveis em `components`
- acesso HTTP concentrado em `services/api`
- estado global somente quando necessario

## Banco

- toda mudanca de schema via arquivo em `database/migrations`
- nunca editar migration ja aplicada; criar nova migration incremental

## Pull Request

- PR pequena e focada
- incluir objetivo, impacto e checklist de testes
- evitar mistura de refactor + feature na mesma PR
