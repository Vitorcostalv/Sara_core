# Fauna sprites (billboard opcional)

Convenção de asset para o render híbrido da fauna (ver `faunaRenderProfiles.ts` e `AnimalEntity.tsx`).

## Como funciona

- Coloque um PNG com fundo transparente aqui, nomeado pelo **id da espécie**:
  `apps/frontend/public/fauna/<species-id>.png` → servido em `/fauna/<species-id>.png`.
- Registre o caminho em `SPECIES_ASSET_PATHS` (em `faunaRenderProfiles.ts`), por exemplo:
  `{ "capivara": "/fauna/capivara.png" }`. Alternativamente, o backend pode enviar
  `renderHints.spriteAssetPath` por espécie.
- Quando um sprite existe e carrega, a espécie é renderizada como **billboard** (plano voltado
  para a câmera). Quando não há sprite, ou o carregamento falha, cai automaticamente no
  **polígono procedural** — sem GLB e sem quebrar a cena.

## Exemplos incluídos (placeholders)

Três silhuetas de exemplo (estilo "field-guide", role-tintadas) já acompanham o repo e estão
registradas em `SPECIES_ASSET_PATHS`, cobrindo os três casos do catálogo:

- `capivara.png` — herbívoro nativo
- `onca-pintada.png` — predador nativo
- `invasor-javali.png` — espécie invasora (o invasor "javali" recebe o id `invasor-javali`)

São apenas placeholders para demonstrar o caminho de billboard; substitua por arte final mantendo
o mesmo nome de arquivo. Todas as demais espécies continuam no polígono procedural.

## Regras

- Sem sprite registrado ⇒ nenhuma requisição de rede é feita (evita 404 no console); usa polígono.
- Falha de carregamento é cacheada como `null` e degrada para polígono silenciosamente.
- Os ids seguem o catálogo determinístico do backend (ex.: `capivara`, `onca-pintada`, `arara-azul`);
  o id do invasor é `invasor-<slug>` (ex.: `invasor-javali`, `invasor-leao`).

Este diretório é rastreado via `.gitkeep`; os PNGs de exemplo são placeholders e não fazem parte
do contrato do sistema.
