import { expect, it } from "vitest";
import { speciesForInvasionPhase } from "../features/ecology/invasivePhase";
import { getOfflineEcosystemSnapshot } from "../demo/offline";

const native = getOfflineEcosystemSnapshot("amazonia-coerente").result.species[0]!;
const invader = { ...native, id: "introduced", populationTarget: 2 };

it("applies the selected projection to native and introduced populations without mutating the baseline", () => {
  const before = JSON.stringify(native);
  const result = speciesForInvasionPhase([native, invader], invader.id, {
    label: "Resultado", tSeconds: 180, invaderPop: 0, nativeDeltas: { [native.id]: -2 },
  });
  expect(result[0]?.populationTarget).toBe(Math.max(0, native.populationTarget - 2));
  expect(result[1]?.populationTarget).toBe(0);
  expect(JSON.stringify(native)).toBe(before);
});

it("clamps native losses to zero and supports indirect increases", () => {
  const [lost, released] = speciesForInvasionPhase([native, { ...native, id: "released" }], "introduced", {
    label: "Cascata", tSeconds: 90, invaderPop: 2,
    nativeDeltas: { [native.id]: -999, released: 3 },
  });
  expect(lost?.populationTarget).toBe(0);
  expect(released?.populationTarget).toBe(native.populationTarget + 3);
});

it("changing back to the initial phase restores baseline targets without accumulating deltas", () => {
  const original = [native, invader];
  speciesForInvasionPhase(original, invader.id, { label: "Fim", tSeconds: 180, invaderPop: 12, nativeDeltas: { [native.id]: -4 } });
  const restored = speciesForInvasionPhase(original, invader.id, { label: "Início", tSeconds: 0, invaderPop: 2, nativeDeltas: {} });
  expect(restored.map((s) => s.populationTarget)).toEqual(original.map((s) => s.populationTarget));
  expect(restored.every((s) => s.populationManaged)).toBe(true);
});
