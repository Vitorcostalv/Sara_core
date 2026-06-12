# Sara Core

## Visão geral
Sara Core gera e simula ecossistemas digitais plausíveis a partir de descrições em linguagem natural. O usuário descreve um ambiente (por exemplo, "um cerrado com relevo irregular e rios"), a IA interpreta o texto, o backend consulta uma base ecológica científica e o frontend monta o terreno em 3D com clima, relevo, vegetação e fauna. As respostas e simulações são *grounded*: baseadas nos dados do banco, não em conhecimento livre do modelo.

É um monorepo com backend HTTP em Node.js, frontend React e PostgreSQL (Neon).

## Status do projeto
MVP técnico/local. A base já executa consulta grounded, catálogo do domínio, geração de terreno a partir de texto e simulações de cenário, mas ainda não está pronta para produção.

## Tecnologias
- Backend: Node.js, TypeScript, Express, Zod, Pino
- Frontend: React, TypeScript, Vite, React Router, Zustand, three.js (@react-three/fiber + drei)
- Banco: PostgreSQL (Neon)
- LLM: providers configuráveis (Gemini, Grok) para interpretar descrições; com fallback determinístico por palavra-chave quando o provider está desabilitado
- Monorepo/tooling: npm workspaces, TypeScript, ESLint

## Estrutura do projeto
- `apps/backend`: API HTTP, regras de domínio, grounding ecológico e scripts de banco
- `apps/frontend`: painel de ecologia (consulta, catálogo, terreno 3D, cenário)
- `packages/shared-types`: contratos de API compartilhados
- `database`: migrations e seeds do schema ecológico
- `docs`: arquitetura, contratos, endpoints e convenções

## Pré-requisitos
- Node.js 20+
- npm
- acesso a um banco PostgreSQL (Neon)
- arquivo `.env` na raiz com as variáveis de banco, CORS e LLM

## Como instalar
```bash
npm install
```

Depois:
1. crie um `.env` na raiz com `DATABASE_URL` e `DIRECT_DATABASE_URL` (Neon) e o que mais precisar sobrescrever;
2. as variáveis disponíveis e seus defaults estão em `apps/backend/src/config/env.ts`;
3. para habilitar a interpretação por IA, configure `LLM_PROVIDER` e `LLM_API_KEY` (sem isso, a geração usa correspondência por palavra-chave).

## Como rodar
Limpar o schema PostgreSQL local/de desenvolvimento:
```bash
npm run db:reset
```

Reaplicar schema e seeds:
```bash
npm run db:migrate
npm run db:seed
```

Subir backend e frontend:
```bash
npm run dev
```

Rodar só o backend:
```bash
npm run dev:backend
```

Rodar só o frontend:
```bash
npm run dev:frontend
```

## Scripts principais
- `npm run dev`: sobe backend e frontend
- `npm run build`: build dos workspaces
- `npm run typecheck`: checagem de tipos nos workspaces
- `npm run lint`: lint do monorepo
- `npm run test`: testes disponíveis por workspace
- `npm run db:reset` / `db:migrate` / `db:seed`: ciclo de banco do PostgreSQL

## Fluxos implementados hoje
- **Consulta grounded** (`POST /api/v1/ecology/generate`): pergunta sobre ecologia respondida apenas com os fatos do banco, com aviso quando o grounding é insuficiente
- **Catálogo do domínio**: ecossistemas, espécies, fatores abióticos, projetos artificiais e abordagens de modelagem
- **Texto → terreno** (`POST /api/v1/ecology/prompt-terrain`): descrição em linguagem natural vira bioma + grid de terreno 3D com fauna compatível
- **Simulações**: terreno, sucessão ecológica, cenário climático e ambiente artificial
- `dryRun=true` na consulta para inspecionar o contexto sem chamar o provider externo
- autenticação opcional por API key em `/api/v1`, com exceção do `health`

## Limitações conhecidas
- o projeto ainda não é produção;
- a geração depende da qualidade do grounding no banco; temas sem cobertura retornam aviso de insuficiência;
- a interpretação por IA depende de um provider configurado (há fallback por palavra-chave);
- a documentação ainda evolui conforme a base é endurecida.
