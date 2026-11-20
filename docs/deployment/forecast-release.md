# Publicação para teste de previsão

Destino identificado: `sara-core`, equipe `vitorcostalvs-projects`.
Site/API: https://sara-core-one.vercel.app (API em `/api/v1`).
A Vercel segue a branch **Dev-Vitor**. A Render hospeda somente o classificador
`sara-core-llm`, não esta API nem o banco. A versão candidata foi integrada à base
publicada `bb87fa32ea99b934649deb8a3538b29f8553332e`; não publicar o antigo checkout
`main` diretamente, pois apagaria melhorias que já estão em produção.

## Configuração preservada

`vercel.json`, `api/index.js`, build serverless e integração Render foram mantidos.
Não há migrations novas nem alteração de dados de produção nesta entrega.
O build `npm run build:web` usa API relativa ao mesmo domínio e mantém segredos
apenas no servidor. O cache PWA foi atualizado para v9.

Manter `DATABASE_URL` e `DATABASE_SSL_MODE=verify-full` no servidor. Preservar
`LLM_PROVIDER`, `LLM_API_KEY` e `LLM_MODEL` do provedor principal. O classificador
usa `LLM_RENDER_ENABLED`, `LLM_RENDER_BASE_URL`, `LLM_RENDER_API_KEY` e o timeout
existente. Não copiar chaves para variáveis VITE nem para arquivos públicos.

O ping do aplicativo chama `/api/v1/health/ping`; a API encaminha um heartbeat
limitado ao `/health` do classificador configurado na Render. Não faz inferência
nem encaminha credenciais. Com o navegador fechado, usar o loop externo:

```sh
npm run keep-alive -- https://sara-core-one.vercel.app
```

## Publicação e verificação

Antes da publicação: `npm run test:browser`, `npm run typecheck`, `npm run lint`,
`npm run build:web`, `npm run test:web` e `npm run test:portable`.
Publicar a alteração da versão candidata na branch correta somente após revisão.
Depois da Vercel ficar READY:

```sh
npm run verify:production -- https://sara-core-one.vercel.app
npm run verify:production -- https://sara-core-one.vercel.app --llm
```

O primeiro comando verifica saúde, versão e previsão sintética sem salvar dados.
O segundo faz inferência real no provedor configurado e consome sua cota. Ele
falha se houver fallback; não transforma uma indisponibilidade em sucesso falso.
`/api/v1/health` mostra capacidades configuradas, sem expor chaves.

No site: Bioinvasão → Previsão com observações → Carregar exemplo sintético →
Gerar previsão experimental. Confirmar métricas, datas, rótulo sintético e exportação.
Importar depois observações reais seguindo `docs/ecology/observational-forecast.md`.
Confirmar também o cenário de invasão, as fases e o resultado de habitat incompatível.

## Rollback

Na Vercel: abra o projeto `sara-core` → Deployments → localize o deployment
abaixo → menu de ações → Instant Rollback/Rollback e confirme o destino de
produção. Registre primeiro o deployment com falha para análise. Depois confira
`/api/v1/health`, `/ecology`, recarregamento da PWA e um cenário anterior.
O modelo de previsão novo deixará de estar disponível após a reversão.

Produção anterior identificada: deployment `dpl_2W7CeigBhL3qtJpkPfZcZrLd3YAe`,
URL `sara-core-1ceegijeh-vitorcostalvs-projects.vercel.app`.
Se os testes de saúde, API ou interface falharem, retornar a esse deployment pela
Vercel. Nenhuma reversão de banco é necessária para as alterações desta entrega.
Não trocar plano, credenciais ou serviço da Render durante esse rollback.

## Evidência da candidata

Validação local em 20/11/2026 (data UTC): 229 testes de backend, 97 de frontend,
2 da entrada serverless e 5 do gateway local passaram. Build de produção,
typecheck e lint passaram. O build avisa sobre um bundle acima de 500 kB; o
precache PWA ficou em 3,11 MB dentro do orçamento de 5 MB.

Edge headless verificou API com PostgreSQL temporário, previsão sintética,
exportação, recuperação de JSON inválido, canvas, troca/restauração de fases,
ausência de respawn e introdução incompatível. Também executou o mesmo script
`verify:production` contra a API isolada. Evidências em `.tmp/verification/`.
Não houve acesso ao banco de produção. LLM real e deployment novo ainda não
foram validados em produção; testes de provedores locais usam respostas simuladas.
Não há promessa de ausência absoluta de erros ou precisão ecológica validada.

O prompt completo para a outra LLM está em `tester-production-prompt.md`.
