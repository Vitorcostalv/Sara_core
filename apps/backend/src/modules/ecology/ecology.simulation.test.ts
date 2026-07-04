import assert from "node:assert/strict";
import test from "node:test";
import { terrainGeneratorService } from "./simulation/terrain-generator.service";
import type { TerrainCell, TerrainGrid } from "./simulation/terrain-generator.service";
import { faunaDefinitionService } from "./simulation/fauna-definition.service";
import { biomePresetService } from "./simulation/biome-preset.service";
import { biomeMappingService } from "./simulation/biome-mapping.service";
import { successionSimulatorService } from "./simulation/succession-simulator.service";
import { scenarioEngineService } from "./simulation/scenario-engine.service";
import { artificialEnvironmentService } from "./simulation/artificial-environment.service";
import { summarizeFormations } from "./ecosystem-report.service";
import { resourceAvailabilityEvaluator } from "./simulation/resource-base";
import { trophicNetworkResolver } from "./simulation/trophic-network.service";
import { ecologicalPlausibilityEvaluator } from "./simulation/ecological-plausibility.service";
import { ecosystemProfileService } from "./simulation/ecosystem-profiles";
import type { ArtificialProjectRow } from "./grounding/ecological-grounding.repository";

// Amazônia-like preset params (matches BiomePresetService "amazonia"): hot, very wet, humid lowland.
const AMAZON_PARAMS = {
  width: 48,
  height: 36,
  seed: 123,
  baseTemperatureC: 28,
  basePrecipitationMm: 2800,
  baseHumidityPct: 88,
} as const;

function dominantBiome(grid: TerrainGrid): { biome: string; pct: number } {
  const counts = new Map<string, number>();
  let total = 0;
  for (const cell of grid.cells.flat()) {
    if (cell.isWater) continue;
    total += 1;
    counts.set(cell.biomeSuggestion, (counts.get(cell.biomeSuggestion) ?? 0) + 1);
  }
  const [biome, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];
  return { biome, pct: total > 0 ? (count / total) * 100 : 0 };
}

// ─── Terrain generator ────────────────────────────────────────────────────────

test("Simulation: terrain generator produces correct dimensions", () => {
  const grid = terrainGeneratorService.generate({
    width: 8,
    height: 6,
    seed: 42,
    baseTemperatureC: 20,
    basePrecipitationMm: 1200,
    baseHumidityPct: 60,
  });
  assert.equal(grid.width, 8);
  assert.equal(grid.height, 6);
  assert.equal(grid.cells.length, 6);
  assert.equal(grid.cells[0]!.length, 8);
});

test("Simulation: terrain cells have valid elevation range (0–1)", () => {
  const grid = terrainGeneratorService.generate({
    width: 4,
    height: 4,
    seed: 123,
    baseTemperatureC: 15,
    basePrecipitationMm: 800,
    baseHumidityPct: 50,
  });
  grid.cells.flat().forEach((cell) => {
    assert.ok(cell.elevation >= 0 && cell.elevation <= 1, `elevation out of range: ${cell.elevation}`);
  });
});

test("Simulation: terrain cells have valid humidity range (0–100)", () => {
  const grid = terrainGeneratorService.generate({
    width: 4,
    height: 4,
    seed: 7,
    baseTemperatureC: 25,
    basePrecipitationMm: 2000,
    baseHumidityPct: 80,
  });
  grid.cells.flat().forEach((cell) => {
    assert.ok(cell.humidityPct >= 0 && cell.humidityPct <= 100, `humidity out of range: ${cell.humidityPct}`);
  });
});

test("Simulation: terrain is deterministic for same seed", () => {
  const params = { width: 8, height: 8, seed: 999, baseTemperatureC: 22, basePrecipitationMm: 1500, baseHumidityPct: 65 };
  const g1 = terrainGeneratorService.generate(params);
  const g2 = terrainGeneratorService.generate(params);
  assert.deepEqual(g1.cells[0]![0]!.elevation, g2.cells[0]![0]!.elevation);
  assert.deepEqual(g1.cells[3]![3]!.temperatureC, g2.cells[3]![3]!.temperatureC);
});

test("Simulation: terrain includes simulationNote", () => {
  const grid = terrainGeneratorService.generate({ width: 4, height: 4, seed: 1, baseTemperatureC: 20, basePrecipitationMm: 1000, baseHumidityPct: 50 });
  assert.ok(grid.simulationNote.length > 0);
});

// ─── Biome mapping ────────────────────────────────────────────────────────────

test("Simulation: biome mapping returns floresta-tropical-umida for hot+wet", () => {
  const result = biomeMappingService.map({
    temperatureC: 26,
    precipitationMmYear: 2500,
    humidityPct: 85,
    elevationNorm: 0.3,
  });
  assert.equal(result.ecosystemSlug, "floresta-tropical-umida");
  assert.ok(result.confidence > 0.3);
});

test("Simulation: biome mapping returns deserto-quente for hot+dry", () => {
  const result = biomeMappingService.map({
    temperatureC: 32,
    precipitationMmYear: 80,
    humidityPct: 15,
    elevationNorm: 0.4,
  });
  assert.equal(result.ecosystemSlug, "deserto-quente");
});

test("Simulation: biome mapping returns tundra for very cold", () => {
  const result = biomeMappingService.map({
    temperatureC: -8,
    precipitationMmYear: 300,
    humidityPct: 60,
    elevationNorm: 0.5,
  });
  assert.equal(result.ecosystemSlug, "tundra");
});

test("Simulation: biome mapping uses manguezal when salinity and coastal", () => {
  const result = biomeMappingService.map({
    temperatureC: 26,
    precipitationMmYear: 1500,
    humidityPct: 80,
    elevationNorm: 0.1,
    salinityPsu: 20,
  });
  assert.equal(result.ecosystemSlug, "manguezal");
});

test("Simulation: biome mapping includes simulationNote", () => {
  const result = biomeMappingService.map({ temperatureC: 20, precipitationMmYear: 1000, humidityPct: 60, elevationNorm: 0.4 });
  assert.ok(result.simulationNote.length > 0);
});

