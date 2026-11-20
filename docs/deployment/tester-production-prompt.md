# Prompt para o tester de produção

Teste https://sara-core-one.vercel.app/ecology depois da publicação da candidata.
Não modifique configurações, banco, credenciais ou projetos de usuários. Use apenas
cenários novos e dados sintéticos; não salve projetos. Registre horário, versão,
passos, esperado, observado, screenshot, erros do console e respostas HTTP sem
credenciais. Não declare sucesso quando a interface estiver usando fallback.

1. Abra `/api/v1/health`: espere status `ok` e
   `capabilities.forecastModel = observational-log-trend-v1`.
   Se essa capacidade faltar, pare: a nova versão ainda não está publicada.
2. Em Bioinvasão → Previsão com observações, carregue o exemplo sintético e gere
   a previsão. Confira datas futuras, números finitos, limites não negativos,
   métricas de avaliação e comparação com persistência. Dados sintéticos devem
   continuar identificados e não podem validar um ecossistema real. Exporte o JSON
   e compare os valores com a tela.
3. Tente JSON inválido, observações vazias, menos de 12 registros, datas fora de
   ordem, população negativa e espécie inexistente. Espere mensagem clara e
   rejeição sem crash. Depois carregue o exemplo novamente e confirme recuperação.
4. Simule leão no Cerrado e leão na Antártida. No segundo caso, espere habitat
   incompatível e desaparecimento da introdução. No primeiro, confira a rede e
   as incertezas: não exija devastação como resultado obrigatório. Alterne fases,
   espere pelo menos 7 segundos e confirme que contagens/extinções se mantêm;
   retornar à primeira fase deve restaurar seus valores.
5. Exercite prompts separados no gerador: “Floresta amazônica úmida”,
   “Cerrado com campos e mata de galeria”, “Caatinga seca”, “Manguezal costeiro”,
   “Pantanal com áreas inundáveis”, “Oceano polar” e “Caverna”. Confira habitats,
   salinidade e recursos. Peixes de água doce não devem ocupar oceano; espécies
   florestais não devem surgir em campos sem seu habitat. Polígonos sem asset
   são esperados. No Cerrado, procure entradas novas como papagaio-galego,
   periquito-rei e tiziu quando houver habitat compatível.
6. Faça perguntas: “Sem inimigos naturais esse predador sempre devasta tudo?”,
   “O que limita uma presa sem predadores?” e “Um predador pode ser predado?”.
   Confira alimento finito, mortalidade, capacidade de suporte, elos explícitos
   e incertezas. A resposta não pode inventar abundâncias ou tempo biológico real
   a partir dos segundos da animação. Confira se a origem indicada é LLM ou regras.
7. Observe `/api/v1/health/ping` ao abrir e após 5 minutos: HTTP 200 e mensagem
   `oi`, sem cache. Reabrir a aba após suspensão deve retomar o ping. Isso não
   comprova disponibilidade permanente quando todos os navegadores estão fechados.
8. Repita o fluxo principal em tela móvel. Teste atualizar um navegador que já
   tinha a versão antiga: cache PWA v9 ativo e painel novo disponível.

Execute também, na pasta da candidata:

```sh
npm run verify:production -- https://sara-core-one.vercel.app
npm run verify:production -- https://sara-core-one.vercel.app --llm
```

O segundo comando consome a API configurada. Se houver timeout, falta de cota ou
fallback, registre integração real da LLM como reprovada/indisponível.
Não alterar a chave para contornar a falha.

Relate cada item como aprovado, reprovado ou bloqueado, com evidências. Se houver
erro 500, quebra de navegação, populações divergentes, dados indevidos ou regressão
grave, interrompa e solicite o rollback de `forecast-release.md`. Não execute
rollback nem publicação por conta própria.
