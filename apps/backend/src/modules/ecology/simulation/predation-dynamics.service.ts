import type { PredationProjection, PredationSnapshot, EcosystemAction } from "@sara/shared-types";
import type { SpeciesDefinition } from "./fauna-definition.service";
import type { ResourceAvailability } from "./resource-base";

export const PREDATION_POLICY = [
  "Regras da simulação, não medições nem previsões ecológicas validadas:",
  "Use apenas elos predador→presa explicitamente presentes na rede; categoria ou tamanho não comprovam predação.",
  "Um predador também pode ser presa. Competição exige recursos ou presas compartilhados.",
  "Ausência de inimigos modelados não prova ausência de inimigos naturais e não implica devastação automática.",
  "Crescimento depende de habitat, alimento, competição, mortalidade e capacidade de suporte finita.",
  "Predadores sem alimento declinam; com alimento finito não crescem indefinidamente.",
  "Mudanças em consumidores podem afetar outras populações e recursos por cascatas tróficas; compare com o cenário sem introdução.",
  "Presas implícitas ou não catalogadas são uma incerteza, nunca licença para inventar espécies ou relações.",
  "Ações e populações são calculadas pelo motor; a LLM deve explicar o resultado e não alterar números, elos ou ações.",
].join("\n");

interface ProjectionInput {
  natives: SpeciesDefinition[];
  invader: SpeciesDefinition;
  habitatCompatible: boolean;
  resources: ResourceAvailability[];
}

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const rounded = (v: number) => Math.round(v * 1000) / 1000;
const snapshotTimes = [0, 30, 90, 180];