test("Simulation: biome mapping returns matchedCriteria array", () => {
  const result = biomeMappingService.map({ temperatureC: 26, precipitationMmYear: 2500, humidityPct: 80, elevationNorm: 0.3 });
  assert.ok(Array.isArray(result.matchedCriteria));
  assert.ok(result.matchedCriteria.length > 0);
});

// ─── Succession simulator ─────────────────────────────────────────────────────

test("Simulation: primary succession starts at stage 0", () => {
  const result = successionSimulatorService.simulate({
    type: "primary",
    startingStage: 0,
    disturbanceIntensity: 0,
  });
  assert.equal(result.type, "primary");
  assert.equal(result.startingStage, 0);
  assert.ok(result.stages.length > 0);
});

test("Simulation: secondary succession has fewer stages from mid point", () => {
  const fromStart = successionSimulatorService.simulate({ type: "secondary", startingStage: 0, disturbanceIntensity: 0 });
  const fromMid = successionSimulatorService.simulate({ type: "secondary", startingStage: 2, disturbanceIntensity: 0 });
  assert.ok(fromStart.stages.length > fromMid.stages.length);
});

test("Simulation: high disturbance resets succession to earlier stage", () => {
  const result = successionSimulatorService.simulate({
    type: "secondary",
    startingStage: 3,
    disturbanceIntensity: 0.9,
  });
  assert.ok(result.startingStage < 3, "high disturbance should reset stage");
  assert.equal(result.isDisturbanceReset, true);
});

test("Simulation: low disturbance does not reset stage", () => {
  const result = successionSimulatorService.simulate({
    type: "secondary",
    startingStage: 2,
    disturbanceIntensity: 0.1,
  });
  assert.equal(result.isDisturbanceReset, false);
  assert.equal(result.startingStage, 2);
});

test("Simulation: succession includes ecosystemReference when provided", () => {
  const result = successionSimulatorService.simulate({
    type: "secondary",
    startingStage: 0,
    disturbanceIntensity: 0,
    ecosystemSlug: "cerrado",
  });
  assert.equal(result.ecosystemReference, "cerrado");
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes("cerrado")));
});

test("Simulation: succession result has positive estimatedYearsToClimax", () => {
  const result = successionSimulatorService.simulate({ type: "primary", startingStage: 0, disturbanceIntensity: 0 });
  assert.ok(result.estimatedYearsToClimax > 0);
});

test("Simulation: succession includes simulationNote", () => {
  const result = successionSimulatorService.simulate({ type: "primary", startingStage: 0, disturbanceIntensity: 0 });
  assert.ok(result.simulationNote.length > 0);
});

// ─── Scenario engine ──────────────────────────────────────────────────────────

test("Simulation: scenario baseline matches input parameters", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "cerrado",
    baseTemperatureC: 22,
    basePrecipitationMmYear: 1200,
    deltaTemperatureC: 0,
    deltaPrecipitationPct: 0,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 0.8,
  });
  assert.equal(result.baseline.temperatureC, 22);
  assert.equal(result.baseline.precipitationMmYear, 1200);
});

test("Simulation: scenario applies positive temperature delta", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "cerrado",
    baseTemperatureC: 22,
    basePrecipitationMmYear: 1200,
    deltaTemperatureC: 3,
    deltaPrecipitationPct: 0,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 0.8,
  });
  assert.equal(result.modified.temperatureC, 25);
});

test("Simulation: scenario applies precipitation reduction", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "pantanal",
    baseTemperatureC: 24,
    basePrecipitationMmYear: 1200,
    deltaTemperatureC: 0,
    deltaPrecipitationPct: -50,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 0.7,
  });
  assert.equal(result.modified.precipitationMmYear, 600);
});

test("Simulation: coral reef scenario with +2°C reaches critical risk", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "recife-de-coral",
    baseTemperatureC: 27,
    basePrecipitationMmYear: 1500,
    deltaTemperatureC: 2,
    deltaPrecipitationPct: 0,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 0.7,
  });
  assert.ok(
    result.modified.riskLevel === "high" || result.modified.riskLevel === "critical",
    `expected high or critical risk for coral reef +2°C, got ${result.modified.riskLevel}`
  );
});

test("Simulation: no change scenario has low baseline risk", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "floresta-tropical-umida",
    baseTemperatureC: 26,
    basePrecipitationMmYear: 2500,
    deltaTemperatureC: 0,
    deltaPrecipitationPct: 0,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 1.0,
  });
  assert.equal(result.baseline.riskLevel, "low");
});

test("Simulation: scenario includes appliedChanges when deltas are nonzero", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "tundra",
    baseTemperatureC: -5,
    basePrecipitationMmYear: 400,
    deltaTemperatureC: 4,
    deltaPrecipitationPct: -20,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 0.6,
  });
  assert.ok(result.appliedChanges.length >= 2, "should have temperature and precipitation changes");
});

test("Simulation: scenario includes simulationNote", () => {
  const result = scenarioEngineService.simulate({
    ecosystemSlug: "cerrado",
    baseTemperatureC: 22,
    basePrecipitationMmYear: 1000,
    deltaTemperatureC: 0,
    deltaPrecipitationPct: 0,
    disturbanceType: "none",
    disturbanceIntensity: 0,
    connectivityIndex: 0.7,
  });
  assert.ok(result.simulationNote.length > 0);
});

// ─── Artificial environment generator ────────────────────────────────────────

function makeProject(overrides: Partial<ArtificialProjectRow> = {}): ArtificialProjectRow {
  return {
    id: "project-wetland-construida",
    slug: "wetland-construida",
    title: "Wetland construída",
    project_type: "constructed-wetland",
    ecosystem_kind: "artificial",
    description: "Zona úmida projetada para tratamento de água.",
    objective: "Combinar função hidrológica, depuração e habitat.",
    intervention_scale: "site to watershed",
    caution_notes: "Controlar colmatação e espécies invasoras.",
    is_active: true,
    target_ecosystem_slugs: ["estuario", "pantanal"],
    ...overrides,
  };
}

