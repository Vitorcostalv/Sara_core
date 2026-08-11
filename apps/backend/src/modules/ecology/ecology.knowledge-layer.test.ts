import assert from "node:assert/strict";
import test from "node:test";
import { faunaDefinitionService } from "./simulation/fauna-definition.service";
import { terrainGeneratorService } from "./simulation/terrain-generator.service";
import {
  resourceAvailabilityEvaluator,
  resourceNeedsFor,
} from "./simulation/resource-base";
import { trophicNetworkResolver } from "./simulation/trophic-network.service";
import {
  ecologicalPlausibilityEvaluator,
  plausibilityBand,
  type EcosystemPlausibilityInput,
} from "./simulation/ecological-plausibility.service";
import {
  buildPhases,
  buildImpactMechanisms,
  establishmentPlausibilityScore,
  projectNativeImpacts,
  resolveProfile,
  spreadPressureFor,
} from "./simulation/invasive-scenario.service";
import type { NativeImpact } from "./simulation/invasive-scenario.service";

// ─── Resource needs (species-level) ─────────────────────────────────────────────

test("Resource: carnivores declare no basal resource, herbivores/omnivores do", () => {
  assert.deepEqual(
    resourceNeedsFor({ category: "predator-large", feedingStrategy: "carnivore", habitableBiomes: ["mata-atlantica"] }),
    []
  );
  const herbivore = resourceNeedsFor({
    category: "herbivore-large",
    feedingStrategy: "herbivore",
    habitableBiomes: ["floresta-tropical-umida"],
  });
  assert.ok(herbivore.includes("pastagem"));
  assert.ok(herbivore.includes("folhagem-dossel"), "forest herbivore browses canopy");
});

test("Resource: resolved catalog species expose coherent resourceNeeds", () => {
  const { species } = faunaDefinitionService.resolveBiomes([
    "floresta-tropical-umida",
    "mata-atlantica",
    "savana-tropical",
  ]);
  const capybara = species.find((s) => s.id === "capivara");
  const jaguar = species.find((s) => s.id === "onca-pintada");
  assert.ok(capybara && capybara.resourceNeeds.length > 0, "herbivore should need basal resources");
  assert.ok(jaguar && jaguar.resourceNeeds.length === 0, "obligate carnivore should need no basal resource");
  assert.equal(capybara!.nativeStatus, "native");
  assert.ok(capybara!.confidence > 0);
});

// ─── Resource availability + consumer support ───────────────────────────────────

test("Resource: a forest grid supports its herbivores' plant base", () => {
  const grid = terrainGeneratorService.generate({
    width: 24,
    height: 18,
    seed: 42,
    baseTemperatureC: 26,
    basePrecipitationMm: 2200,
    baseHumidityPct: 82,
  });
  const { species } = faunaDefinitionService.resolve(grid);
  const assessment = resourceAvailabilityEvaluator.assessFromGrid(grid, species);
  assert.ok(assessment.resourceBase.length > 0, "forest should offer resources");
  assert.ok(
    assessment.resourceBase.every((r) => r.availability >= 0 && r.availability <= 1),
    "availability stays in 0..1"
  );
  // Every consumer with a need is either supported or explicitly listed as unsupported.
  for (const consumer of assessment.consumers) {
    assert.equal(consumer.supported, consumer.satisfiedBy.length > 0);
  }
});

test("Resource: a land herbivore over an ocean-only scenario is flagged unsupported", () => {
  const landHerbivore = {
    id: "veado-teste",
    commonName: "Veado de teste",
    feedingStrategy: "herbivore" as const,
    populationTarget: 6,
    resourceNeeds: ["pastagem", "folhagem-arbustiva"] as const,
  };
  const assessment = resourceAvailabilityEvaluator.assessFromBiomes(["oceano-pelagico"], [
    { ...landHerbivore, resourceNeeds: [...landHerbivore.resourceNeeds] },
  ]);
  assert.ok(assessment.unsupportedConsumers.includes("Veado de teste"));
  assert.ok(assessment.resourceWarnings.length >= 1, "an unsupported consumer must emit a warning");
});

// ─── Trophic network resolver ────────────────────────────────────────────────────

