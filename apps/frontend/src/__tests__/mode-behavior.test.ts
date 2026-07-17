import { afterEach, describe, expect, it } from "vitest";
import {
  clearLocalDemoData,
  readLastScenario,
  saveLastScenario,
  validateEcosystemSnapshot,
  validateInvasiveSnapshot,
} from "../demo/offline";
import type { OfflineEcosystemSnapshot, OfflineInvasiveSnapshot } from "../demo/snapshots";

afterEach(() => {
  window.localStorage.clear();
});

describe("offline mode behavior", () => {
  it("switching to the offline snapshot is explicit and disclosed (no silent live substitution)", () => {
    // The scenario record must record mode === 'offline'; a live run must record 'live'.
    saveLastScenario({ scenarioId: "amazonia-coerente", mode: "offline" });
    const offline = readLastScenario();
    expect(offline?.mode).toBe("offline");
    expect(offline?.scenarioId).toBe("amazonia-coerente");

    saveLastScenario({ scenarioId: "cerrado-predador-presa", mode: "live" });
    expect(readLastScenario()?.mode).toBe("live");
  });

  it("the last scenario can be restored and then cleared", () => {
    saveLastScenario({ scenarioId: "cerrado-predador-presa", mode: "offline" });
    expect(readLastScenario()).not.toBeNull();

    clearLocalDemoData();
    expect(readLastScenario()).toBeNull();
  });

  it("readLastScenario tolerates corrupt local storage without throwing", () => {
    window.localStorage.setItem("sara-core.last-scenario", "{not-json");
    expect(() => readLastScenario()).not.toThrow();
    expect(readLastScenario()).toBeNull();
  });

  it("rejects an invalid ecosystem snapshot (guards against passing junk off as precomputed)", () => {
    const bad = {
      meta: { snapshotVersion: 2, precomputed: false },
      result: {},
    } as unknown as OfflineEcosystemSnapshot;
    expect(() => validateEcosystemSnapshot(bad)).toThrow();
  });

  it("rejects an invalid invasive snapshot", () => {
    const bad = {
      meta: { snapshotVersion: 1, precomputed: true },
      result: { terrain: { width: 1, height: 1, cells: [] } },
    } as unknown as OfflineInvasiveSnapshot;
    expect(() => validateInvasiveSnapshot(bad)).toThrow();
  });
});
