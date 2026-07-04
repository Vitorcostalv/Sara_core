import type { TerrainPromptResult } from "../llm/ecological-terrain-prompt.service";
import type { ResourceBaseAssessment } from "./resource-base";
import type { TrophicConsistencyReport } from "./trophic-network.service";

// ─── Ecological plausibility evaluator ──────────────────────────────────────────
//
// A transparent, component-weighted plausibility score (0–100) for a generated scenario.
// It complements the existing qualitative `PlausibilityAssessment` in the report and gives
// the thesis a numeric way to compare "LLM-only" scenarios (no grounding, low confidence)
// against grounded scenarios. Every component is deterministic and explains its own score.

export type PlausibilityBand = "baixa" | "moderada" | "alta";

export interface PlausibilityComponent {
  key: string;
  label: string;
  /** Normalized 0–1 component score. */
  score: number;
  /** Contribution weight (weights across components sum to 1). */
  weight: number;
  detail: string;
}

export interface EcologicalValidation {
  /** Weighted score, 0–100. */
  score: number;
  label: PlausibilityBand;
  components: PlausibilityComponent[];
  issues: string[];
  assumptions: string[];
  missingData: string[];
  positiveFactors: string[];
  /** Hard ecological contradictions that should block a "high" rating. */
  blockingContradictions: string[];
}

export interface EcosystemPlausibilityInput {
  source: TerrainPromptResult["source"];
  dominantBiomePct: number;
  speciesCount: number;
  trophic: TrophicConsistencyReport;
  resources: ResourceBaseAssessment;
  grounding: { coverageSufficient: boolean; factCount: number };
  hasSpecialHabitat: boolean;
  /**
   * Optional curated ecosystem-profile consistency. When a profile matched the generated scenario,
   * this adds a deterministic "profile consistency" component and surfaces detected mismatches.
   * Omitted (or matched=false) → behavior is identical to the profile-free evaluation.
   */
  profile?: {
    matched: boolean;
    displayName: string;
    consistencyScore: number;
    mismatches: string[];
  };
}