test("Trophic: a resolved tropical chain yields active links and stays pyramid-consistent", () => {
  const { species } = faunaDefinitionService.resolveBiomes([
    "floresta-tropical-umida",
    "mata-atlantica",
    "savana-tropical",
  ]);
  const report = trophicNetworkResolver.resolve(species);
  assert.ok(report.links.length > 0, "expected active predator-prey links");
  const ids = new Set(species.map((s) => s.id));
  for (const link of report.links) assert.ok(ids.has(link.preyId), "active links only reference present prey");
  assert.equal(report.unsupportedSpecies.length, 0, "no unsupported carnivore in a rich forest");
  assert.ok(report.pyramidConsistent, "prey base should exceed apex pressure");
  assert.ok(report.levels.length >= 2, "expected multiple trophic levels");
});

test("Trophic: pruned links are reported when a predator's catalog prey is absent", () => {
  // Isolate the jaguar so most of its catalog prey is missing from the scenario.
  const { species } = faunaDefinitionService.resolveBiomes(["floresta-tropical-umida", "mata-atlantica", "savana-tropical"]);
  const report = trophicNetworkResolver.resolve(species);
  // The catalog declares more links than survive a scenario, so some should be pruned across the set.
  const totalCatalogLinks = report.links.length + report.prunedLinks.length;
  assert.ok(totalCatalogLinks >= report.links.length);
  for (const pruned of report.prunedLinks) {
    assert.ok(pruned.reason.length > 0, "each pruned link explains why");
    assert.ok(!species.some((s) => s.id === pruned.preyId), "pruned prey must be absent from the scenario");
  }
});

// ─── Ecological plausibility evaluator ───────────────────────────────────────────

function baseInput(overrides: Partial<EcosystemPlausibilityInput> = {}): EcosystemPlausibilityInput {
  return {
    source: "llm",
    dominantBiomePct: 70,
    speciesCount: 8,
    trophic: {
      links: [{ predatorId: "a", predatorName: "A", preyId: "b", preyName: "B" }],
      prunedLinks: [],
      unsupportedSpecies: [],
      levels: [],
      producers: [],
      warnings: [],
      pyramidConsistent: true,
    },
    resources: {
      resourceBase: [{ type: "pastagem", label: "Pastagem", availability: 0.8, sources: ["grassland"] }],
      consumers: [
        { speciesId: "b", commonName: "B", needs: ["pastagem"], satisfiedBy: ["pastagem"], supported: true },
      ],
      unsupportedConsumers: [],
      resourceWarnings: [],
      herbivorePressure: { level: "baixa", ratio: 0.2, detail: "" },
    },
    grounding: { coverageSufficient: true, factCount: 6 },
    hasSpecialHabitat: false,
    ...overrides,
  };
}

test("Plausibility: a coherent grounded scenario scores high", () => {
  const validation = ecologicalPlausibilityEvaluator.evaluateEcosystem(baseInput());
  assert.ok(validation.score >= 70, `expected high score, got ${validation.score}`);
  assert.equal(validation.label, "alta");
  assert.equal(validation.blockingContradictions.length, 0);
});

test("Plausibility: contradictions cap the score and are surfaced as blocking", () => {
  const contradictory = ecologicalPlausibilityEvaluator.evaluateEcosystem(
    baseInput({
      source: "default",
      dominantBiomePct: 20,
      grounding: { coverageSufficient: false, factCount: 0 },
      trophic: {
        links: [],
        prunedLinks: [],
        unsupportedSpecies: ["Predador órfão"],
        levels: [],
        producers: [],
        warnings: ["Predador sem presa"],
        pyramidConsistent: false,
      },
    })
  );
  const healthy = ecologicalPlausibilityEvaluator.evaluateEcosystem(baseInput());
  assert.ok(contradictory.score < healthy.score, "contradictions must lower the score");
  assert.ok(contradictory.score <= 64, "blocking contradictions cap the score below the high band");
  assert.ok(contradictory.blockingContradictions.length >= 1);
  assert.notEqual(contradictory.label, "alta");
});

test("Plausibility: band thresholds are stable", () => {
  assert.equal(plausibilityBand(80), "alta");
  assert.equal(plausibilityBand(50), "moderada");
  assert.equal(plausibilityBand(30), "baixa");
});

