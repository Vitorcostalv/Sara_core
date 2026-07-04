# Camada de Conhecimento Ecológico (Nota de Metodologia)

> Front científico/backend — Worker A. Complementa `System.md`.

## Tese em uma frase

Sara Core implementa uma arquitetura híbrida na qual um modelo de linguagem interpreta
descrições de ecossistemas em linguagem natural e produz explicações, enquanto a
**consistência ecológica é imposta por uma camada de conhecimento determinística** que
contém traços de espécies, restrições de habitat, elos tróficos, dependências de recurso e
mecanismos de impacto de invasoras. O LLM **não inventa ecologia**: ele classifica intenção,
ajuda a montar parâmetros de cenário e explica resultados fundamentados.

## O que a camada determinística garante

Todo cenário gerado consegue responder:

- Quais espécies estão presentes (nome comum + científico, grupo taxonômico, status nativo)?
- Qual papel trófico e estratégia alimentar de cada uma?
- Quais elos predador–presa estão **ativos** e quais foram **podados** (e por quê)?
- Qual a **base de recurso vegetal** que sustenta herbívoros/onívoros?
- Quais consumidores ficam **sem suporte** de recurso?
- Qual o **mecanismo de impacto** de uma invasora (nomeado, não "dano" genérico)?
- Quais premissas são heurísticas e quais dados estão faltando?
- Qual a **plausibilidade pontuada (0–100)** e sua decomposição por componente?

## Componentes (backend)

| Serviço / arquivo | Responsabilidade |
| --- | --- |
| `resource-base.ts` — `ResourceAvailabilityEvaluator` | Vocabulário `ResourceType`, `resourceNeedsFor()` (necessidade basal por espécie) e avaliação de disponibilidade de recurso em nível de grid + suporte por consumidor + pressão herbívora. |
| `trophic-network.service.ts` — `TrophicNetworkResolver` | Transforma a fauna já resolvida em rede trófica explícita: elos ativos, elos podados com motivo, espécies sem suporte, resumo por nível e consistência de pirâmide. |
| `ecological-plausibility.service.ts` — `EcologicalPlausibilityEvaluator` | Score 0–100 ponderado por componente (habitat, clima, trófico, recurso, riqueza, habitats especiais, confiança de dados) com issues, premissas, dados faltantes, fatores positivos e contradições bloqueantes. |
| `invasive-scenario.service.ts` (estendido) | Adiciona `impactMechanisms` nomeados, `affectedResources`, `establishmentPlausibility` (numérico), `spreadPressure`, `uncertainties` e `mvpAssumptions`. Catálogo de **13 perfis de invasoras** (mamíferos, peixe, anfíbio, invertebrados) com `taxonGroup`/notas curadas. |
| `ecosystem-profiles.ts` | `EcosystemProfileService` + `ECOSYSTEM_PROFILES`: 10 perfis curados (clima, substrato, água/salinidade, recursos dominantes, fauna compatível, condições incompatíveis, fonte, confiança). Agora também `matchForReport()` e `assessConsistency()` — o relatório casa o cenário a um perfil e mede divergências, que entram como um componente `profile-consistency` na validação (score renormalizado por peso total; sem perfil → comportamento idêntico). Ver `docs/data/ecological-data-curation.md`. |
| `resource-base.ts` (estendido) | Vocabulário de 13 `ResourceType` + `RESOURCE_CATALOG` (metadados/proveniência por recurso). |

Todos são **determinísticos**: mesma entrada → mesma saída. Nenhum depende de rede em runtime.

## Fontes de referência (curadas, não chamadas ao vivo)

Os traços, mecanismos e categorias se inspiram em: GBIF/Darwin Core (taxonomia), GRIIS
(listas de invasoras), IUCN EICAT (severidade de impacto), GISD/CABI (mecanismos e vias),
GloBI (interações bióticas), Köppen/WorldClim (clima) e EltonTraits/FishBase (traços
funcionais). No MVP essas fontes embasam a **curadoria dos seeds/perfis**, não o runtime —
o sistema é local-first após carregar os seeds.

## Restrições de comportamento do LLM

O LLM **pode**: classificar intenção do prompt, sugerir bioma/habitat, gerar explicação a
partir de fatos fornecidos, resumir limitações e incertezas. O LLM **não pode**: inventar
registros de espécies, criar elos predador–presa, inventar impactos de invasora sem mecanismo
perfilado, ou sobrepor as checagens determinísticas de adequação. Grounding insuficiente é
declarado explicitamente (ver `EcologicalValidation.missingData` e `limitations`).

## Limitações assumidas (MVP)

- Disponibilidade de recurso é heurística em nível de grid, não botânica por planta.
- Populações seguem pirâmide trófica aproximada (base:meso:apex ≈ 100:20:5).
- Elos de predação usam `preySpeciesIds`; recursos vegetais são implícitos por bioma.
- Carnívoros do catálogo sem `preySpeciesIds` (aves/peixes que comem presas não modeladas)
  são tratados como folhas "recurso-implícito", não como contradição.
- A projeção de invasão é educacional/determinística, não risco quantitativo validado.
