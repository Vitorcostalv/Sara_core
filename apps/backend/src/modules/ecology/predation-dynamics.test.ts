import assert from "node:assert/strict";
import test from "node:test";
import { getCatalogSpecies, listCatalogSpecies, faunaDefinitionService } from "./simulation/fauna-definition.service";
import type { SpeciesDefinition } from "./simulation/fauna-definition.service";
import { projectPredationScenario } from "./simulation/predation-dynamics.service";
import { canInvaderPreyOn, resolveProfile } from "./simulation/invasive-scenario.service";
import { resourceAvailabilityEvaluator } from "./simulation/resource-base";
import { trophicNetworkResolver } from "./simulation/trophic-network.service";

function animal(id: string, overrides: Partial<SpeciesDefinition> = {}): SpeciesDefinition {
  return { ...structuredClone(getCatalogSpecies("prea")!), id, populationTarget: 8,
    resourceNeeds: ["pastagem"], mass: 0.3, preySpeciesIds: [], diet: [], ...overrides };
}
const food = [{ type: "pastagem" as const, label: "Pastagem", availability: 1, sources: ["grassland"] }];
const hunter = (prey: string[]) => animal("introduced", {
  feedingStrategy: "carnivore", trophicLevel: "apex", category: "predator-large",
  preySpeciesIds: prey, diet: prey, resourceNeeds: [], mass: 0.4, populationTarget: 2,
});

test("Predation: no enemies plus no prey causes decline, not unlimited growth or devastation", () => {
  const projection = projectPredationScenario({ natives: [], invader: hunter(["missing-prey"]), habitatCompatible: true, resources: [] });
  assert.equal(projection.snapshots.at(-1)!.populations.introduced, 0);
  assert.equal(projection.outcome, "food-limited");
  assert.ok(projection.actions.some((a) => a.kind === "food-limited"));
  assert.deepEqual(projection.network, []);
  assert.ok(projection.warnings.some((w) => w.includes("não comprova")));
});

test("Predation: predator-free consumers grow only within finite food/capacity limits", () => {
  const invader = animal("introduced", { populationTarget: 2 });
  const projection = projectPredationScenario({ natives: [], invader, habitatCompatible: true, resources: food });
  const population = projection.snapshots.at(-1)!.populations.introduced!;
  assert.ok(population > 0 && population < 100);
  assert.equal(projection.outcome, "limited-change");
  assert.ok(projection.actions.some((a) => a.kind === "no-change"));
  assert.ok(!projection.actions.some((a) => a.kind === "predation-pressure"));
});

test("Predation: an incompatible introduction cannot affect native populations or resources", () => {
  const prey = animal("prey");
  const result = projectPredationScenario({ natives: [prey], invader: hunter(["prey"]), habitatCompatible: false, resources: food });
  assert.equal(result.outcome, "failed-establishment");
  assert.equal(result.snapshots.at(-1)!.populations.introduced, 0);
  for (const step of result.snapshots) {
    assert.equal(step.populations.prey, step.controlPopulations.prey);
    assert.deepEqual(step.resources, step.controlResources);
  }
  assert.ok(!result.actions.some((action) => action.kind === "resource-pressure"));
});

test("Predation: adding a hunter reduces its declared prey relative to the control", () => {
  const result = projectPredationScenario({ natives: [animal("prey")], invader: hunter(["prey"]), habitatCompatible: true, resources: food });
  assert.deepEqual(result.network, [{ predatorId: "introduced", preyId: "prey" }]);
  assert.ok(result.snapshots.some((s) => s.tSeconds > 0 && s.populations.prey! < s.controlPopulations.prey!));
});

test("Predation: a predator can be prey and explicit higher consumers reduce its population", () => {
  const prey = animal("prey", { populationTarget: 20 });
  const introduced = hunter(["prey"]);
  const top = animal("top", { feedingStrategy: "carnivore", category: "predator-large", trophicLevel: "apex",
    preySpeciesIds: ["introduced"], diet: ["introduced"], resourceNeeds: [], mass: 0.6, populationTarget: 8 });
  const without = projectPredationScenario({ natives: [prey], invader: introduced, habitatCompatible: true, resources: food });
  const withTop = projectPredationScenario({ natives: [prey, top], invader: introduced, habitatCompatible: true, resources: food });
  assert.deepEqual(withTop.regulators, ["top"]);
  assert.ok(withTop.network.some((l) => l.predatorId === "top" && l.preyId === "introduced"));
  assert.ok(withTop.snapshots.some((s, i) => s.populations.introduced! < without.snapshots[i]!.populations.introduced!));
});

