# Backend (`@sara/backend`)

API HTTP da Sara Core com arquitetura em camadas:

- `http/routes`: registro de endpoints
- `modules/*/controller`: entrada/saÃ­da HTTP
- `modules/*/service`: regras de aplicaÃ§Ã£o
- `modules/*/repository`: acesso ao SQLite
- `database`: conexÃ£o, migraÃ§Ã£o e reset de schema
- `core/errors`: erros padronizados
- `core/middleware`: validaÃ§Ã£o e middleware cross-cutting
- `logging`: logger estruturado
