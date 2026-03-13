# Backend (`@sara/backend`)

API HTTP da Sara Core com arquitetura em camadas:

- `http/routes`: registro de endpoints
- `modules/*/controller`: entrada/saida HTTP
- `modules/*/service`: regras de aplicacao
- `modules/*/repository`: acesso ao SQLite
- `database`: conexao, migracao e reset de schema
- `core/errors`: erros padronizados
- `core/middleware`: validacao e middleware cross-cutting
- `logging`: logger estruturado

Documentacao de API e contratos:
- `docs/api/endpoints.md`
- `docs/api/contracts.md`