test("Predation: unsupported links and cannibalism are not fabricated into the network", () => {
  const result = projectPredationScenario({ natives: [animal("prey")], invader: hunter(["missing", "introduced", "prey", "prey"]), habitatCompatible: true, resources: food });
  assert.deepEqual(result.network, [{ predatorId: "introduced", preyId: "prey" }]);
});

test("Predation: depleted basal resources feed back into consumer survival", () => {
  const invader = animal("introduced", { populationTarget: 2 });
  const rich = projectPredationScenario({ natives: [], invader, habitatCompatible: true, resources: food });
  const empty = projectPredationScenario({ natives: [], invader, habitatCompatible: true, resources: [] });
  assert.ok(rich.snapshots.at(-1)!.populations.introduced! > empty.snapshots.at(-1)!.populations.introduced!);
  assert.equal(empty.snapshots.at(-1)!.populations.introduced, 0);
});

test("Predation: extinction never spontaneously respawns and numeric states remain bounded", () => {
  const result = projectPredationScenario({ natives: [animal("extinct", { populationTarget: 0 })],
    invader: hunter(["extinct"]), habitatCompatible: true, resources: food });
  for (const step of result.snapshots) {
    assert.equal(step.populations.extinct, 0);
    for (const pop of Object.values(step.populations)) assert.ok(Number.isInteger(pop) && pop >= 0 && pop <= 100);
    for (const availability of Object.values(step.resources)) assert.ok(Number.isFinite(availability) && availability >= 0 && availability <= 1);
  }
});

test("Predation: projections are deterministic and do not mutate the catalog or caller", () => {
  const input = { natives: [animal("prey")], invader: hunter(["prey"]), habitatCompatible: true, resources: food };
  const original = structuredClone(input);
  assert.deepEqual(projectPredationScenario(input), projectPredationScenario(input));
  assert.deepEqual(input, original);
});

test("Predation: invalid populations, masses and duplicate ids are rejected", () => {
  for (const overrides of [{ populationTarget: NaN }, { populationTarget: -1 }, { populationTarget: 101 }, { populationTarget: 0.5 }, { mass: 0 }, { mass: Infinity }, { mass: 1e308 }]) {
    assert.throws(() => projectPredationScenario({ natives: [], invader: animal("introduced", overrides), habitatCompatible: true, resources: food }));
  }
  assert.throws(() => projectPredationScenario({ natives: [animal("introduced")], invader: hunter([]), habitatCompatible: true, resources: food }));
});

test("Trophic report: missing prey and self-links are pruned and orphan hunters are flagged", () => {
  const orphan = hunter(["missing", "introduced"]);
  const report = trophicNetworkResolver.resolve([orphan]);
  assert.deepEqual(report.links, []);
  assert.equal(report.prunedLinks.length, 2);
  assert.ok(report.unsupportedSpecies.includes(orphan.commonName));
});

test("Trophic report: herbivorous animals are consumers, not listed as basal producers", () => {
  const prey = animal("prey");
  const resources = resourceAvailabilityEvaluator.assessFromBiomes(["savana-tropical"], [prey]);
  const report = trophicNetworkResolver.resolve([prey], resources);
  assert.ok(!report.producers.includes(prey.commonName));
  assert.ok(report.producers.length > 0);
});

test("Predation: category alone never makes ants, sloths or frogs lion prey", () => {
  const lion = resolveProfile("leão");
  for (const id of ["formiga-cortadeira", "preguica-tres-dedos", "sapo-cururu", "tatu-bola"]) {
    assert.equal(canInvaderPreyOn(lion, getCatalogSpecies(id)!), false, id);
  }
  assert.equal(canInvaderPreyOn(lion, getCatalogSpecies("capivara")!), true);
});

for (const biome of ["floresta-tropical-umida", "mata-atlantica", "savana-tropical", "caatinga", "pantanal", "manguezal", "lago", "tundra", "montanha", "oceano-polar"]) {
  test(`Predation: catalog network invariants across ${biome}`, () => {
    const natives = faunaDefinitionService.resolveBiomes([biome]).species;
    const resources = resourceAvailabilityEvaluator.assessFromBiomes([biome], natives).resourceBase;
    const original = structuredClone(listCatalogSpecies());
    const result = projectPredationScenario({ natives, invader: hunter(natives.filter((s) => s.feedingStrategy !== "carnivore").slice(0, 2).map((s) => s.id)), habitatCompatible: true, resources });
    const ids = new Set([...natives.map((s) => s.id), "introduced"]);
    for (const link of result.network) { assert.ok(ids.has(link.predatorId)); assert.ok(ids.has(link.preyId)); }
    for (const snapshot of result.snapshots) for (const pop of Object.values(snapshot.populations)) assert.ok(Number.isFinite(pop) && pop >= 0 && pop <= 100);
    assert.deepEqual(listCatalogSpecies(), original);
  });
}