/** Fixed-step educational model. No random inputs, LLM writes, or database side effects. */
export function projectPredationScenario(input: ProjectionInput): PredationProjection {
  const all = [...input.natives, input.invader];
  const ids = new Set(all.map((s) => s.id));
  if (ids.size !== all.length) throw new Error("Duplicate species ids in predation scenario");
  for (const s of all) {
    if (!Number.isSafeInteger(s.populationTarget) || s.populationTarget < 0 || s.populationTarget > 100 || !Number.isFinite(s.mass) || s.mass <= 0 || s.mass > 100) {
      throw new Error("Invalid population or mass in predation scenario");
    }
  }
  const resources = new Map(input.resources.map((r) => [r.type, clamp(Number.isFinite(r.availability) ? r.availability : 0)]));
  const network = all.flatMap((s) => [...new Set(s.preySpeciesIds)]
    .filter((id) => ids.has(id) && id !== s.id)
    .map((preyId) => ({ predatorId: s.id, preyId })));
  const implicitFoodSpecies = input.natives.filter((s) => s.feedingStrategy === "carnivore" && s.preySpeciesIds.length === 0).map((s) => s.id);
  const regulators = network.filter((link) => link.preyId === input.invader.id).map((link) => link.predatorId);

  const run = (withInvader: boolean) => {
    const species = withInvader ? all : input.natives;
    const byId = new Map(species.map((s) => [s.id, s]));
    let populations = new Map(species.map((s) => [s.id, s.populationTarget]));
    let available = new Map(resources);
    const result = new Map<number, { populations: Record<string, number>; resources: Record<string, number> }>();
    const record = (time: number) => result.set(time, {
      populations: Object.fromEntries([...populations].map(([id, value]) => [id, Math.round(value)])),
      resources: Object.fromEntries([...available].map(([id, value]) => [id, rounded(value)])),
    });
    record(0);
    // Each step represents three display seconds, not biological elapsed time.
    for (let time = 3; time <= 180; time += 3) {
      const requested = new Map<string, { predatorId: string; amount: number }[]>();
      const foodGained = new Map<string, number>();
      const losses = new Map<string, number>();
      for (const predator of species) {
        if (predator.id === input.invader.id && !input.habitatCompatible) continue;
        const prey = [...new Set(predator.preySpeciesIds)].filter((id) => id !== predator.id && byId.has(id) && (populations.get(id) ?? 0) > 0);
        const preyTotal = prey.reduce((sum, id) => sum + (populations.get(id) ?? 0), 0);
        if (preyTotal <= 0) continue;
        const demand = 0.12 * (populations.get(predator.id) ?? 0) * preyTotal / (preyTotal + 3);
        for (const id of prey) {
          const requests = requested.get(id) ?? [];
          requests.push({ predatorId: predator.id, amount: demand * (populations.get(id) ?? 0) / preyTotal });
          requested.set(id, requests);
        }
      }
      for (const [preyId, requests] of requested) {
        const total = requests.reduce((sum, r) => sum + r.amount, 0);
        const scale = Math.min(1, 0.25 * (populations.get(preyId) ?? 0) / total);
        for (const request of requests) {
          const consumed = request.amount * scale;
          losses.set(preyId, (losses.get(preyId) ?? 0) + consumed);
          foodGained.set(request.predatorId, (foodGained.get(request.predatorId) ?? 0) + consumed * byId.get(preyId)!.mass);
        }
      }

      const grazing = new Map<string, number>();
      const next = new Map<string, number>();
      for (const s of species) {
        const population = populations.get(s.id) ?? 0;
        if (s.id === input.invader.id && !input.habitatCompatible) {
          next.set(s.id, population < 0.1 ? 0 : population * 0.5);
          continue;
        }
        const needs = [...new Set(s.resourceNeeds)];
        const plantFood = needs.length > 0 ? needs.reduce((sum, r) => sum + (available.get(r) ?? 0), 0) / needs.length : 0;
        const animalFood = s.id !== input.invader.id && s.preySpeciesIds.length === 0 && s.feedingStrategy === "carnivore"
          ? 0.65 // explicitly unmodeled food: uncertain, rather than fabricated links
          : clamp((foodGained.get(s.id) ?? 0) / Math.max(0.001, population * s.mass * 0.05));
        const nutrition = s.feedingStrategy === "carnivore" ? animalFood
          : s.feedingStrategy === "omnivore" ? Math.max(plantFood, animalFood * 0.8) : plantFood;
        const compatible = s.id !== input.invader.id || input.habitatCompatible;
        const capacity = Math.max(1, s.populationTarget * (s.id === input.invader.id ? 8 : 3));
        const growth = compatible ? 0.16 * nutrition * (1 - population / capacity) - 0.025 - 0.15 * (1 - nutrition) : -0.45;
        const value = population + population * growth - (losses.get(s.id) ?? 0);
        next.set(s.id, value < 0.05 ? 0 : clamp(value, 0, 100));
        if (compatible && s.feedingStrategy !== "carnivore") {
          for (const resource of needs) grazing.set(resource, (grazing.get(resource) ?? 0) + 0.002 * population * s.mass / Math.max(1, needs.length));
        }
      }
      populations = next;
      available = new Map([...resources].map(([type, initial]) => [type,
        clamp((available.get(type) ?? 0) + 0.07 * (initial - (available.get(type) ?? 0)) - (grazing.get(type) ?? 0))]));
      if (snapshotTimes.includes(time)) record(time);
    }
    return result;
  };

  const introduced = run(true);
  const control = run(false);
  const snapshots: PredationSnapshot[] = snapshotTimes.map((tSeconds) => ({
    tSeconds, ...introduced.get(tSeconds)!, controlPopulations: control.get(tSeconds)!.populations,
    controlResources: control.get(tSeconds)!.resources,
  }));
  const final = snapshots[snapshots.length - 1]!;
  const invaderFinal = final.populations[input.invader.id] ?? 0;
  const preyDeclined = input.natives.filter((s) => {
    const reference = final.controlPopulations[s.id] ?? 0;
    return reference > 0 && (final.populations[s.id] ?? 0) < reference * 0.65;
  });
  const outcome: PredationProjection["outcome"] = !input.habitatCompatible ? "failed-establishment"
    : invaderFinal === 0 ? "food-limited" : regulators.length > 0 ? "regulated"
      : preyDeclined.length > 0 ? "prey-decline" : "limited-change";
  const actions: EcosystemAction[] = [];
  const add = (kind: EcosystemAction["kind"], targetSpeciesId: string, reason: string) =>
    actions.push({ id: `${kind}:${targetSpeciesId}`, kind, targetSpeciesId, reason });
  if (!input.habitatCompatible) add("decline", input.invader.id, "Habitat incompatível; a população introduzida declina sem se estabelecer.");
  else if (invaderFinal === 0) add("food-limited", input.invader.id, "Alimento disponível e mortalidade limitam a população, mesmo sem inimigos modelados.");
  else if (regulators.length > 0) add("predator-control", input.invader.id, "Há elos explícitos de predação sobre a espécie introduzida; sua pressão é integrada à projeção.");
  else add("bounded-growth", input.invader.id, "Sem predadores registrados nesta rede; alimento, mortalidade e capacidade de suporte continuam limitando o crescimento.");
  for (const s of preyDeclined) add("predation-pressure", s.id, "População projetada menor que no controle sem introdução; inclui efeitos diretos e indiretos da rede.");
  if ([...resources.keys()].some((id) => (final.controlResources[id] ?? 0) > 0 && (final.resources[id] ?? 0) < final.controlResources[id]! * 0.6)) {
    add("resource-pressure", input.invader.id, "O consumo reduz recursos renováveis; a escassez retroage sobre o crescimento dos consumidores.");
  }
  if (outcome === "limited-change") add("no-change", input.invader.id, "Não foi projetada redução forte de nativos em relação ao controle; ausência de inimigos não implica devastação.");
  return {
    modelVersion: "food-web-v1", outcome, invaderId: input.invader.id,
    network, regulators, implicitFoodSpecies, snapshots, actions,
    warnings: [
      "Projeção educacional determinística, não um modelo ecológico calibrado. Segundos são tempo de apresentação.",
      ...(regulators.length === 0 ? ["Não há predador da invasora registrado nesta rede; isso não comprova ausência de inimigos naturais."] : []),
      ...(implicitFoodSpecies.length > 0 ? ["Há consumidores com alimento implícito não catalogado; seus efeitos têm incerteza adicional."] : []),
    ],
  };
}