test("Simulation: artificial env generator produces design components", () => {
  const result = artificialEnvironmentService.generate(makeProject(), "site");
  assert.ok(result.designComponents.length > 0);
  assert.ok(result.designComponents.some((c) => c.isCritical));
});

test("Simulation: artificial env generator includes monitoring recommendations", () => {
  const result = artificialEnvironmentService.generate(makeProject(), "site");
  assert.ok(result.monitoringRecommendations.length > 0);
});

test("Simulation: artificial env generator uses default components for unknown project type", () => {
  const project = makeProject({ project_type: "unknown-type" });
  const result = artificialEnvironmentService.generate(project, "site");
  assert.ok(result.designComponents.length > 0, "should use default components");
});

test("Simulation: artificial env generator includes cautionNotes from project", () => {
  const result = artificialEnvironmentService.generate(makeProject(), "site");
  assert.ok(result.cautionNotes.includes("colmatação") || result.cautionNotes.length > 0);
});

test("Simulation: artificial env includes simulationNote", () => {
  const result = artificialEnvironmentService.generate(makeProject(), "watershed");
  assert.ok(result.simulationNote.length > 0);
});

test("Simulation: coral restoration project has suitable components", () => {
  const project = makeProject({
    slug: "restauracao-de-coral",
    project_type: "coral-restoration",
    title: "Restauração de coral",
  });
  const result = artificialEnvironmentService.generate(project, "local");
  assert.ok(result.designComponents.some((c) => c.name.toLowerCase().includes("coral") || c.name.toLowerCase().includes("viveiro")));
});

// ─── Fauna contract: biome codes ↔ catalog, with trophic chains in new biomes ──

function trophicLevels(biomes: string[]): Set<string> {
  const { species } = faunaDefinitionService.resolveBiomes(biomes);
  return new Set(species.map((s) => s.trophicLevel));
}

test("Fauna: polar biomes resolve a full marine chain (herbivore + meso + apex)", () => {
  const { species } = faunaDefinitionService.resolveBiomes(["antartida", "oceano-polar"]);
  assert.ok(species.length >= 3, `expected >=3 polar species, got ${species.length}`);
  const levels = new Set(species.map((s) => s.trophicLevel));
  assert.ok(levels.has("herbivore"), "missing herbivore (krill/peixe)");
  assert.ok(levels.has("mesopredator"), "missing mesopredator (pinguim/foca)");
  assert.ok(levels.has("apex"), "missing apex (orca)");
  // Orca preys on a mesopredator → cadeia de 3 níveis co-presente.
  const orca = species.find((s) => s.id === "orca");
  assert.ok(orca && orca.diet.some((id) => id === "pinguim" || id === "foca"));
});

test("Fauna: mountain biomes resolve a montane chain (herbivore + meso + apex)", () => {
  const { species } = faunaDefinitionService.resolveBiomes(["montanha-nevada", "montanha", "tundra"]);
  assert.ok(species.length >= 3, `expected >=3 montane species, got ${species.length}`);
  const levels = new Set(species.map((s) => s.trophicLevel));
  assert.ok(levels.has("herbivore"));
  assert.ok(levels.has("mesopredator"));
  assert.ok(levels.has("apex"));
});

test("Fauna: tropical forest stays richly populated (regression)", () => {
  const { species } = faunaDefinitionService.resolveBiomes([
    "floresta-tropical-umida",
    "mata-atlantica",
    "savana-tropical",
  ]);
  assert.ok(species.length >= 3);
  const levels = new Set(species.map((s) => s.trophicLevel));
  assert.ok(levels.has("herbivore") && levels.has("apex"));
});

test("Fauna: resolved species include color-driving feeding strategies", () => {
  const { species } = faunaDefinitionService.resolveBiomes([
    "floresta-tropical-umida",
    "mata-atlantica",
    "savana-tropical",
  ]);
  const strategies = new Set(species.map((s) => s.feedingStrategy));
  assert.ok(strategies.has("herbivore"), "missing herbivore strategy");
  assert.ok(strategies.has("carnivore"), "missing carnivore strategy");
  assert.ok(strategies.has("omnivore"), "missing omnivore strategy");
});

test("Fauna: hunters expose species-level predation params and prey mass", () => {
  const { species } = faunaDefinitionService.resolveBiomes([
    "floresta-tropical-umida",
    "mata-atlantica",
    "savana-tropical",
  ]);
  const jaguar = species.find((s) => s.id === "onca-pintada");
  const capybara = species.find((s) => s.id === "capivara");
  assert.ok(jaguar?.predation, "jaguar should expose a predation profile");
  assert.ok((jaguar.predation?.huntRange ?? 0) > 0, "hunter needs hunt range");
  assert.ok((jaguar.predation?.preyPreference?.capivara ?? 0) > 1, "jaguar should prefer capybara");
  assert.ok((capybara?.mass ?? 0) > 0, "prey should expose mass for energy recovery");
  assert.ok((capybara?.awarenessRange ?? 0) > 0, "prey should expose awareness range");
});

test("Fauna: iterative trophic pruning leaves only present prey references", () => {
  const biomeGroups = [
    ["antartida", "oceano-polar"],
    ["montanha-nevada", "montanha", "tundra"],
    ["floresta-tropical-umida", "mata-atlantica", "savana-tropical"],
    ["deserto-frio"],
  ];

  for (const biomes of biomeGroups) {
    const { species } = faunaDefinitionService.resolveBiomes(biomes);
    const ids = new Set(species.map((s) => s.id));
    for (const entry of species) {
      for (const preyId of entry.preySpeciesIds) {
        assert.ok(ids.has(preyId), `${entry.id} references absent prey ${preyId}`);
      }
      if (entry.preySpeciesIds.length > 0) {
        assert.ok(entry.predation, `${entry.id} has prey but no predation profile`);
      }
    }
  }
});

