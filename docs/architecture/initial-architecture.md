# Initial Architecture - Sara Core (Phase 1)

## 1. Principios arquiteturais

- **Local-first**: tudo roda localmente, sem dependencia de servicos pagos.
- **Modularidade**: cada dominio evolui em modulo isolado.
- **Tipagem forte**: contratos compartilhados em `packages/shared-types`.
- **Separacao de responsabilidades**: camadas claras no backend.
- **Evolucao incremental**: preparar estrutura para features futuras sem implementa-las agora.

## 2. Monorepo e fronteiras

- `apps/backend`: orquestracao HTTP, regras e persistencia.
- `apps/frontend`: dashboard operacional.
- `packages/shared-types`: tipos de dominio comuns para backend/frontend.
- `packages/shared-config`: base de configuracao TypeScript.
- `database`: schema versionado e rastreavel.
- `services`: fronteira reservada para componentes de voz e LLM no futuro.

## 3. Backend (orquestrador)

Arquitetura por camadas no backend:

- `http/routes`: define rotas e compoe modulos.
- `modules/*/*.controller.ts`: traduz HTTP para chamadas de aplicacao.
- `modules/*/*.service.ts`: regras da aplicacao, coordenacao de casos de uso.
- `modules/*/*.repository.ts`: acesso ao PostgreSQL e mapeamento de entidades.
- `database`: conexao, migracao e reset do banco.
- `core/middleware`: validacao e middlewares transversais.
- `core/errors`: erros de dominio e handler global.
- `logging`: logger estruturado com `pino`.

### Decisao

Essa divisao reduz acoplamento e permite que dois devs trabalhem em modulos independentes sem conflito forte.

## 4. Frontend (dashboard/admin)

Estrutura orientada a crescimento:

- `pages`: telas por contexto funcional.
- `components`: blocos reutilizaveis.
- `layouts`: estrutura comum da interface.
- `services/api`: cliente HTTP para integracao futura.
- `state`: estado global simples (`zustand`).

### Decisao

Separar layout, pagina, estado e API desde o inicio evita refactor grande quando o painel comeÃ§ar a consumir dados reais.

## 5. Banco persistido (PostgreSQL / Neon)

Modelo inicial com tabelas:

- `user_profile`: perfil principal local do usuario.
- `facts`: memoria persistente de fatos.
- `tasks`: tarefas do cotidiano.
- `conversation_turns`: historico de turnos conversacionais.
- `tool_calls`: rastreabilidade de chamadas de ferramenta por turno.

### Decisao

O runtime atual usa PostgreSQL/Neon para persistencia principal. Isso preserva a arquitetura modular existente, mas remove a divergencia entre runtime real e documentacao historica.

## 6. Escalabilidade para proximas fases

Sem implementar STT/TTS/wake word/LLM agora, a base ja prepara:

- contratos de dados consistentes
- backend pronto para novos modulos
- dashboard pronto para integrar APIs
- pasta `services/` reservada para motores locais futuros
