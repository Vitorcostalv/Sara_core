# Modelos de fauna (GLB)

## Decisão: diretório ignorado, pack base versionado à força

`apps/frontend/public/models/` está no `.gitignore`. O pack base de 15 modelos low-poly
**CC0 (Quaternius)** e este `README.md` + `CREDITS.md` são adicionados **à força**
(`git add -f`) ao repositório — são arquivos pequenos e garantem que o visualizador 3D
funcione offline e na banca do TCC sem depender de download, além de a atribuição viajar junto.
Modelos baixados sob demanda (com `url` no manifesto) permanecem ignorados a menos que você
também os adicione com `git add -f`.

## Escala sem inchar o repositório

Para adicionar muitas espécies novas sem commitar centenas de GLBs:

1. Adicione uma entrada em [`src/features/ecology/faunaAssetManifest.ts`](../../../src/features/ecology/faunaAssetManifest.ts)
   com `file`, `categories`, atribuição (`author`/`license`/`source`/`sourceUrl`) e um `url`
   de download direto (GLB CC0/CC-BY).
2. Rode `npm run models:fetch` (em `apps/frontend`). O script baixa **apenas** as entradas com
   `url` cujo arquivo local ainda não existe (idempotente), valida o cabeçalho GLB e regenera
   `CREDITS.md`.
3. Se preferir não versionar os modelos baixados sob demanda, ignore-os adicionando o padrão
   correspondente ao `.gitignore` e rode `models:fetch` no setup/CI.

Em runtime, se um GLB estiver ausente, a cena **não quebra**: `AnimalEntity` renderiza um
impostor procedural (primitivas coloridas por categoria). `CREDITS.md` é **gerado** — não editar
à mão; a fonte da verdade é o manifesto.
