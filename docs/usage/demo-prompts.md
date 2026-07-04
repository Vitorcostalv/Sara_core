# Prompts de demonstração (TCC)

Três prompts testados para a banca, escolhidos para tornar visíveis os elementos determinísticos
da camada de conhecimento ecológico. Todos rodam offline (fallback por palavra-chave) mesmo sem
provider LLM ativo.

## 1. Geração normal de ecossistema — aba **Terreno**

> **Floresta amazônica densa e úmida, com rios e muita vegetação.**

Torna visível:

- **Validação ecológica determinística** (score 0–100 + componentes).
- **Base de recurso** (folhagem de dossel, frutos/sementes, detrito) com pressão herbívora.
- **Rede trófica** (elos ativos/podados, consistência de pirâmide).
- **Animais presentes** (nome comum + científico) e o terreno/fauna no visualizador 3D.
- A capivara aparece como **billboard** (sprite de exemplo); demais espécies usam polígono.

## 2. Ecossistema predador/presa — aba **Terreno**

> **Cerrado brasileiro com campos abertos, capivaras, veados e onças.**

Torna visível:

- **Rede trófica** com elos ativos de predação (onça → capivara/veado) e a pirâmide base:meso:apex.
- **Base de recurso** dominada por pastagem e folhagem arbustiva.
- Predação/fuga em execução no 3D (a onça-pintada usa o sprite de exemplo em billboard).

## 3. Cenário de espécie invasora — aba **Invasora**

> Espécie: **javali** — Local: **cerrado**

Torna visível:

- **Mecanismos de impacto nomeados** (sobrepastejo, supressão vegetal, competição alimentar,
  engenharia de habitat) com severidade e alvos.
- **Recursos afetados**, **plausibilidade de estabelecimento** (0–100) e **pressão de dispersão**.
- **Incertezas** e **premissas MVP** explícitas.
- O invasor (`invasor-javali`) aparece em **billboard** convivendo com a fauna nativa no 3D.

## Argumento da tese que os prompts evidenciam

A IA apenas interpreta o texto e explica o resultado; a **consistência ecológica** (adequação de
habitat, suporte de recurso, elos tróficos, score de plausibilidade e mecanismos de invasão) é
imposta por serviços **determinísticos** no backend. A simulação é educacional e heurística, não
uma previsão ecológica validada.
