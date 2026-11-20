import type { InvasionPhase, SpeciesDefinition } from "../../services/api/ecology";

/** Population targets are bounded by the selected projection, including extinction (zero). */
export function speciesForInvasionPhase(
  baseline: SpeciesDefinition[], invaderId: string, phase?: InvasionPhase,
): SpeciesDefinition[] {
  if (!phase) return baseline;
  return baseline.map((species) => ({
    ...species,
    populationManaged: true,
    populationTarget: Math.max(0, Math.round(species.id === invaderId
      ? phase.invaderPop : species.populationTarget + (phase.nativeDeltas[species.id] ?? 0))),
  }));
}
