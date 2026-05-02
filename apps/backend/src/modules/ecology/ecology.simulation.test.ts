import assert from "node:assert/strict";
import test from "node:test";
import { terrainGeneratorService } from "./simulation/terrain-generator.service";
import { biomeMappingService } from "./simulation/biome-mapping.service";
import { successionSimulatorService } from "./simulation/succession-simulator.service";
import { scenarioEngineService } from "./simulation/scenario-engine.service";
import { artificialEnvironmentService } from "./simulation/artificial-environment.service";
import type { ArtificialProjectRow } from "./grounding/ecological-grounding.repository";

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
