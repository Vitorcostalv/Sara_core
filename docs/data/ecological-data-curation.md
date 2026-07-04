# Curadoria de Dados Ecológicos (Sara Core)

> Front científico/dados — Worker D. Complementa `docs/architecture/ecological-knowledge-layer.md`.

## Onde os dados vivem (e por quê)

A auditoria confirmou dois planos de dados distintos:

| Plano | Fonte | Uso |
| --- | --- | --- |
| **Grounding / catálogo** | PostgreSQL/Neon (`grounding_facts`, `ecosystems`, `species`, …) via `EcologicalGroundingRepository` | Alimenta a **explicação do LLM** e os endpoints de catálogo. |
| **Simulação determinística** | Arquivos TypeScript curados em `apps/backend/src/modules/ecology/simulation/` | Resolve **fauna, recursos, cadeia trófica, plausibilidade e invasoras**. **Não** lê o banco. |

Como a consistência ecológica da simulação vem do plano determinístico, a curadoria desta rodada foi
feita em **TypeScript curado (Opção B)**, não em novas migrações. Adicionar linhas de seed só
enriqueceria o grounding do LLM, não a simulação. Isso mantém a implementação pequena, versionada e
testável, sem migrações grandes.

## Por que curado e não import externo

O MVP é local-first e determinístico. Em vez de importar datasets massivos (GBIF/GloBI/…) em runtime,
os traços, mecanismos e vocabulários são **inspirados** nessas fontes e transcritos como um conjunto
pequeno e auditável, com nota de fonte e confiança por item. Isso evita dependência de rede,
não-determinismo e ruído de dados, mantendo o foco pedagógico do TCC.

## Estratégia de fontes (referência, não chamada ao vivo)

- **GBIF / Darwin Core** — taxonomia e nomes.
- **GRIIS / GISD / CABI / IUCN EICAT** — status invasor, vias e severidade de impacto.
- **GloBI** — interações bióticas (predação, competição).
- **Köppen / WorldClim** — envelopes climáticos dos ecossistemas.
- **EltonTraits / FishBase** — traços funcionais (massa, dieta, nível trófico).

## Modelo de confiança

Cada item curado (espécie, recurso, ecossistema, invasora) carrega `confidence` ∈ (0,1]:
- ~0.7 — bem estabelecido / consenso amplo.
- ~0.5–0.65 — plausível, curadoria funcional.
- ~0.4–0.5 — conceitual / extensão futura (ex.: `recurso-agricola`, `nectar-polen`).

## O que foi adicionado nesta rodada

- **Perfis de ecossistema** (`ecosystem-profiles.ts`): 10 perfis (Amazônia, Cerrado, Pantanal, Mata
  Atlântica, Caatinga, Pampa, Manguezal, Rio/lago dulcícola, Costeiro/marinho, Caverna tropical) com
  clima, substrato, água/salinidade, recursos dominantes, grupos de fauna compatíveis, condições
  incompatíveis, nota de fonte e confiança.
- **Catálogo de recursos basais** (`resource-base.ts`): vocabulário expandido para 13 tipos (novos:
  `raizes-tuberculos`, `algas`, `carnica`, `nectar-polen`, `recurso-agricola`) + `RESOURCE_CATALOG`
  com descrição, famílias de bioma suportadas, estratégias alimentares, produtividade, fonte, confiança.
- **Espécies** (`fauna-definition.service.ts`): novos táxons neotropicais (jacaré-do-pantanal, sucuri,
  jabuti, cutia, queixada, bugio, formiga-cortadeira, sapo-cururu, seriema) cobrindo répteis, anfíbio e
  invertebrados; `nativeStatus` por espécie (tilápia marcada como `introduced`).
- **Invasoras** (`invasive-scenario.service.ts`): de 6 para **13** perfis (búfalo, cabra, lebre-europeia,
  tucunaré, rã-touro, caramujo-gigante-africano, mexilhão-dourado), com `taxonGroup`, nota de
  estabelecimento e incertezas específicas por espécie.

## Limitações conhecidas

- Predadores répteis foram confinados a `pantanal`/`lago` para não perturbar as proporções tróficas
  calibradas dos testes de floresta.
- `recurso-agricola` não é produzido por nenhum bioma natural (só conceitual para pressão de invasoras).
- Invasoras invertebradas/anfíbias usam categorias de renderização de fauna existentes (peixe/animal),
  com `taxonGroup` corrigido — não há categoria dedicada de molusco/inseto.
- Os perfis de ecossistema são referência determinística; ainda não substituem os presets climáticos de
  `BiomePresetService` na geração de terreno.

## Como isto sustenta a tese

O LLM interpreta o texto e explica; a **consistência ecológica** (compatibilidade de habitat, suporte de
recurso, elos tróficos, plausibilidade e mecanismos de invasão) é imposta por dados **curados e
determinísticos** com proveniência e confiança explícitas — não por geração livre do modelo.
