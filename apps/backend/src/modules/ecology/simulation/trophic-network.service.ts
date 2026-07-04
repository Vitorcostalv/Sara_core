import { catalogDietFor, type SpeciesDefinition, type TrophicLevel } from "./fauna-definition.service";
import type { ResourceBaseAssessment } from "./resource-base";

// ─── Trophic network resolver ───────────────────────────────────────────────────
//
// FaunaDefinitionService already prunes unavailable prey while resolving a scenario. This
// service turns the *resolved* species set into an explicit, explainable trophic network:
// which predator→prey links are active, which catalog links were pruned (and why), which
// consumers lack a resource/prey base, and whether the pyramid proportions are plausible.
// It is a reporting/consistency layer — it does not itself mutate the resolved fauna.

export interface TrophicLink {
  predatorId: string;
  predatorName: string;
  preyId: string;
  preyName: string;
}

export interface PrunedTrophicLink {
  predatorId: string;
  predatorName: string;
  preyId: string;
  reason: string;
}

export interface TrophicLevelSummary {
  level: TrophicLevel;
  count: number;
  species: string[];
}

export interface TrophicConsistencyReport {
  links: TrophicLink[];
  prunedLinks: PrunedTrophicLink[];
  /** Common names of consumers with neither a present prey nor a supporting resource base. */
  unsupportedSpecies: string[];
  levels: TrophicLevelSummary[];
  /** Producers/basal resources note (plant base is modeled via ResourceBaseAssessment). */
  producers: string[];
  warnings: string[];
  /** True when the pyramid proportions (apex ≤ meso ≤ base) hold. */
  pyramidConsistent: boolean;
}

const LEVEL_ORDER: TrophicLevel[] = ["producer", "herbivore", "mesopredator", "apex"];

export class TrophicNetworkResolver {
  /**
   * Build the trophic consistency report for a resolved species set. When a resource-base
   * assessment is supplied, herbivores/omnivores with no supporting resource are flagged as
   * unsupported even if they are not anyone's prey.
   */
  resolve(species: SpeciesDefinition[], resources?: ResourceBaseAssessment): TrophicConsistencyReport {
    const presentIds = new Set(species.map((s) => s.id));
    const nameOf = new Map(species.map((s) => [s.id, s.commonName]));

    const links: TrophicLink[] = [];
    const prunedLinks: PrunedTrophicLink[] = [];

    for (const predator of species) {
      // Active links: prey that survived scenario resolution.
      for (const preyId of predator.preySpeciesIds) {
        links.push({
          predatorId: predator.id,
          predatorName: predator.commonName,
          preyId,
          preyName: nameOf.get(preyId) ?? preyId,
        });
      }
      // Pruned links: catalog prey that is absent from this scenario.
      for (const preyId of catalogDietFor(predator.id)) {
        if (!presentIds.has(preyId) && !predator.preySpeciesIds.includes(preyId)) {
          prunedLinks.push({
            predatorId: predator.id,
            predatorName: predator.commonName,
            preyId,
            reason: "presa ausente do cenário (habitat/clima incompatível ou não resolvida)",
          });
        }
      }
    }

    const unsupportedResourceNames = new Set(resources?.unsupportedConsumers ?? []);
    const unsupportedSpecies: string[] = [];
    for (const s of species) {
      // An orphaned predator is a carnivore whose *declared* catalog prey was entirely pruned —
      // a genuine contradiction. Catalog carnivores that never declare prey (birds/fish feeding on
      // unmodeled small prey) are resource-implicit leaves, not contradictions.
      const orphanedPredator =
        s.feedingStrategy === "carnivore" && s.preySpeciesIds.length === 0 && catalogDietFor(s.id).length > 0;
      const consumerWithoutResource =
        s.feedingStrategy !== "carnivore" && s.preySpeciesIds.length === 0 && unsupportedResourceNames.has(s.commonName);
      if (orphanedPredator || consumerWithoutResource) {
        unsupportedSpecies.push(s.commonName);
      }
    }

    const levels = summarizeLevels(species);
    const warnings: string[] = [];

    const base = species.filter((s) => s.trophicLevel === "herbivore" || s.trophicLevel === "producer");
    const meso = species.filter((s) => s.trophicLevel === "mesopredator");
    const apex = species.filter((s) => s.trophicLevel === "apex");
    const basePop = base.reduce((n, s) => n + s.populationTarget, 0);
    const mesoPop = meso.reduce((n, s) => n + s.populationTarget, 0);
    const apexPop = apex.reduce((n, s) => n + s.populationTarget, 0);

    const pyramidConsistent = apexPop <= mesoPop + basePop && (meso.length === 0 || basePop >= apexPop);
    if (apexPop > basePop) {
      warnings.push("Pressão de predadores de topo supera a base de presas — cadeia potencialmente instável.");
    }
    if (mesoPop > basePop && basePop > 0) {
      warnings.push("Mesopredadores excedem a base de presas disponível.");
    }
    if (apex.length > 0 && base.length === 0) {
      warnings.push("Há predadores de topo sem base de herbívoros/produtores presente.");
    }
    for (const name of unsupportedSpecies) {
      warnings.push(`${name} não tem presa nem base de recurso suficiente no cenário.`);
    }

    return {
      links,
      prunedLinks,
      unsupportedSpecies,
      levels,
      producers: base.filter((s) => s.preySpeciesIds.length === 0).map((s) => s.commonName),
      warnings,
      pyramidConsistent,
    };
  }
}

function summarizeLevels(species: SpeciesDefinition[]): TrophicLevelSummary[] {
  const byLevel = new Map<TrophicLevel, string[]>();
  for (const s of species) {
    if (!byLevel.has(s.trophicLevel)) byLevel.set(s.trophicLevel, []);
    byLevel.get(s.trophicLevel)!.push(s.commonName);
  }
  return LEVEL_ORDER.filter((level) => byLevel.has(level)).map((level) => ({
    level,
    count: byLevel.get(level)!.length,
    species: byLevel.get(level)!,
  }));
}

export const trophicNetworkResolver = new TrophicNetworkResolver();