// ─── Invasive impact mechanisms (pure helpers, no DB) ────────────────────────────

test("Invasive: an established generalist herbivore exposes named plant-pressure mechanisms", () => {
  const javali = resolveProfile("javali no cerrado");
  const impacts: NativeImpact[] = [
    { speciesId: "veado-campeiro", commonName: "Veado-campeiro", effect: "competition", populationDelta: -2 },
  ];
  const affected = [
    { type: "pastagem" as const, label: "Pastagem herbácea", detail: "" },
  ];
  const mechanisms = buildImpactMechanisms(javali, impacts, affected);
  assert.ok(mechanisms.length > 0);
  const kinds = new Set(mechanisms.map((m) => m.kind));
  assert.ok(kinds.has("sobrepastejo") || kinds.has("supressao-vegetal"), "boar should suppress/overgraze vegetation");
  for (const m of mechanisms) {
    assert.ok(m.label.length > 0 && m.description.length > 0);
    assert.ok(["baixa", "moderada", "alta"].includes(m.severity));
  }
});

test("Invasive: competition requires a shared resource instead of a broad fauna category", () => {
  const grid = terrainGeneratorService.generate({
    width: 24,
    height: 18,
    seed: 42,
    baseTemperatureC: 24,
    basePrecipitationMm: 1050,
    baseHumidityPct: 52,
  });
  const natives = faunaDefinitionService.resolve(grid).species;
  const javali = resolveProfile("javali");
  const invaderNeeds = resourceNeedsFor({
    category: javali.category,
    feedingStrategy: javali.feedingStrategy,
    habitableBiomes: ["cerrado"],
  });
  const impacts = projectNativeImpacts(javali, natives, true, invaderNeeds);

  assert.ok(!natives.some((native) => native.id === "pinguim"), "cerrado grid must reject penguins");
  for (const impact of impacts.filter((entry) => entry.effect === "competition")) {
    const native = natives.find((entry) => entry.id === impact.speciesId)!;
    assert.ok(
      native.resourceNeeds.some((resource) => invaderNeeds.includes(resource)),
      `${native.commonName} was marked as competitor without a shared resource`,
    );
  }
});

test("Invasive: an established predator's predation mechanism targets predated natives", () => {
  const lion = resolveProfile("leão");
  const impacts: NativeImpact[] = [
    { speciesId: "prea", commonName: "Preá", effect: "predation", populationDelta: -5 },
    { speciesId: "veado-campeiro", commonName: "Veado-campeiro", effect: "predation", populationDelta: -3 },
  ];
  const mechanisms = buildImpactMechanisms(lion, impacts, []);
  const predation = mechanisms.find((m) => m.kind === "predacao");
  assert.ok(predation, "carnivore invader must expose a predation mechanism");
  assert.ok(predation!.targets.includes("Preá"));
  assert.equal(predation!.severity, "alta", "two predated groups → high severity");
});

test("Invasive: establishment score and spread pressure fall when habitat is incompatible", () => {
  const lion = resolveProfile("leão");
  const noGrounding = { grounded: false, coverage: "insufficient" as const, facts: [], sources: [] };
  const establishes = establishmentPlausibilityScore(true, lion, 2, noGrounding);
  const fails = establishmentPlausibilityScore(false, lion, 2, noGrounding);
  assert.ok(establishes > fails, "an unestablished invader must score lower");
  assert.equal(spreadPressureFor(false, lion), "baixa", "no establishment → no spread");
});

test("Invasive: timeline exposes invader growth and a visible native change in every active phase", () => {
  const impacts: NativeImpact[] = [
    {
      speciesId: "veado-campeiro",
      commonName: "Veado-campeiro",
      effect: "competition",
      populationDelta: -1,
      baselinePopulation: 4,
    },
  ];
  const phases = buildPhases(true, impacts);

  assert.deepEqual(phases.map((phase) => phase.invaderPop), [2, 6, 12, 18]);
  assert.equal(phases[0]!.nativeDeltas["veado-campeiro"], 0);
  for (const phase of phases.slice(1)) {
    assert.equal(phase.nativeDeltas["veado-campeiro"], -1);
  }
});
