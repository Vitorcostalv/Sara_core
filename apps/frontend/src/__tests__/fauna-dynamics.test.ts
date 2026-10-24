import { describe, expect, it } from "vitest";
import { canBreed, canCross, FoodPatch, pursuitSeconds, shouldHunt, SimulationClock } from "../features/ecology/fauna-dynamics";

describe("ecological dynamics", () => {
  it("advances the same time at 5, 15, 30, 60 and 120 FPS, including accelerated playback", () => {
    for (const speed of [0.5, 1, 2, 4]) {
      const durations = [5, 15, 30, 60, 120].map(fps => {
        const clock = new SimulationClock();
        let simulated = 0;
        for (let i = 0; i < fps * 20; i++) clock.advance(1 / fps, speed, dt => { simulated += dt; });
        return simulated;
      });
      durations.forEach(value => expect(value).toBeCloseTo(20 * speed, 6));
    }
  });
  it("discards background-tab gaps and clears pending time on pause", () => {
    const clock = new SimulationClock(); let ticks = 0;
    clock.advance(0.02, 1, () => ticks++);
    clock.reset(); clock.advance(60, 1, () => ticks++);
    clock.advance(0.02, 1, () => ticks++);
    expect(ticks).toBe(0);
    clock.advance(0.02, 1, () => ticks++);
    expect(ticks).toBe(1);
  });
  it("prevents a fed predator hunting and allows a hungry one, with pursuit hysteresis", () => {
    expect(shouldHunt(0.1, 1, 0, 20, false)).toBe(false);
    expect(shouldHunt(0.5, 1, 30, 20, false)).toBe(false);
    expect(shouldHunt(0.5, 1, 0, 20, false)).toBe(true);
    expect(shouldHunt(0.3, 1, 0, 20, false)).toBe(false);
    expect(shouldHunt(0.3, 1, 0, 20, true)).toBe(true);
    expect(pursuitSeconds(100, 0)).toBe(1.2);
  });
  it("blocks terrestrial shore/cliff crossings, preserves fish water, and permits flight", () => {
    const land = {isWater: false, elevation: 0.4}, water = {isWater: true, elevation: 0.2};
    expect(canCross(land, water, "ground")).toBe(false);
    expect(canCross(land, {isWater: false, elevation: 0.8}, "ground")).toBe(false);
    expect(canCross(land, {isWater: false, elevation: 0.45}, "ground")).toBe(true);
    expect(canCross(water, land, "fish")).toBe(false);
    expect(canCross(water, water, "fish")).toBe(true);
    expect(canCross(land, water, "bird")).toBe(true);
  });
  it("consumers compete for finite food and regrowth restores a depleted patch", () => {
    const patch = new FoodPatch("cerrado");
    expect(patch.consume(["pastagem"], 0.8, 0)).toBeCloseTo(0.8);
    expect(patch.consume(["pastagem"], 0.8, 0)).toBeCloseTo(0.2);
    expect(patch.available(["pastagem"], 0)).toBe(false);
    expect(patch.consume(["pastagem"], 0.8, 0)).toBe(0);
    expect(patch.available(["pastagem"], 60)).toBe(true);
    expect(patch.consume(["pastagem"], 2, 60)).toBeCloseTo(0.72);
  });
  it("cannot sustain grass feeders in the ocean or create carrion without death", () => {
    const patch = new FoodPatch("oceano-pelagico");
    expect(patch.available(["pastagem"], 100)).toBe(false);
    expect(patch.available(["plancton"], 100)).toBe(true);
    expect(patch.consume(["carnica"], 1, 100)).toBe(0);
    patch.addCarrion(0.5);
    expect(patch.consume(["carnica"], 1, 100)).toBe(0.5);
    expect(patch.consume(["carnica"], 1, 200)).toBe(0);
  });
  it("requires surviving healthy parents, food and capacity, and never rescues extinction", () => {
    expect(canBreed(0, 8, 0, 100, true)).toBe(false);
    expect(canBreed(1, 8, 1, 100, true)).toBe(false);
    expect(canBreed(4, 8, 2, 100, false)).toBe(false);
    expect(canBreed(8, 8, 4, 100, true)).toBe(false);
    expect(canBreed(4, 8, 2, 10, true)).toBe(false);
    expect(canBreed(4, 8, 2, 35, true)).toBe(true);
  });
});
