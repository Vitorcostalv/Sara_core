# Sara Core

## Visão geral
Sara Core é um monorepo para uma assistente local/offline. Hoje o projeto combina um backend HTTP em Node.js, um frontend React para validação operacional, SQLite local, STT offline com Vosk e um módulo inicial de LLM grounded em dados do banco.

## Status do projeto
O estado atual é de **MVP técnico/local**.

Isso significa:
- a base já executa fluxos reais de voz, persistência e grounding;
- a arquitetura principal já existe;
- o projeto ainda **não** está pronto para produção;
- segurança, testes, ergonomia operacional e documentação ainda estão em evolução.

## Tecnologias
- Backend: Node.js, TypeScript, Express, Zod, Pino
- Frontend: React, TypeScript, Vite, React Router, Zustand
- Banco local: SQLite com `better-sqlite3`
- STT: Vosk + Python + FFmpeg
- LLM grounded: providers configuráveis no backend, com contexto vindo de `user_profile` e `facts`
- Monorepo/tooling: npm workspaces, TypeScript

## Estrutura do projeto
- `apps/backend`: API HTTP, regras de aplicação, acesso ao SQLite e scripts de banco
- `apps/frontend`: painel de validação e debug
- `packages/shared-types`: contratos compartilhados entre backend e frontend
- `database`: migrations, seeds e documentação do schema
- `services/stt`: script Python e modelo local usados no fluxo de transcrição
- `docs`: arquitetura, contratos, endpoints e convenções

## Pré-requisitos
- Node.js em versão compatível com `better-sqlite3`
  Observação: no ambiente auditado, `Node.js v24.15.0` apresentou incompatibilidade ABI com o binário instalado e exigiu rebuild nativo.
- npm
- Python disponível no PATH
- FFmpeg disponível no PATH
- modelo Vosk extraído em `services/stt/models/pt-br`
- arquivo `.env` baseado em `.env.example`

Se você usar uma versão de Node sem binário compatível para `better-sqlite3`, será preciso recompilar o módulo nativo e ter toolchain C++ instalado no Windows.

## Como instalar
```bash
npm install
```

Depois:
1. copie `.env.example` para `.env`;
2. revise as variáveis de banco, CORS, STT e LLM;
3. confirme que Python, FFmpeg e o modelo Vosk estão acessíveis.

## Como rodar
Reset do banco local:
```bash
npm run db:reset
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
- `npm run db:reset`: limpa schema, reaplica migrations e seeds

Observação: o root atualmente expõe `build`, `typecheck`, `lint` e scripts de banco. O escopo e a qualidade do lint dependem da configuração presente nos workspaces.

## Fluxos implementados hoje
- upload de áudio no frontend para `POST /api/v1/voice/interactions`
- transcrição offline via Vosk no backend
- histórico de `conversation_turns` para consulta/debug
- operações básicas para `tasks`, `facts`, `tool_calls` e `user_profile`
- geração grounded via `POST /api/v1/llm/generate`
- `dryRun=true` para inspecionar o contexto da LLM sem chamar provider externo

## Limitações conhecidas
- o projeto ainda não é produção;
- autenticação e autorização ainda não estão endurecidas;
- a API ainda assume um contexto local e simplificado em vários pontos;
- `better-sqlite3` depende de ambiente Node compatível ou rebuild nativo bem configurado;
- o fluxo de voz ainda depende de Python, FFmpeg e modelo local corretamente instalados;
- o processamento de voz ainda pode ter limitações de desempenho e concorrência;
- a documentação ainda pode evoluir conforme a base for endurecida.

## Próximos passos técnicos
- endurecer autenticação/autorização e reduzir dependência de `userId` vindo do cliente;
- melhorar o lint e a automação de qualidade nos workspaces;
- ampliar a cobertura de testes de frontend e integração;
- reduzir trabalho síncrono no fluxo de voz;
- revisar dependências vulneráveis e estabilizar o ambiente Node nativo.
