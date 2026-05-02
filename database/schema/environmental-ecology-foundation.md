# Environmental Ecology Foundation

Camada relacional canônica para o dominio `environmental_ecology`.

## Objetivo

Separar ecologia ambiental real de qualquer contexto interno de software e oferecer uma base auditavel para:

- ecossistemas naturais
- ecossistemas artificiais, restaurados, melhorados e fechados
- taxonomia, especies e populacoes
- fatores abioticos
- processos de formacao
- classificacoes ecologicas e geograficas
- modelagem computacional e IA aplicada
- grounding factual com proveniencia cientifica

## Tabelas principais

- `domains`: dominios semanticos; nesta fase, o seed-base cria `environmental_ecology`.
- `sources` e `source_topics`: proveniencia, metadados e topicos de referencia.
- `biomes`, `climates_koppen`, `life_zones_holdridge`, `biogeographic_realms`: taxonomias ecologicas e geograficas.
- `ecosystems` e `ecosystem_classifications`: entidade ecossistema e suas classificacoes.
- `taxa`, `species`, `populations`: taxonomia biológica e variacao intraespecifica.
- `abiotic_factors`, `trophic_roles`, `biotic_interactions`: elementos fisicos e biologicos do sistema.
- `formation_processes`, `ecosystem_processes`: origem e dinamica de formacao.
- `restoration_methods`, `artificial_projects`, `project_target_ecosystems`, `project_metrics`: sistemas artificiais, restaurativos e seus objetivos.
- `modeling_approaches`, `metrics`: abordagens computacionais e indicadores.
- `grounding_facts`, `fact_links`: camada factual para LLM com categoria, proveniencia e links semanticos.

## Categorias de grounding

`grounding_facts.category` usa enum restrito:

- `concept`
- `ecosystem`
- `formation-process`
- `abiotic-factor`
- `species`
- `artificial-project`
- `modeling-approach`
- `reference`

## Proveniencia

Cada `grounding_facts` pode apontar para:

- `source_id`
- `citation_key`
- `doi`
- `url`
- `publisher`
- `authors`
- `year`

A fonte canônica de metadados fica em `sources`.

## Compatibilidade com o grounding atual

O backend atual ainda consulta `facts` para a fase operacional de grounding existente.

Nesta etapa:

- `grounding_facts` passa a ser a base canônica nova
- `facts` continua como camada de compatibilidade do MVP atual
- contexto tecnico do projeto permanece fora do dominio ambiental

## Comandos reais

```bash
npm run db:migrate
npm run db:seed
npm run db:check
npm test -w @sara/backend
```
