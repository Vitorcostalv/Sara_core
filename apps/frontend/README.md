# Frontend (`@sara/frontend`)

Painel React da Sara Core, focado no domínio de ecologia.

## O que ele cobre hoje
A página de Ecologia, com abas:
- **Consulta**: pergunta grounded sobre ecologia (`POST /api/v1/ecology/generate`) e geração de ecossistema a partir do texto
- **Catálogo**: ecossistemas, espécies, fatores abióticos, projetos artificiais e abordagens de modelagem
- **Terreno**: descrição em linguagem natural → bioma + terreno 3D (three.js) com fauna, água, chuva e ciclo dia/noite
- **Cenário**: impacto de mudanças climáticas e distúrbios sobre um ecossistema

## Stack
- React
- TypeScript
- Vite
- React Router
- Zustand
- three.js (`@react-three/fiber` + `drei`)

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
- depende do backend disponível em `VITE_API_BASE_URL`;
- quando o backend estiver com `AUTH_MODE=api-key`, o frontend envia `VITE_API_AUTH_KEY`;
- é um painel operacional/MVP, não uma interface final de produto.