test("Fauna: trophic pyramid scaling keeps apex pressure below prey base", () => {
  const { species } = faunaDefinitionService.resolveBiomes([
    "floresta-tropical-umida",
    "mata-atlantica",
    "savana-tropical",
  ]);
  const totalPopulation = species.reduce((sum, s) => sum + s.populationTarget, 0);
  const basePopulation = species
    .filter((s) => s.trophicLevel === "herbivore" && s.preySpeciesIds.length === 0)
    .reduce((sum, s) => sum + s.populationTarget, 0);
  const apexPopulation = species
    .filter((s) => s.trophicLevel === "apex")
    .reduce((sum, s) => sum + s.populationTarget, 0);

  assert.ok(totalPopulation <= Math.max(30, species.length), `population cap drifted to ${totalPopulation}`);
  assert.ok(basePopulation > apexPopulation, "prey base should exceed apex population");
  assert.ok(apexPopulation <= 2, `apex population should be capped tightly, got ${apexPopulation}`);
});

test("Fauna: no level set is empty for the four headline biome groups", () => {
  assert.ok(trophicLevels(["antartida", "oceano-polar"]).size > 0);
  assert.ok(trophicLevels(["montanha-nevada", "tundra"]).size > 0);
  assert.ok(trophicLevels(["oceano-pelagico"]).size > 0);
  assert.ok(trophicLevels(["floresta-tropical-umida"]).size > 0);
});

// ─── Terrain styles (Fase 1) keep producing the right biomes/temperature ──────

test("Terrain: polar style yields antartida/oceano-polar and stays cold", () => {
  const grid = terrainGeneratorService.generate({
    width: 16, height: 12, seed: 7,
    baseTemperatureC: -28, basePrecipitationMm: 200, baseHumidityPct: 70,
    reliefStyle: "polar", seaLevel: 0.3,
  });
  const biomes = new Set(grid.cells.flat().map((c) => c.biomeSuggestion));
  assert.ok(biomes.has("antartida") || biomes.has("oceano-polar"));
  assert.ok(grid.cells.flat().every((c) => c.temperatureC < 0));
});

test("Terrain: ocean style is water-dominant with islands", () => {
  const grid = terrainGeneratorService.generate({
    width: 24, height: 18, seed: 7,
    baseTemperatureC: 19, basePrecipitationMm: 1600, baseHumidityPct: 85,
    reliefStyle: "ocean", seaLevel: 0.5,
  });
  const cells = grid.cells.flat();
  const waterPct = cells.filter((c) => c.isWater).length / cells.length;
  assert.ok(waterPct > 0.4 && waterPct < 0.95, `water fraction ${waterPct}`);
});

test("Terrain: mountain style produces snowy peaks", () => {
  const grid = terrainGeneratorService.generate({
    width: 16, height: 12, seed: 7,
    baseTemperatureC: -2, basePrecipitationMm: 720, baseHumidityPct: 62,
    reliefStyle: "mountain",
  });
  const biomes = new Set(grid.cells.flat().map((c) => c.biomeSuggestion));
  assert.ok(biomes.has("montanha-nevada"));
});

test("Terrain: default style is unchanged (no regression)", () => {
  const params = {
    width: 8, height: 6, seed: 42,
    baseTemperatureC: 24, basePrecipitationMm: 1050, baseHumidityPct: 52,
  };
  const a = terrainGeneratorService.generate(params);
  const b = terrainGeneratorService.generate({ ...params, reliefStyle: "default" as const });
  assert.deepEqual(
    a.cells.flat().map((c) => c.biomeSuggestion),
    b.cells.flat().map((c) => c.biomeSuggestion),
  );
});

test("Terrain: channel carving is deterministic and shapes valleys (A1)", () => {
  const params = {
    width: 40, height: 30, seed: 99,
    baseTemperatureC: 22, basePrecipitationMm: 1600, baseHumidityPct: 70,
  };
  const a = terrainGeneratorService.generate(params);
  const b = terrainGeneratorService.generate(params);
  // Same seed → identical world, including the carved elevation field.
  assert.deepEqual(
    a.cells.flat().map((c) => c.elevation),
    b.cells.flat().map((c) => c.elevation),
  );
  assert.ok(a.cells.flat().every((c) => c.elevation >= 0 && c.elevation <= 1), "elevation stays in 0..1");

  // Carving lowers terrain along channels vs. the uncarved heightmap.
  const flat = terrainGeneratorService.generate({ ...params, carveChannels: false });
  const carvedSum = a.cells.flat().reduce((s, c) => s + c.elevation, 0);
  const rawSum = flat.cells.flat().reduce((s, c) => s + c.elevation, 0);
  assert.ok(carvedSum < rawSum, "carving should lower net elevation along valleys");
  // At least one cell sits meaningfully lower after carving (a real channel).
  const maxDrop = Math.max(
    ...a.cells.flat().map((c, i) => flat.cells.flat()[i]!.elevation - c.elevation),
  );
  assert.ok(maxDrop > 0.01, `expected a visible carved channel, got max drop ${maxDrop}`);
});

test("Terrain: edge falloff eases borders into water (A4)", () => {
  const params = {
    width: 30, height: 30, seed: 11,
    baseTemperatureC: 22, basePrecipitationMm: 1500, baseHumidityPct: 70,
    seaLevel: 0.25,
  };
  const island = terrainGeneratorService.generate({ ...params, edgeFalloff: 0.6 });
  // Border ring should be (almost) entirely water once eased down.
  const border = island.cells.flat().filter((c) => c.x === 0 || c.y === 0 || c.x === 29 || c.y === 29);
  const borderWaterPct = border.filter((c) => c.isWater).length / border.length;
  assert.ok(borderWaterPct > 0.85, `expected border to ease into water, got ${borderWaterPct}`);
  // Off by default: no edgeFalloff keeps more border land than the island variant.
  const plain = terrainGeneratorService.generate(params);
  const plainBorderWater =
    plain.cells.flat().filter((c) => (c.x === 0 || c.y === 0 || c.x === 29 || c.y === 29) && c.isWater).length;
  assert.ok(plainBorderWater <= border.filter((c) => c.isWater).length, "falloff should not reduce border water");
});

