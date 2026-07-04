import assert from "node:assert/strict";
import test from "node:test";
import {
  faunaDefinitionService,
  listCatalogSpecies,
} from "./simulation/fauna-definition.service";
import {
  RESOURCE_CATALOG,
  RESOURCE_TYPES,
  resourceAvailabilityEvaluator,
  resourceNeedsFor,
} from "./simulation/resource-base";
import { ECOSYSTEM_PROFILES, ecosystemProfileService } from "./simulation/ecosystem-profiles";
import { ecologicalPlausibilityEvaluator } from "./simulation/ecological-plausibility.service";
import { trophicNetworkResolver } from "./simulation/trophic-network.service";
import {
  INVADER_PROFILES,
  buildImpactMechanisms,
  resolveProfile,
  type InvasiveMechanismKind,
} from "./simulation/invasive-scenario.service";

const RESOURCE_TYPE_SET = new Set(RESOURCE_TYPES);
const MECHANISM_KINDS = new Set<InvasiveMechanismKind>([
  "predacao",
  "competicao-alimentar",
  "competicao-espaco",
  "engenharia-habitat",
  "transmissao-doenca",
  "hibridizacao",
  "sobrepastejo",
  "supressao-vegetal",
  "alteracao-aquatica",
  "cascata-trofica",
  "deplecao-recursos",
]);

// ─── Resource needs semantics ────────────────────────────────────────────────────

test("Curated: herbivores require basal resources; carnivores require none", () => {
  const herbivore = resourceNeedsFor({
    category: "herbivore-large",
    feedingStrategy: "herbivore",
    habitableBiomes: ["savana-tropical"],
  });
  assert.ok(herbivore.length > 0, "herbivore must depend on a basal resource");
  assert.deepEqual(
    resourceNeedsFor({ category: "predator-large", feedingStrategy: "carnivore", habitableBiomes: ["savana-tropical"] }),
    [],
    "obligate carnivore depends on prey, not on the plant base"
  );
});

test("Curated: omnivores draw on both plant/resource base and (optionally) animal prey", () => {
  const omnivore = resourceNeedsFor({
    category: "herbivore-small",
    feedingStrategy: "omnivore",
    habitableBiomes: ["mata-atlantica"],
  });
  assert.ok(omnivore.includes("frutos-sementes") && omnivore.includes("detrito"));
  // A catalog omnivore that also hunts (lobo-guará) keeps prey while still needing a resource base.
  const wolf = listCatalogSpecies().find((s) => s.id === "lobo-guara");
  assert.ok(wolf && wolf.feedingStrategy === "omnivore");
  assert.ok(wolf!.resourceNeeds.length > 0, "omnivore keeps a resource base");
  assert.ok(wolf!.preySpeciesIds.length > 0, "omnivore can also have animal prey");
});

// ─── Catalog data integrity ──────────────────────────────────────────────────────

test("Curated: no species references a missing prey id, and no resource need is invalid", () => {
  const ids = new Set(listCatalogSpecies().map((s) => s.id));
  for (const species of listCatalogSpecies()) {
    for (const preyId of species.preySpeciesIds) {
      assert.ok(ids.has(preyId), `${species.id} references missing prey ${preyId}`);
    }
    assert.deepEqual(species.diet, species.preySpeciesIds, `${species.id} diet must mirror preySpeciesIds`);
    for (const need of species.resourceNeeds) {
      assert.ok(RESOURCE_TYPE_SET.has(need), `${species.id} needs unknown resource ${need}`);
    }
    if (species.feedingStrategy === "carnivore") {
      assert.equal(species.resourceNeeds.length, 0, `${species.id} carnivore should not need a plant base`);
    }
  }
});

test("Curated: every predator has at least one plausible prey co-occurring in some biome", () => {
  const catalog = listCatalogSpecies();
  const byId = new Map(catalog.map((s) => [s.id, s]));
  for (const predator of catalog) {
    if (predator.preySpeciesIds.length === 0) continue;
    const coOccurs = predator.preySpeciesIds.some((preyId) => {
      const prey = byId.get(preyId);
      return prey && prey.habitableBiomes.some((b) => predator.habitableBiomes.includes(b));
    });
    assert.ok(coOccurs, `${predator.id} has no prey sharing any of its biomes`);
  }
});

// ─── Trophic pruning (active links only when both sides exist) ───────────────────

test("Curated: a predator is pruned when none of its prey is present in the resolved biomes", () => {
  // jacaré-do-pantanal lives in pantanal+lago; its prey (capivara/piranha/pacu) need `lago`.
  const pantanalOnly = faunaDefinitionService.resolveBiomes(["pantanal"]);
  assert.ok(
    !pantanalOnly.species.some((s) => s.id === "jacare-do-pantanal"),
    "jacaré must be pruned when no prey is present in pantanal-only"
  );
  const withWater = faunaDefinitionService.resolveBiomes(["pantanal", "lago"]);
  const jacare = withWater.species.find((s) => s.id === "jacare-do-pantanal");
  assert.ok(jacare, "jacaré should survive once its aquatic prey is present");
  const presentIds = new Set(withWater.species.map((s) => s.id));
  for (const preyId of jacare!.preySpeciesIds) {
    assert.ok(presentIds.has(preyId), `jacaré prey ${preyId} must be present`);
  }
  // Trophic resolver reports active links referencing only present prey.
  const report = trophicNetworkResolver.resolve(withWater.species);
  for (const link of report.links) assert.ok(presentIds.has(link.preyId));
});

