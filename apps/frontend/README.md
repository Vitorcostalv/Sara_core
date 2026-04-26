# Frontend (`@sara/frontend`)

Frontend React usado para validar e inspecionar fluxos da Sara Core.

## O que ele cobre hoje
- envio de áudio para o endpoint de voz
- captura opcional por microfone no navegador
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

## Observações
- este frontend é um painel operacional de MVP, não uma interface final de produto;
- ele depende do backend disponível em `VITE_API_BASE_URL`;
- parte da interface ainda está focada em validação técnica e debug, não em fluxo final de usuário.
