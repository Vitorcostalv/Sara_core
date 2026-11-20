import {afterEach, expect, it, vi} from "vitest";
afterEach(() => {vi.unstubAllEnvs();window.localStorage.clear();vi.resetModules();});
it("a hosted build ignores a persisted API URL from another computer", async () => {
  vi.stubEnv("VITE_API_BASE_URL", "/api/v1");
  window.localStorage.setItem("sara-core.api-base-url", "http://localhost:3333/api/v1");
  vi.resetModules();
  const {useUiStore} = await import("../state/ui.store");
  expect(useUiStore.getState().apiBaseUrl).toBe("/api/v1");
});