// ─── Classifier keyword path (FIX 2): runs when the LLM is unavailable/quota'd ──
// This is the guard the live bug needed: assert the canonical slug WITHOUT the LLM.

test("Classifier(keyword): the 4 headline prompts resolve to the new canonical enum", () => {
  const cases: Array<[string, string, string | undefined]> = [
    ["Costa antártica com banquisa e mar gelado", "antartida", "polar"],
    ["Cadeia de montanhas altas com picos nevados e vales", "montanha-nevada", "mountain"],
    ["Oceano aberto com um arquipélago de ilhas tropicais", "oceano", "ocean"],
    ["Floresta amazônica densa com rios", "amazonia", undefined],
  ];
  for (const [prompt, slug, relief] of cases) {
    const match = biomePresetService.findByKeyword(prompt);
    assert.ok(match, `no keyword match for "${prompt}"`);
    assert.equal(match!.slug, slug, `"${prompt}" → expected ${slug}, got ${match!.slug}`);
    assert.equal(match!.preset.reliefStyle, relief);
  }
});

test("Classifier(keyword): polar/snowy prompts never fall back to deserto/tundra", () => {
  for (const prompt of ["antártida", "banquisa polar", "mar gelado", "picos nevados", "cordilheira nevada"]) {
    const match = biomePresetService.findByKeyword(prompt);
    assert.ok(match);
    assert.ok(["antartida", "montanha-nevada"].includes(match!.slug), `"${prompt}" → ${match!.slug}`);
    assert.ok(match!.preset.baseTemperatureC < 0, `"${prompt}" should be cold`);
  }
});

// ─── Fauna coherence (FIX 2 / Correção 5): no off-biome species from stray cells ──

function makeCell(
  biome: string,
  isWater: boolean,
  x: number,
  y: number,
  overrides: Partial<TerrainCell> = {}
): TerrainCell {
  return {
    x, y, elevation: 0.5, temperatureC: 20, humidityPct: 60,
    precipitationMmYear: 1200, salinityPsu: isWater ? 30 : 0,
    climateCode: "Af", biomeSuggestion: biome, isWater,
    ...overrides,
  };
}

function gridOf(dominant: string, strays: string[] = [], overrides: Partial<TerrainCell> = {}): TerrainGrid {
  const width = 10, height = 10;
  const cells: TerrainCell[][] = [];
  let placed = 0;
  for (let y = 0; y < height; y += 1) {
    const row: TerrainCell[] = [];
    for (let x = 0; x < width; x += 1) {
      const biome = placed < strays.length ? strays[placed]! : dominant;
      const isWater = biome === "oceano-polar" || biome === "oceano-pelagico" || biome === "lago";
      row.push(makeCell(biome, isWater, x, y, overrides));
      placed += 1;
    }
    cells.push(row);
  }
  return { width, height, seed: 1, baseTemperatureC: 24, basePrecipitationMm: 1200, cells, simulationNote: "test" };
}

test("Fauna: a single stray deserto-frio cell does not inject montane apex into a tropical forest", () => {
  const grid = gridOf("floresta-tropical-umida", ["deserto-frio"]); // 1 stray of 100 cells (1%)
  const { species } = faunaDefinitionService.resolve(grid);
  assert.ok(species.length > 0);
  assert.ok(!species.some((s) => s.id === "puma-andino"), "puma-andino leaked from a 1% stray cell");
  assert.ok(!species.some((s) => s.id === "lhama"), "lhama leaked from a 1% stray cell");
});

test("Fauna: pure antarctic grid resolves only polar marine species (no bear/pig)", () => {
  const grid = gridOf("antartida", Array(20).fill("oceano-polar"), { temperatureC: -18 }); // 80% antartida + 20% polar sea
  const { species } = faunaDefinitionService.resolve(grid);
  assert.ok(species.length >= 3);
  const ids = new Set(species.map((s) => s.id));
  for (const offBiome of ["capivara", "anta", "onca-pintada", "lobo-cinzento", "lemingue"]) {
    assert.ok(!ids.has(offBiome), `${offBiome} should not appear in Antarctica`);
  }
});

test("Fauna: warm tropical grids do not admit ocean, polar or cold fauna from minor residual cells", () => {
  const strays = [
    ...Array(8).fill("oceano-pelagico"),
    ...Array(6).fill("deserto-frio"),
  ];
  const grid = gridOf("floresta-tropical-umida", strays, {
    temperatureC: 27,
    salinityPsu: 35,
  });
  const ids = new Set(faunaDefinitionService.resolve(grid).species.map((s) => s.id));
  for (const implausible of ["albatroz", "krill", "peixe-glacial", "pinguim", "foca", "orca", "lobo-cinzento", "alce", "puma-andino"]) {
    assert.ok(!ids.has(implausible), `${implausible} should not appear in a warm tropical cave/forest grid`);
  }
});

test("Fauna: cave fish require a flooded or river cave, while dry caves admit terrestrial cave fauna", () => {
  const dryGrid = gridOf("floresta-tropical-umida");
  dryGrid.cells[0]![0]!.cave = { type: "deep-cave", depth: 0.8, openness: 0.4, humidity: 0.45, darkness: 0.9, systemId: "dry-0" };
  dryGrid.cells[0]![1]!.cave = { type: "shallow-den", depth: 0.4, openness: 0.5, humidity: 0.35, darkness: 0.6, systemId: "dry-1" };
  let ids = new Set(faunaDefinitionService.resolve(dryGrid).species.map((s) => s.id));
  assert.ok(ids.has("inseto-cavernicola"), "dry cave should admit terrestrial cave fauna");
  assert.ok(!ids.has("peixe-cego"), "dry cave should not admit blind cave fish");

  const wetGrid = gridOf("floresta-tropical-umida");
  wetGrid.cells[0]![0]!.cave = { type: "river-cave", depth: 0.75, openness: 0.45, humidity: 0.92, darkness: 0.86, systemId: "wet-0" };
  wetGrid.cells[0]![0]!.riverDistance = 1;
  wetGrid.cells[0]![1]!.cave = { type: "deep-cave", depth: 0.6, openness: 0.35, humidity: 0.5, darkness: 0.8, systemId: "wet-1" };
  ids = new Set(faunaDefinitionService.resolve(wetGrid).species.map((s) => s.id));
  assert.ok(ids.has("peixe-cego"), "river cave should admit blind cave fish");
});