// ─── Invasive profiles ───────────────────────────────────────────────────────────

test("Curated: at least 10 invasive/introduced profiles exist with named mechanisms", () => {
  assert.ok(INVADER_PROFILES.length >= 10, `expected >= 10 invaders, got ${INVADER_PROFILES.length}`);
  for (const profile of INVADER_PROFILES) {
    assert.ok(profile.mechanisms.length > 0, `${profile.displayName} must declare mechanisms`);
    for (const kind of profile.mechanisms) {
      assert.ok(MECHANISM_KINDS.has(kind), `${profile.displayName} has unknown mechanism ${kind}`);
    }
  }
});

test("Curated: invasive mechanisms are named objects, not generic 'damage'", () => {
  const boar = resolveProfile("javali");
  const mechanisms = buildImpactMechanisms(
    boar,
    [{ speciesId: "veado-campeiro", commonName: "Veado-campeiro", effect: "competition", populationDelta: -2 }],
    [{ type: "pastagem", label: "Pastagem herbácea", detail: "" }]
  );
  assert.ok(mechanisms.length > 0);
  for (const m of mechanisms) {
    assert.ok(MECHANISM_KINDS.has(m.kind));
    assert.ok(m.label.length > 0 && m.description.length > 0);
    assert.notEqual(m.description.toLowerCase(), "dano");
  }
});

test("Curated: invaders cover diverse taxa (mammal, fish, amphibian, invertebrate)", () => {
  const taxa = new Set(INVADER_PROFILES.map((p) => p.taxonGroup ?? "mamífero"));
  assert.ok(taxa.has("peixe"), "expected a fish invader");
  assert.ok(taxa.has("anfíbio"), "expected an amphibian invader");
  assert.ok(taxa.has("invertebrado"), "expected an invertebrate invader");
});

// ─── Resource catalog ─────────────────────────────────────────────────────────────

test("Curated: RESOURCE_CATALOG covers every ResourceType exactly once", () => {
  const catalogued = RESOURCE_CATALOG.map((r) => r.resourceType);
  assert.equal(new Set(catalogued).size, catalogued.length, "no duplicate resource entries");
  for (const type of RESOURCE_TYPES) {
    assert.ok(catalogued.includes(type), `RESOURCE_CATALOG missing ${type}`);
  }
  for (const r of RESOURCE_CATALOG) {
    assert.ok(r.confidence > 0 && r.confidence <= 1, `${r.resourceType} confidence out of range`);
    assert.ok(r.description.length > 0 && r.sourceNotes.length > 0);
  }
});

// ─── Ecosystem profiles resolve plausible fauna/resource sets ───────────────────

test("Curated: 10 ecosystem profiles exist with valid resource/biome references", () => {
  assert.equal(ECOSYSTEM_PROFILES.length, 10);
  for (const profile of ECOSYSTEM_PROFILES) {
    assert.ok(profile.compatibleBiomes.length > 0, `${profile.slug} needs biomes`);
    for (const resource of profile.dominantResources) {
      assert.ok(RESOURCE_TYPE_SET.has(resource), `${profile.slug} references unknown resource ${resource}`);
    }
    assert.ok(profile.confidence > 0 && profile.confidence <= 1);
    assert.equal(ecosystemProfileService.getBySlug(profile.slug), profile);
  }
});

test("Curated: Brazilian ecosystem profiles resolve plausible fauna and a resource base", () => {
  for (const slug of ["amazonia", "cerrado", "pantanal", "mata-atlantica", "caatinga"]) {
    const profile = ecosystemProfileService.getBySlug(slug)!;
    const { species } = faunaDefinitionService.resolveBiomes(profile.compatibleBiomes);
    assert.ok(species.length > 0, `${slug} should resolve fauna`);
    const assessment = resourceAvailabilityEvaluator.assessFromBiomes(profile.compatibleBiomes, species);
    assert.ok(assessment.resourceBase.length > 0, `${slug} should expose a resource base`);
    // Every resolved herbivore/omnivore either finds support or is explicitly flagged.
    for (const consumer of assessment.consumers) {
      assert.equal(consumer.supported, consumer.satisfiedBy.length > 0);
    }
  }
});

// ─── Ecosystem-profile matching & plausibility influence (Worker E wiring) ──────

