import assert from "node:assert/strict";
import test from "node:test";
import { syntheticForecastExample } from "@sara/shared-types";
import { forecastEcology } from "./simulation/ecological-forecast.service";
import { ecologicalForecastSchema } from "./ecology.schemas";

test("Forecast: recovers an independently specified log-abundance trend and predicts future dates", () => {
  const input = syntheticForecastExample();
  const result = forecastEcology(input);
  const species = result.species[0]!;
  assert.ok(Math.abs(species.netLogGrowthPerDay - 0.005) < 1e-5);
  assert.ok(species.validation.modelMae < 0.001);
  assert.ok(species.validation.beatsPersistence);
  const elapsed = (Date.parse(species.forecast[0]!.date) - Date.parse(input.observations[0]!.date)) / 86400000;
  const expected = Math.exp(Math.log1p(12) + 0.005 * elapsed) - 1;
  assert.ok(Math.abs(species.forecast[0]!.estimate - expected) < 0.001);
  assert.equal(result.status, "insufficient-evidence", "synthetic data cannot validate a real ecosystem");
});

test("Forecast: held-out observations do not leak into the evaluated fit", () => {
  const input = syntheticForecastExample();
  for (const observation of input.observations.slice(12)) observation.populations.capivara = 10000;
  const result = forecastEcology(input).species[0]!;
  const expectedMae = input.observations.slice(12).reduce((sum, observation) => {
    const elapsed = (Date.parse(observation.date) - Date.parse(input.observations[0]!.date)) / 86400000;
    return sum + 10000 - (Math.exp(Math.log1p(12) + 0.005 * elapsed) - 1);
  }, 0) / 4;
  assert.ok(Math.abs(result.validation.modelMae - expectedMae) < 0.001);
  assert.ok(result.validation.observedIntervalCoverage < 0.5);
});

for (const value of [0, 25]) {
  test(`Forecast: constant abundance ${value} cannot claim improvement over persistence`, () => {
    const input = syntheticForecastExample(); input.source.kind = "field";
    input.observations.forEach((observation) => { observation.populations.capivara = value; });
    const result = forecastEcology(input);
    assert.equal(result.status, "insufficient-evidence");
    assert.equal(result.species[0]!.validation.beatsPersistence, false);
    for (const point of result.species[0]!.forecast) assert.ok(Math.abs(point.estimate - value) < 1e-6);
  });
}

test("Forecast: field data remain experimental, with conditional intervals and declared provenance", () => {
  const input = syntheticForecastExample(); input.source.kind = "field";
  const result = forecastEcology(input);
  assert.equal(result.status, "experimental");
  assert.equal(result.causalPredationEffectsEstimated, false);
  assert.equal(result.intervalKind, "conditional-model-95-percent");
  assert.ok(result.warnings.some((warning) => warning.includes("não verificadas")));
  for (const point of result.species[0]!.forecast) {
    assert.ok(Number.isFinite(point.estimate));
    assert.ok(point.lower >= 0 && point.lower <= point.estimate && point.estimate <= point.upper);
  }
});

test("Forecast: requests are reproducible, hash tracked and never mutate observations", () => {
  const input = syntheticForecastExample();
  const before = structuredClone(input);
  const a = forecastEcology(input);
  assert.deepEqual(forecastEcology(input), a);
  assert.deepEqual(input, before);
  input.source.name = "Outra origem declarada";
  assert.notEqual(forecastEcology(input).datasetSha256, a.datasetSha256);
});

for (const kind of ["empty-series", "short-series", "date-order", "duplicate-date", "missing-species", "extra-species", "negative", "nan", "no-protocol", "duplicate-id", "excess-horizon"]) {
  test(`Forecast: rejects invalid evidence (${kind})`, () => {
    const input = syntheticForecastExample();
    if (kind === "empty-series") input.observations = [];
    if (kind === "short-series") input.observations = input.observations.slice(0, 11);
    if (kind === "date-order") input.observations.reverse();
    if (kind === "duplicate-date") input.observations[1]!.date = input.observations[0]!.date;
    if (kind === "missing-species") input.observations[0]!.populations = {};
    if (kind === "extra-species") input.observations[0]!.populations.onca = 1;
    if (kind === "negative") input.observations[0]!.populations.capivara = -1;
    if (kind === "nan") input.observations[0]!.populations.capivara = NaN;
    if (kind === "no-protocol") input.source.samplingProtocol = "";
    if (kind === "duplicate-id") input.speciesIds.push("capivara");
    if (kind === "excess-horizon") { input.horizonDays = 90; input.observations = input.observations.slice(0, 12); }
    assert.equal(ecologicalForecastSchema.safeParse(input).success, false);
  });
}

test("Forecast: unknown species cannot be silently invented by the model", () => {
  const input = syntheticForecastExample(); input.speciesIds = ["unknown-species"];
  input.observations.forEach((observation) => { observation.populations = { "unknown-species": 12 }; });
  assert.throws(() => forecastEcology(input), /Espécie não catalogada/);
});