// ─── Terrain features layer (caves, rivers, objects, altitude) ──────────────────

test("Features: enriched terrain has slope, altitudeBand, rivers, caves and objects", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 36, seed: 42,
    baseTemperatureC: 10, basePrecipitationMm: 1200, baseHumidityPct: 60,
    reliefStyle: "mountain",
  });
  const flat = grid.cells.flat();

  assert.ok(flat.every((c) => typeof c.slope === "number" && c.slope! >= 0 && c.slope! <= 1));
  assert.ok(flat.every((c) => c.altitudeBand !== undefined));
  assert.ok(flat.some((c) => (c.waterFlow ?? 0) > 0), "expected at least one river cell");
  assert.ok(flat.some((c) => c.cave && c.cave.type !== "none"), "expected at least one cave");
  assert.ok(flat.some((c) => (c.objects?.length ?? 0) > 0), "expected procedural objects");
});

test("Features: cave entrance and depth are decoupled (small openness, deep system allowed)", () => {
  const grid = terrainGeneratorService.generate({
    width: 32, height: 32, seed: 7,
    baseTemperatureC: 8, basePrecipitationMm: 900, baseHumidityPct: 55,
    reliefStyle: "mountain",
  });
  for (const cell of grid.cells.flat()) {
    if (!cell.cave || cell.cave.type === "none") continue;
    assert.ok(cell.cave.depth >= 0 && cell.cave.depth <= 1);
    assert.ok(cell.cave.openness >= 0 && cell.cave.openness <= 1);
    // Connected systems carry a stable id shared across adjacent cave cells.
    assert.ok(typeof cell.cave.systemId === "string");
  }
});

test("Features: enrichment is deterministic and never breaks invariants", () => {
  const params = {
    width: 24, height: 18, seed: 99,
    baseTemperatureC: 20, basePrecipitationMm: 1400, baseHumidityPct: 70,
  };
  const a = terrainGeneratorService.generate(params);
  const b = terrainGeneratorService.generate(params);
  const fa = a.cells.flat();
  const fb = b.cells.flat();
  assert.deepEqual(fa.map((c) => c.cave?.type ?? "none"), fb.map((c) => c.cave?.type ?? "none"));
  assert.deepEqual(fa.map((c) => c.waterFlow ?? 0), fb.map((c) => c.waterFlow ?? 0));
  // River banks boost humidity but it must stay within range.
  assert.ok(fa.every((c) => c.humidityPct >= 0 && c.humidityPct <= 100));
  assert.ok(fa.every((c) => c.elevation >= 0 && c.elevation <= 1));
});

test("Features: 'large forest with some caves' builds a few multi-cell cave systems", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 36, seed: 123,
    baseTemperatureC: 24, basePrecipitationMm: 1800, baseHumidityPct: 78,
    featureHints: { caveQuantity: "few", requireVisibleCaves: true, rockyOutcrops: true },
  });
  const caveCells = grid.cells.flat().filter((cell) => cell.cave && cell.cave.type !== "none");
  const systems = new Map<string, typeof caveCells>();
  for (const cell of caveCells) {
    const id = cell.cave!.systemId ?? "?";
    systems.set(id, [...(systems.get(id) ?? []), cell]);
  }

  // 2–4 cave systems, each with exactly one visible entrance.
  assert.ok(systems.size >= 2 && systems.size <= 4, `expected 2-4 cave systems, got ${systems.size}`);
  for (const [id, cells] of systems) {
    const entrances = cells.filter((c) => c.objects?.includes("cave-entrance"));
    assert.equal(entrances.length, 1, `system ${id} should have exactly one visible entrance`);
    assert.equal(entrances[0]!.cave!.isEntrance, true, "entrance cell must be flagged isEntrance");
  }

  // At least one system grew beyond a single cell (entrance + internal cells).
  const multiCell = Array.from(systems.values()).filter((cells) => cells.length > 1);
  assert.ok(multiCell.length >= 1, "expected at least one multi-cell cave system");

  // Entrances of different systems stay spaced apart (>= 4 Manhattan).
  const entranceCells = caveCells.filter((c) => c.objects?.includes("cave-entrance"));
  for (let i = 0; i < entranceCells.length; i += 1) {
    for (let j = i + 1; j < entranceCells.length; j += 1) {
      const a = entranceCells[i]!;
      const b = entranceCells[j]!;
      if (a.cave!.systemId === b.cave!.systemId) continue;
      assert.ok(
        Math.abs(a.x - b.x) + Math.abs(a.y - b.y) >= 4,
        "different system entrances must remain spaced apart",
      );
    }
  }
});

test("Features: internal cave cells cluster near their entrance (no inter-cell spacing)", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 36, seed: 555,
    baseTemperatureC: 22, basePrecipitationMm: 1700, baseHumidityPct: 75,
    featureHints: { caveQuantity: "few", requireVisibleCaves: true, preferDeepCave: true },
  });
  const caveCells = grid.cells.flat().filter((cell) => cell.cave && cell.cave.type !== "none");
  const bySystem = new Map<string, typeof caveCells>();
  for (const cell of caveCells) {
    const id = cell.cave!.systemId ?? "?";
    bySystem.set(id, [...(bySystem.get(id) ?? []), cell]);
  }
  const multi = Array.from(bySystem.values()).find((cells) => cells.length > 1);
  assert.ok(multi, "expected a multi-cell system to inspect clustering");
  // Every internal cell must be adjacent (<= sqrt(2)) to another cell of the system.
  for (const cell of multi!) {
    const adjacent = multi!.some(
      (other) => other !== cell && Math.abs(other.x - cell.x) <= 1 && Math.abs(other.y - cell.y) <= 1,
    );
    assert.ok(adjacent, "cells of the same system must be clustered together");
  }
});

