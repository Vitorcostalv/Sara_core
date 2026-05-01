# Frontend (`@sara/frontend`)

Frontend React usado para validar e inspecionar fluxos da Sara Core.

## O que ele cobre hoje
- envio de áudio para o endpoint de voz
- captura opcional por microfone no navegador
- teste operacional de `POST /api/v1/llm/generate`
- consulta de `conversation_turns`
- UI de suporte para outros módulos já existentes no projeto

## Stack
- React
- TypeScript
- Vite
- React Router
- Zustand

## Execução
```bash
npm run dev -w @sara/frontend
```

## Build
```bash
npm run build -w @sara/frontend
```

## Typecheck
```bash
npm run typecheck -w @sara/frontend
```

## E2E / UI
Instalar o browser usado pela suite:
```bash
npm run test:e2e:install -w @sara/frontend
```

Rodar a suite E2E:
```bash
npm run test:e2e -w @sara/frontend
```

Rodar com navegador visivel:
```bash
npm run test:e2e:headed -w @sara/frontend
```

Observacoes:
- a suite usa Playwright;
- os testes mockam `GET /health`, Voice, LLM e Tool Calls via interceptacao de rede;
- o contrato HTTP continua o mesmo; a suite protege os fluxos principais sem depender do backend real em runtime.

## Observações
- este frontend é um painel operacional de MVP, não uma interface final de produto;
- ele depende do backend disponível em `VITE_API_BASE_URL`;
- quando o backend estiver com `AUTH_MODE=api-key`, o frontend pode enviar `VITE_API_AUTH_KEY`;
- parte da interface ainda está focada em validação técnica e debug, não em fluxo final de usuário;
- a tela de LLM existe para validar grounding, warnings e resposta do provider sem antecipar trabalho de design.
