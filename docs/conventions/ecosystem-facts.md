# Ecosystem Facts Convention

Convencao de compatibilidade para o grounding atual baseado em `facts`.

## Objetivo

Manter o MVP atual funcional enquanto a camada canônica nova de ecologia fica em `grounding_facts`.

Leitura correta nesta fase:
- `grounding_facts` = base ambiental canônica com proveniencia e metadados ricos
- `facts` = camada legacy/compatibilidade ainda usada pelo grounding operacional atual

## Category

- Regra principal: `ecosystem:<slug-ambiental>`
- `slug` deve usar lowercase kebab-case
- `ecosystem:*` fica reservado para ecossistemas da natureza

Exemplos validos:
- `ecosystem:floresta-tropical`
- `ecosystem:manguezal`
- `ecosystem:cerrado`
- `ecosystem:caatinga`
- `ecosystem:rio`
- `ecosystem:lago`
- `ecosystem:oceano`
- `ecosystem:recife-de-coral`

Categorias globais ainda aceitas no grounding legacy:
- `concept`
- `concepts`
- `profile`

Categorias fora do grounding principal:
- `internal:project-context`
- `reference:environmental-practices`

## Key em `facts`

Para fatos de ecossistemas reais, use apenas chaves ecologicas padronizadas:
- `definicao`
- `componentes.bioticos`
- `componentes.abioticos`
- `tipos`
- `exemplos`
- `importancia`
- `ameacas`
- `conservacao`
- `localizacao`
- `relacoes-troficas`
- `clima`
- `flora`
- `fauna`
- `escala`

Regra de formato:
- lowercase
- segmentos separados por `.` ou `-`
- regex operacional: `^[a-z0-9]+(?:[.-][a-z0-9]+)*$`

## Value em `facts`

- Deve conter informacao objetiva, correta e curta o bastante para grounding limitado
- Deve descrever o ecossistema, nao instruir o modelo
- Nao deve conter segredos, credenciais ou contexto tecnico do projeto

## isImportant em `facts`

- `true` para fatos nucleares do ecossistema
- `false` para fatos complementares

## Regras praticas

- Cada `ecosystem:<slug>` deve ter pelo menos `definicao`
- Priorizar fatos sobre composicao, importancia, ameacas, conservacao e localizacao
- Fatos tecnicos do projeto nao devem usar `ecosystem:*`
- `tasks` e `conversation_turns` continuam fora do grounding principal nesta fase

## Camada canônica nova

O dominio ambiental relacional novo fica documentado em:
- `database/schema/environmental-ecology-foundation.md`

Categorias obrigatorias de `grounding_facts`:
- `concept`
- `ecosystem`
- `formation-process`
- `abiotic-factor`
- `species`
- `artificial-project`
- `modeling-approach`
- `reference`