test("Features: every cave system has at least one entrance; internal cells stay non-entrance", () => {
  const grid = terrainGeneratorService.generate({
    width: 40, height: 32, seed: 7,
    baseTemperatureC: 8, basePrecipitationMm: 900, baseHumidityPct: 55,
    reliefStyle: "mountain",
  });
  const caveCells = grid.cells.flat().filter((c) => c.cave && c.cave.type !== "none");
  assert.ok(caveCells.length > 0, "expected caves in a mountain grid");

  // Group by system and require an entrance per system.
  const systems = new Map<string, { entrances: number; total: number }>();
  for (const cell of caveCells) {
    const id = cell.cave!.systemId ?? "?";
    const entry = systems.get(id) ?? { entrances: 0, total: 0 };
    entry.total += 1;
    const isEntranceObject = cell.objects?.includes("cave-entrance") ?? false;
    if (cell.cave!.isEntrance) entry.entrances += 1;
    // The entrance flag and the cave-entrance object must agree.
    assert.equal(cell.cave!.isEntrance === true, isEntranceObject, "isEntrance must match cave-entrance object");
    systems.set(id, entry);
  }
  for (const [id, entry] of systems) {
    assert.ok(entry.entrances >= 1, `system ${id} must expose at least one entrance`);
  }
});

test("Features: natural caves form a few bounded systems, no 1-cell noise (B1)", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 40, seed: 7,
    baseTemperatureC: 8, basePrecipitationMm: 900, baseHumidityPct: 55,
    reliefStyle: "mountain",
  });
  const caveCells = grid.cells.flat().filter((c) => c.cave && c.cave.type !== "none");
  const sizes = new Map<string, number>();
  for (const c of caveCells) {
    const id = c.cave!.systemId ?? "?";
    sizes.set(id, (sizes.get(id) ?? 0) + 1);
  }
  assert.ok(sizes.size >= 1 && sizes.size <= 6, `expected up to 6 natural systems, got ${sizes.size}`);
  // No isolated single-cell noise survives the post-process (min system size = 2).
  for (const [id, size] of sizes) {
    assert.ok(size >= 2, `system ${id} should have >= 2 cells, got ${size}`);
  }
});

test("Features: deep caves carry larger depth than shallow dens", () => {
  const grid = terrainGeneratorService.generate({
    width: 44, height: 36, seed: 321,
    baseTemperatureC: 6, basePrecipitationMm: 800, baseHumidityPct: 50,
    reliefStyle: "mountain",
  });
  const caves = grid.cells.flat().map((c) => c.cave).filter((c): c is NonNullable<typeof c> => Boolean(c && c.type !== "none"));
  const deep = caves.filter((c) => c.type === "deep-cave" || c.type === "karst-system");
  for (const cave of deep) {
    assert.ok(cave.depth >= 0.4, `deep cave should be deep, got ${cave.depth}`);
  }
});

test("Report: formation summary matches grid metadata", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 36, seed: 123,
    baseTemperatureC: 24, basePrecipitationMm: 1800, baseHumidityPct: 78,
    featureHints: { caveQuantity: "few", requireVisibleCaves: true, rockyOutcrops: true },
  });
  const formations = summarizeFormations(grid);
  const caveCells = grid.cells.flat().filter((c) => c.cave && c.cave.type !== "none");
  const entrances = caveCells.filter((c) => c.objects?.includes("cave-entrance"));
  const systemIds = new Set(caveCells.map((c) => c.cave!.systemId).filter(Boolean));

  assert.equal(formations.caveCells, caveCells.length, "caveCells must match grid");
  assert.equal(formations.visibleEntrances, entrances.length, "visibleEntrances must match grid");
  assert.equal(formations.caveSystems, systemIds.size, "caveSystems must match distinct system ids");
  assert.equal(formations.subterraneanCells, caveCells.length - entrances.length, "subterranean = internal cells");
  assert.ok(formations.avgCaveDepth <= formations.maxCaveDepth + 1e-9, "avg depth cannot exceed max");
  assert.ok(formations.largestSystemCells >= 1, "largest system must have at least one cell when caves exist");
  assert.ok(formations.maxWaterFlow >= 0 && formations.maxWaterFlow <= 1, "max flow within range");

  // New system-level fields are coherent with the grid.
  const expectedChambers = caveCells.filter((c) => c.cave!.role === "chamber").length;
  const expectedTunnels = caveCells.filter((c) => c.cave!.role === "tunnel").length;
  assert.equal(formations.chamberCells, expectedChambers, "chamberCells must match roles");
  assert.equal(formations.tunnelCells, expectedTunnels, "tunnelCells must match roles");
  assert.equal(
    formations.shallowCaveCount + formations.deepCaveCount,
    caveCells.length,
    "every cave cell is either shallow or deep",
  );
  // A few-caves prompt should grow at least one multi-cell system.
  assert.ok(formations.largestSystemCells >= 2, "expected at least one multi-cell system");
});