test("Profile: prompt/biome slugs (with aliases) match a curated profile", () => {
  assert.equal(ecosystemProfileService.matchForReport("amazonia", [])?.slug, "amazonia");
  // Alias: prompt "mangue" → manguezal; "oceano" → costeiro-marinho; "lago" → rio-lago-dulcicola.
  assert.equal(ecosystemProfileService.matchForReport("mangue", [])?.slug, "manguezal");
  assert.equal(ecosystemProfileService.matchForReport("oceano", [])?.slug, "costeiro-marinho");
  // Fallback via dominant grid biome when the slug is unknown.
  assert.equal(
    ecosystemProfileService.matchForReport("desconhecido", ["floresta-tropical-umida"])?.slug,
    "amazonia"
  );
  // No plausible match → undefined (pipeline stays working).
  assert.equal(ecosystemProfileService.matchForReport("inexistente", ["tundra"]), undefined);
});

test("Profile: compatible conditions produce no penalty mismatches", () => {
  const amazon = ecosystemProfileService.getBySlug("amazonia")!;
  const result = ecosystemProfileService.assessConsistency(amazon, {
    temperatureC: 27,
    precipitationMmYear: 2600,
    humidityPct: 88,
    waterCoveragePct: 20,
    avgSalinityPsu: 0,
    caveCells: 0,
    presentResources: new Set(["folhagem-dossel", "frutos-sementes", "folhagem-arbustiva", "detrito"]),
  });
  assert.equal(result.mismatches.length, 0, `unexpected mismatches: ${result.mismatches.join("; ")}`);
  assert.equal(result.consistencyScore, 1);
});

test("Profile: incompatible conditions add mismatches and lower consistency", () => {
  const mangrove = ecosystemProfileService.getBySlug("manguezal")!;
  // Cold, dry, no water, no salinity → several divergences vs. a warm brackish coastal profile.
  const result = ecosystemProfileService.assessConsistency(mangrove, {
    temperatureC: 2,
    precipitationMmYear: 200,
    humidityPct: 30,
    waterCoveragePct: 0,
    avgSalinityPsu: 0,
    caveCells: 0,
    presentResources: new Set(),
  });
  assert.ok(result.mismatches.length >= 2, "expected multiple mismatches for a dry cold mangrove");
  assert.ok(result.consistencyScore < 1);
});

test("Profile: a matched inconsistent profile lowers the validation score vs. a consistent one", () => {
  const base = {
    source: "keyword" as const,
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
      resourceBase: [{ type: "pastagem" as const, label: "Pastagem", availability: 0.8, sources: ["grassland"] }],
      consumers: [{ speciesId: "b", commonName: "B", needs: ["pastagem" as const], satisfiedBy: ["pastagem" as const], supported: true }],
      unsupportedConsumers: [],
      resourceWarnings: [],
      herbivorePressure: { level: "baixa" as const, ratio: 0.2, detail: "" },
    },
    grounding: { coverageSufficient: true, factCount: 6 },
    hasSpecialHabitat: false,
  };
  const consistent = ecologicalPlausibilityEvaluator.evaluateEcosystem({
    ...base,
    profile: { matched: true, displayName: "Cerrado", consistencyScore: 1, mismatches: [] },
  });
  const inconsistent = ecologicalPlausibilityEvaluator.evaluateEcosystem({
    ...base,
    profile: {
      matched: true,
      displayName: "Manguezal",
      consistencyScore: 0.28,
      mismatches: ["Perfil marinho espera salinidade alta.", "Espera corpos d'água."],
    },
  });
  assert.ok(inconsistent.score < consistent.score, "profile mismatches must reduce the score");
  assert.ok(
    inconsistent.components.some((c) => c.key === "profile-consistency"),
    "a profile component is added when a profile matched"
  );
  assert.ok(inconsistent.issues.some((i) => i.includes("salinidade")), "mismatches surface as issues");
});

test("Profile: omitting the profile keeps scoring identical to the profile-free path", () => {
  const base = {
    source: "llm" as const,
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
      resourceBase: [],
      consumers: [],
      unsupportedConsumers: [],
      resourceWarnings: [],
      herbivorePressure: { level: "baixa" as const, ratio: 0, detail: "" },
    },
    grounding: { coverageSufficient: true, factCount: 6 },
    hasSpecialHabitat: false,
  };
  const withoutProfile = ecologicalPlausibilityEvaluator.evaluateEcosystem(base);
  const withUnmatched = ecologicalPlausibilityEvaluator.evaluateEcosystem({
    ...base,
    profile: { matched: false, displayName: "", consistencyScore: 1, mismatches: [] },
  });
  assert.equal(withUnmatched.score, withoutProfile.score, "unmatched profile must not change the score");
  assert.equal(withUnmatched.components.length, withoutProfile.components.length);
});

test("Curated: cave profile resolves cave fauna and a cave-based resource", () => {
  const cave = ecosystemProfileService.getBySlug("caverna-tropical")!;
  const { species } = faunaDefinitionService.resolveBiomes(cave.compatibleBiomes);
  assert.ok(species.some((s) => s.habitableBiomes.includes("caverna")), "cave profile resolves cave fauna");
  const assessment = resourceAvailabilityEvaluator.assessFromBiomes(cave.compatibleBiomes, species);
  assert.ok(
    assessment.resourceBase.some((r) => r.type === "materia-organica-cavernicola"),
    "cave resource base must include cave organic matter"
  );
});
