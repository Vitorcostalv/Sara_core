import { afterEach, expect, it, vi } from "vitest";
import { clearLocalDemoData, readLastScenario, saveLastScenario } from "../demo/offline";
import { useUiStore } from "../state/ui.store";

afterEach(() => vi.restoreAllMocks());

it("starts the UI with defaults when browser storage is blocked", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  vi.resetModules();
  const { useUiStore: freshStore } = await import("../state/ui.store");
  expect(freshStore.getState().performanceProfile).toBe("balanced");
  expect(freshStore.getState().presentationMode).toBe(false);
  expect(readLastScenario()).toBeNull();
});

it("updates session settings even when the storage quota is exhausted", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Full", "QuotaExceededError"); });
  const settings = useUiStore.getState();
  expect(() => settings.setApiBaseUrl("http://localhost:3333")).not.toThrow();
  expect(() => settings.setPresentationMode(true)).not.toThrow();
  expect(() => settings.setDemoFlowDismissed(false)).not.toThrow();
  expect(() => settings.setPerformanceProfile("light")).not.toThrow();
  expect(useUiStore.getState()).toMatchObject({ apiBaseUrl: "http://localhost:3333/api/v1", presentationMode: true, demoFlowDismissed: false, performanceProfile: "light" });
  expect(() => saveLastScenario({ scenarioId: "amazonia-coerente", mode: "offline" })).not.toThrow();
});

it("tolerates clearing demo data when storage access is denied", () => {
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
  expect(() => clearLocalDemoData()).not.toThrow();
});
