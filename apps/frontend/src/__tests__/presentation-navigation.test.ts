import { afterEach, describe, expect, it } from "vitest";
import { DEMO_SCENARIOS, PERFORMANCE_PROFILES } from "../demo/catalog";
import { useUiStore } from "../state/ui.store";

afterEach(() => {
  useUiStore.getState().setPresentationMode(false);
  useUiStore.getState().setPerformanceProfile("balanced");
  window.localStorage.clear();
});

describe("presentation mode", () => {
  it("can be entered and exited, restoring normal mode", () => {
    expect(useUiStore.getState().presentationMode).toBe(false);

    useUiStore.getState().setPresentationMode(true);
    expect(useUiStore.getState().presentationMode).toBe(true);
    expect(window.localStorage.getItem("sara-core.presentation-mode")).toBe("true");

    useUiStore.getState().setPresentationMode(false);
    expect(useUiStore.getState().presentationMode).toBe(false);
    expect(window.localStorage.getItem("sara-core.presentation-mode")).toBe("false");
  });

  it("primary demo scenarios remain available regardless of presentation mode", () => {
    // Presentation mode only changes layout emphasis, not scenario availability.
    useUiStore.getState().setPresentationMode(true);
    expect(DEMO_SCENARIOS.length).toBe(4);
    expect(DEMO_SCENARIOS.some((s) => s.kind === "ecosystem")).toBe(true);
    expect(DEMO_SCENARIOS.some((s) => s.kind === "invasive")).toBe(true);
  });
});

describe("performance profiles (Modo leve)", () => {
  it("light mode reduces visual workload vs balanced and high", () => {
    const { light, balanced, high } = PERFORMANCE_PROFILES;
    // fewer agents, smaller terrain, no shadows/secondary effects, rain off
    expect(light.agentDisplayCap).toBeLessThan(balanced.agentDisplayCap);
    expect(balanced.agentDisplayCap).toBeLessThanOrEqual(high.agentDisplayCap);
    expect(light.terrainSize.width * light.terrainSize.height).toBeLessThan(
      balanced.terrainSize.width * balanced.terrainSize.height,
    );
    expect(light.shadows).toBe(false);
    expect(light.secondaryEffects).toBe(false);
    expect(light.rainParticles).toBe("off");
  });

  it("the profile selection persists locally", () => {
    useUiStore.getState().setPerformanceProfile("light");
    expect(useUiStore.getState().performanceProfile).toBe("light");
    expect(window.localStorage.getItem("sara-core.performance-profile")).toBe("light");
  });
});

describe("navigation reachability", () => {
  it("each demo scenario routes to a known primary section", () => {
    // ecosystem scenarios drive the "terreno" tab; invasive drives "invasora"
    for (const scenario of DEMO_SCENARIOS) {
      expect(["ecosystem", "invasive"]).toContain(scenario.kind);
      expect(scenario.prompt.length).toBeGreaterThan(0);
      expect(scenario.recommendedPerformanceProfile in PERFORMANCE_PROFILES).toBe(true);
    }
  });
});
