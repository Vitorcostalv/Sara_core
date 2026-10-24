import React, { act } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FaunaAgent } from "../features/ecology/AnimalEntity";
import type { SpeciesDefinition, TerrainGrid } from "../services/api/ecology";

const world = vi.hoisted(() => ({ frames: new Set<(dt: number) => void>(), agents: new Map<string, FaunaAgent[]>() }));
vi.mock("@react-three/fiber", async () => {
  const React = await import("react");
  return { useFrame: (callback: (_: unknown, dt: number) => void) => {
    const current = React.useRef(callback); current.current = callback;
    React.useEffect(() => {
      const step = (dt: number) => current.current({}, dt);
      world.frames.add(step); return () => { world.frames.delete(step); };
    }, []);
  } };
});
vi.mock("../features/ecology/AnimalEntity", () => ({ AnimalEntity: ({ agent, species }: {agent: FaunaAgent; species: SpeciesDefinition}) => {
  const list = world.agents.get(species.id) ?? [];
  if (!list.includes(agent)) list.push(agent);
  world.agents.set(species.id, list);
  return null;
} }));
vi.mock("../features/ecology/CarcassLayer", () => ({CarcassLayer: () => null}));
vi.mock("../features/ecology/DeathPuffLayer", () => ({DeathPuffLayer: () => null}));
import { FaunaLayer } from "../features/ecology/FaunaLayer";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const grid: TerrainGrid = {width: 8, height: 8, seed: 42, baseTemperatureC: 25, basePrecipitationMm: 1500, simulationNote: "test", cells: Array.from({length: 8}, (_, y) => Array.from({length: 8}, (_, x) => ({x,y,elevation: 0.4, temperatureC: 25, humidityPct: 70, precipitationMmYear: 1500, salinityPsu: 0, climateCode: "Af", biomeSuggestion: "floresta-tropical-umida", isWater: false}))) };
const herbivore: SpeciesDefinition = {id: "prey", commonName: "Presa", scientificName: "Test", category: "herbivore-small", habitableBiomes: ["floresta-tropical-umida"], diet: [], preySpeciesIds: [], trophicLevel: "primary-consumer", feedingStrategy: "herbivore", mass: 0.4, awarenessRange: 4, populationTarget: 4, movementProfile: {maxSpeed: 1, turnRate: 2, fleeMultiplier: 1.4}, flockProfile: {formsFlocks: true, flockRadius: 3, separationDistance: 0.8}, resourceNeeds: ["frutos-sementes"]};
const predator: SpeciesDefinition = {...herbivore, id: "predator", commonName: "Predador", category: "predator-medium", feedingStrategy: "carnivore", preySpeciesIds: ["prey"], populationTarget: 2, resourceNeeds: [], predation: {hungerRate: 0.025, huntRange: 6, attackRange: 0.9, damageRate: 2}};
const species = [herbivore, predator];
const gradient = new THREE.DataTexture();
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
let onCount = vi.fn();
beforeEach(() => {
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  // React DOM substitutes for the WebGL host; group is a Three.js primitive.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "debug").mockImplementation(() => {});
  onCount = vi.fn();
  world.frames.clear(); world.agents.clear();
  container = document.createElement("div"); root = createRoot(container);
});
afterEach(() => { act(() => root?.unmount()); root = undefined; vi.restoreAllMocks(); });
function mount(mode: "ecological" | "demonstration" = "ecological", paused = false) {
  act(() => root!.render(<FaunaLayer grid={grid} species={species} gradientMap={gradient} paused={paused} speedMultiplier={1} visible populationMode={mode} onCountUpdate={count => onCount(count)} />));
}
function advance(seconds: number, fps = 30) {
  act(() => { for (let frame = 0; frame < seconds * fps; frame++) for (const step of world.frames) step(1 / fps); });
}
function snapshot() { return [...world.agents].map(([id, agents]) => ({id, agents: agents.map(a => ({position: a.position.toArray(), hunger: a.hunger, health: a.health, active: a.active}))})); }

describe("live fauna integration", () => {
  it("keeps animal identity and energy through UI updates and pause/resume", () => {
    mount();
    expect(onCount).toHaveBeenLastCalledWith(6);
    advance(3);
    const agent = world.agents.get("predator")![0]!;
    const energy = agent.hunger;
    mount("ecological", true); advance(3);
    expect(world.agents.get("predator")![0]).toBe(agent);
    expect(agent.hunger).toBe(energy);
    mount(); advance(1);
    expect(agent.hunger).toBeGreaterThan(energy);
  });
  it("produces the same hunting, deaths and positions at 15 and 60 FPS", () => {
    mount(); advance(40, 15); const slow = snapshot();
    act(() => root!.unmount());
    world.agents.clear(); world.frames.clear(); root = createRoot(container);
    mount(); advance(40, 60);
    expect(snapshot()).toEqual(slow);
  });
  it("blocks attacks across a river even when prey is inside the attack radius", () => {
    for (const row of grid.cells) row[3]!.isWater = true;
    const previousRange = predator.predation!.attackRange;
    predator.predation!.attackRange = 10;
    try {
      mount();
      const prey = world.agents.get("prey")!;
      const hunters = world.agents.get("predator")!;
      prey.forEach(a => {a.position.set(1.5, 3.6, 0); a.spawnPosition.copy(a.position); a.velocity.set(0,0,0);});
      hunters.forEach(a => {a.position.set(-2, 3.6, 0); a.spawnPosition.copy(a.position); a.hunger = 0.5;});
      advance(5);
      expect(prey.every(a => a.health === 1 && a.active)).toBe(true);
      expect(hunters.every(a => a.position.x < -1)).toBe(true);
    } finally {
      for (const row of grid.cells) row[3]!.isWater = false;
      predator.predation!.attackRange = previousRange;
    }
  });
  it("keeps an extinct species extinct in ecological mode and identifies demo replenishment", () => {
    mount();
    const prey = world.agents.get("prey")!;
    prey.forEach(agent => {agent.active = false;});
    advance(10);
    expect(prey.every(agent => !agent.active)).toBe(true);
    mount("demonstration"); advance(6);
    expect(prey.some(agent => agent.active)).toBe(true);
  });
});
