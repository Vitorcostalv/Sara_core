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

O schema é centrado no domínio ecológico (grounding científico):

- `ecosystems`, `ecosystem_classifications`, `biomes`, `climates_koppen`, `biogeographic_realms`: ecossistemas e sua classificação.
- `species`, `taxa`, `trophic_roles`, `ecosystem_species`: fauna/flora e papéis tróficos.
- `abiotic_factors`, `ecosystem_factors`, `formation_processes`, `ecosystem_processes`: fatores e processos abióticos.
- `artificial_projects`, `project_target_ecosystems`, `modeling_approaches`, `restoration_methods`: projetos artificiais e abordagens.
- `grounding_facts`, `sources`, `fact_links`: fatos científicos rastreáveis e suas fontes.

### Decisao

O runtime usa PostgreSQL/Neon. O schema vive em `database/postgres/migrations` e é populado por seeds idempotentes em `database/seeds`.

## 6. Escopo atual

A base entrega:

- consulta grounded sobre os fatos do banco;
- catálogo navegável do domínio ecológico;
- geração de terreno 3D a partir de descrição textual (texto → bioma → terreno + fauna);
- simulações de sucessão, cenário climático e ambiente artificial.