test("Report: animal list is coherent — no incompatible polar/ocean fauna in a tropical forest with caves", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 36, seed: 123,
    baseTemperatureC: 24, basePrecipitationMm: 1800, baseHumidityPct: 78,
    featureHints: { caveQuantity: "few", requireVisibleCaves: true, rockyOutcrops: true },
  });
  const species = faunaDefinitionService.resolve(grid).species;
  assert.ok(species.length > 0, "expected resolved fauna");
  assert.ok(species.every((s) => s.commonName.length > 0), "every species exposes a display name");

  // Cave fauna should be present because caves exist in the grid.
  assert.ok(
    species.some((s) => s.habitableBiomes.includes("caverna")),
    "cave fauna should appear when caves exist",
  );

  // Incompatible polar/ocean specialists must not leak into a warm tropical grid.
  const forbidden = ["orca", "pinguim", "foca", "urso-polar", "raposa-do-artico", "leao-marinho"];
  for (const id of forbidden) {
    assert.ok(!species.some((s) => s.id === id), `${id} must not appear in a tropical forest grid`);
  }
});

test("Fauna: a grid with caves resolves the cave-dwelling chain", () => {
  const grid = terrainGeneratorService.generate({
    width: 48, height: 36, seed: 42,
    baseTemperatureC: 10, basePrecipitationMm: 1200, baseHumidityPct: 60,
    reliefStyle: "mountain",
  });
  const ids = new Set(faunaDefinitionService.resolve(grid).species.map((s) => s.id));
  assert.ok(ids.has("morcego") || ids.has("inseto-cavernicola"), "cave fauna missing despite caves");
});

test("Fauna: a cave-free grid does not inject cave species", () => {
  const { species } = faunaDefinitionService.resolveBiomes(["floresta-tropical-umida"]);
  assert.ok(!species.some((s) => s.habitableBiomes.includes("caverna")));
});

// ─── Amazon coherence regression (post-demo fixes) ──────────────────────────────

test("Amazon: humid rainforest params resolve to wet tropical forest, not dry forest", () => {
  const grid = terrainGeneratorService.generate(AMAZON_PARAMS);
  const { biome, pct } = dominantBiome(grid);
  assert.equal(biome, "floresta-tropical-umida", `dominant biome should be wet forest, got ${biome} (${pct}%)`);
  // Dry forest must not dominate a hot+wet Amazon grid.
  const dry = grid.cells.flat().filter((c) => !c.isWater && c.biomeSuggestion === "floresta-tropical-seca").length;
  const land = grid.cells.flat().filter((c) => !c.isWater).length;
  assert.ok(dry / land < 0.3, `dry forest should be a minority, got ${(dry / land) * 100}%`);
});

test("Amazon: no alpine-cold minimum temperature without mountain context", () => {
  const grid = terrainGeneratorService.generate(AMAZON_PARAMS);
  const minTemp = Math.min(...grid.cells.flat().map((c) => c.temperatureC));
  assert.ok(minTemp >= 15, `lowland rainforest min temperature should stay warm, got ${minTemp}°C`);
});

test("Amazon: ordinary rainforest prompt generates no incidental caves or cave fauna", () => {
  const grid = terrainGeneratorService.generate(AMAZON_PARAMS);
  const caveCells = grid.cells.flat().filter((c) => c.cave && c.cave.type !== "none").length;
  assert.equal(caveCells, 0, "lowland default relief without cave hints must not sprout caves");
  const species = faunaDefinitionService.resolve(grid).species;
  assert.ok(!species.some((s) => s.habitableBiomes.includes("caverna")), "no cave fauna without caves");
});

test("Amazon: coherent report validation is high and not blocked by incidental cave fauna", () => {
  const grid = terrainGeneratorService.generate(AMAZON_PARAMS);
  const species = faunaDefinitionService.resolve(grid).species;
  const resources = resourceAvailabilityEvaluator.assessFromGrid(grid, species);
  const trophic = trophicNetworkResolver.resolve(species, resources);
  const { pct } = dominantBiome(grid);
  const profile = ecosystemProfileService.getBySlug("amazonia")!;
  const presentResources = new Set(resources.resourceBase.map((r) => r.type));
  const { mismatches, consistencyScore } = ecosystemProfileService.assessConsistency(profile, {
    temperatureC: grid.baseTemperatureC,
    precipitationMmYear: grid.basePrecipitationMm,
    humidityPct: 88,
    waterCoveragePct: 10,
    avgSalinityPsu: 0,
    caveCells: 0,
    presentResources,
  });
  const validation = ecologicalPlausibilityEvaluator.evaluateEcosystem({
    source: "keyword",
    dominantBiomePct: pct,
    speciesCount: species.length,
    trophic,
    resources,
    grounding: { coverageSufficient: false, factCount: 0 },
    hasSpecialHabitat: false,
    profile: { matched: true, displayName: profile.displayName, consistencyScore, mismatches },
  });
  assert.equal(validation.blockingContradictions.length, 0, "no blocking contradiction for a coherent Amazon");
  assert.ok(validation.score > 75, `coherent Amazon should score high, got ${validation.score}`);
  // Predator/prey chain present (jaguar → capybara or equivalent).
  const jaguar = species.find((s) => s.id === "onca-pintada");
  assert.ok(jaguar && jaguar.preySpeciesIds.length > 0, "jaguar should have active prey links");
});

test("Cave: explicit cave hints still generate caves and a supported cave-dwelling chain", () => {
  const grid = terrainGeneratorService.generate({
    ...AMAZON_PARAMS,
    featureHints: { caveQuantity: "few", requireVisibleCaves: true },
  });
  const caveCells = grid.cells.flat().filter((c) => c.cave && c.cave.type !== "none").length;
  assert.ok(caveCells >= 2, "explicit cave hints must still produce caves");
  const species = faunaDefinitionService.resolve(grid).species;
  const caveFauna = species.filter((s) => s.habitableBiomes.includes("caverna"));
  assert.ok(caveFauna.length > 0, "cave fauna should be injected for a meaningful cave habitat");

  // Cave organic matter is available, so the troglobitic insect is supported (no contradiction).
  const resources = resourceAvailabilityEvaluator.assessFromGrid(grid, species);
  const trophic = trophicNetworkResolver.resolve(species, resources);
  assert.ok(
    !trophic.unsupportedSpecies.some((n) => n.toLowerCase().includes("trogl")),
    "troglobitic insect must be supported by cave organic matter when caves are meaningful"
  );
});