export function plausibilityBand(score: number): PlausibilityBand {
  if (score >= 70) return "alta";
  if (score >= 45) return "moderada";
  return "baixa";
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class EcologicalPlausibilityEvaluator {
  evaluateEcosystem(input: EcosystemPlausibilityInput): EcologicalValidation {
    const { source, dominantBiomePct, speciesCount, trophic, resources, grounding, hasSpecialHabitat, profile } =
      input;

    const habitat: PlausibilityComponent = {
      key: "habitat",
      label: "Adequação de habitat",
      weight: 0.18,
      score: source === "default" ? 0.25 : clamp01(0.4 + (dominantBiomePct / 100) * 0.6),
      detail:
        source === "default"
          ? "Bioma não identificado; adequação de habitat assumida como baixa."
          : `Bioma dominante cobre ${dominantBiomePct}% do grid.`,
    };

    const climate: PlausibilityComponent = {
      key: "climate",
      label: "Compatibilidade climática",
      weight: 0.15,
      score: source === "default" ? 0.3 : source === "keyword" ? 0.7 : 0.85,
      detail:
        source === "llm"
          ? "Clima derivado do preset de bioma identificado por IA."
          : source === "keyword"
            ? "Clima derivado do preset de bioma inferido por palavra-chave."
            : "Parâmetros climáticos genéricos (bioma não identificado).",
    };

    const consumersSupported = resources.consumers.filter((c) => c.supported).length;
    const resourceScore =
      resources.consumers.length === 0 ? 0.6 : clamp01(consumersSupported / resources.consumers.length);
    const resourceComponent: PlausibilityComponent = {
      key: "resources",
      label: "Suporte de recursos",
      weight: 0.17,
      score: resourceScore,
      detail:
        resources.consumers.length === 0
          ? "Nenhum consumidor com dependência de recurso vegetal explícita."
          : `${consumersSupported}/${resources.consumers.length} consumidor(es) com base de recurso adequada; pressão herbívora ${resources.herbivorePressure.level}.`,
    };

    const trophicScore = clamp01(
      (trophic.pyramidConsistent ? 0.6 : 0.25) +
        (trophic.links.length > 0 ? 0.25 : 0) -
        Math.min(0.4, trophic.unsupportedSpecies.length * 0.15)
    );
    const trophicComponent: PlausibilityComponent = {
      key: "trophic",
      label: "Consistência trófica",
      weight: 0.2,
      score: trophicScore,
      detail: `${trophic.links.length} elo(s) ativo(s), ${trophic.prunedLinks.length} podado(s); pirâmide ${
        trophic.pyramidConsistent ? "consistente" : "desbalanceada"
      }.`,
    };

    const richnessComponent: PlausibilityComponent = {
      key: "richness",
      label: "Riqueza de espécies",
      weight: 0.12,
      score: clamp01(speciesCount / 8),
      detail: `${speciesCount} espécie(s) resolvida(s) (alvo heurístico ≈ 8).`,
    };

    const specialComponent: PlausibilityComponent = {
      key: "special-habitat",
      label: "Habitats especiais",
      weight: 0.08,
      score: hasSpecialHabitat ? 0.85 : 0.7,
      detail: hasSpecialHabitat
        ? "Restrições de cavernas/água/montanha/polar respeitadas pela fauna resolvida."
        : "Sem habitats especiais relevantes; critério neutro.",
    };

    const confidenceComponent: PlausibilityComponent = {
      key: "data-confidence",
      label: "Confiança dos dados",
      weight: 0.1,
      score: grounding.coverageSufficient ? 0.9 : grounding.factCount > 0 ? 0.55 : 0.25,
      detail: `${grounding.factCount} fato(s) do banco; cobertura ${grounding.coverageSufficient ? "suficiente" : "limitada"}.`,
    };

    const components = [
      habitat,
      climate,
      resourceComponent,
      trophicComponent,
      richnessComponent,
      specialComponent,
      confidenceComponent,
    ];

    // Optional curated-profile consistency. Added only when a profile matched, then the score is
    // renormalized by total weight so it stays 0–100 regardless of component count (profile-free
    // scoring is unchanged because the base weights sum to 1).
    if (profile?.matched) {
      components.push({
        key: "profile-consistency",
        label: "Coerência com perfil de ecossistema",
        weight: 0.12,
        score: clamp01(profile.consistencyScore),
        detail:
          profile.mismatches.length === 0
            ? `Condições coerentes com o perfil curado "${profile.displayName}".`
            : `${profile.mismatches.length} divergência(s) vs. perfil "${profile.displayName}".`,
      });
    }

    const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
    const rawScore = (components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight) * 100;

    const blockingContradictions: string[] = [];
    if (!trophic.pyramidConsistent) blockingContradictions.push("Pirâmide trófica desbalanceada.");
    for (const name of trophic.unsupportedSpecies) {
      blockingContradictions.push(`${name} sem presa nem recurso de suporte.`);
    }

    // Blocking contradictions cap the score below the "alta" band.
    const score = Math.round(blockingContradictions.length > 0 ? Math.min(rawScore, 64) : rawScore);

    const issues = [
      ...components.filter((c) => c.score < 0.5).map((c) => `${c.label}: ${c.detail}`),
      ...trophic.warnings,
      ...resources.resourceWarnings,
      ...(profile?.matched ? profile.mismatches : []),
    ];

    const positiveFactors = components.filter((c) => c.score >= 0.75).map((c) => `${c.label}: ${c.detail}`);

    const missingData: string[] = [];
    if (grounding.factCount === 0) missingData.push("Sem fatos científicos do banco para o bioma identificado.");
    if (source === "default") missingData.push("Bioma não identificado a partir do texto do usuário.");
    if (resources.consumers.length === 0) {
      missingData.push("Nenhum consumidor com dependência de recurso declarada no cenário.");
    }

    return {
      score,
      label: plausibilityBand(score),
      components,
      issues,
      assumptions: [
        "Disponibilidade de recurso é heurística em nível de grid, não botânica por planta.",
        "Populações seguem uma pirâmide trófica aproximada (base:meso:apex ≈ 100:20:5).",
        "Elos de predação usam preySpeciesIds do catálogo; recursos vegetais são implícitos por bioma.",
        "A pontuação combina coerência interna da simulação com a cobertura de fatos do banco.",
      ],
      missingData,
      positiveFactors,
      blockingContradictions,
    };
  }
}

export const ecologicalPlausibilityEvaluator = new EcologicalPlausibilityEvaluator();
