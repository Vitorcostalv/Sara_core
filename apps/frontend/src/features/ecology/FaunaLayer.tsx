import React, { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type {
  PredationProfile,
  SpeciesDefinition,
  TerrainCell,
  TerrainGrid,
} from "../../services/api/ecology";
import { AnimalEntity, type AgentState, type FaunaAgent, type AnimalKind } from "./AnimalEntity";
import { CarcassLayer, type CarcassController, type CarcassRecordInput } from "./CarcassLayer";
import { DeathPuffLayer, type DeathPuffController } from "./DeathPuffLayer";
import { FaunaSpatialIndex } from "./FaunaSpatialIndex";

import { createTerrainSurface } from "./terrain-surface";
import { swimmingHeight, waterSurfaceHeights } from "./terrain-water";
import { FoodPatch, SimulationClock, canBreed, canCross, pursuitSeconds, shouldHunt, type PopulationMode } from "./fauna-dynamics";

const CELL_SIZE = 1;
const WATER_HEIGHT = 0.26;
const LAND_MIN_HEIGHT = 0.72;
const HEIGHT_SCALE = 6.9;
const WATER_LEVEL_Y = WATER_HEIGHT + 0.06;
// Espelha MIN_VISIBLE_WATER_DEPTH do TerrainView. Duplicado de propósito: importar
// de EcologyTerrainSection criaria ciclo, já que ele importa esta camada.
const MIN_VISIBLE_WATER_DEPTH = 0.12;
const RESPAWN_INTERVAL_SECONDS = 5;
const RESPAWN_THRESHOLD = 0.6;
const SEPARATION_WEIGHT = 1.5;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 0.8;
const FLEE_WEIGHT = 3.0;
const HUNT_WEIGHT = 2.2;
const HOME_WEIGHT = 1.6;
const WANDER_WEIGHT = 1.05;
const HUNGER_MAX = 1.4;
const PREDATION_ENERGY_PER_MASS = 0.65;
const HUNT_TARGET_MEMORY_SECONDS = 2.2;
const ENABLE_DEV_PREDATION_NUDGE = false;
const SPATIAL_INDEX_CELL_SIZE = 3.2;

export type FaunaEventKind = "predation" | "starvation" | "respawn" | "birth" | "decomposition";

export interface FaunaEvent {
  id: string;
  kind: FaunaEventKind;
  message: string;
  x: number;
  y: number;
  z: number;
  createdAt: number;
  speciesId?: string;
  predatorSpeciesId?: string;
  preySpeciesId?: string;
}

type ResolvedPredationProfile = Required<Omit<PredationProfile, "preyPreference">> & {
  preyPreference: Record<string, number>;
};

const DEFAULT_PREDATION: ResolvedPredationProfile = {
  attackRange: 0.85,
  damageRate: 0.72,
  huntRange: 6,
  hungerRate: 0.018,
  starvationThreshold: 1,
  satiationCooldownMs: 2600,
  preyPreference: {},
};

interface TerrainPoint {
  cell: TerrainCell;
  x: number;
  z: number;
  topY: number;
  floorY: number;
  food: FoodPatch;
}

interface TerrainContext {
  surface: ReturnType<typeof createTerrainSurface>;
  halfWidth: number;
  halfHeight: number;
  landCells: TerrainPoint[];
  waterCells: TerrainPoint[];
  cells: TerrainPoint[][];
}

interface FaunaLayerProps {
  grid: TerrainGrid;
  species: SpeciesDefinition[];
  gradientMap: THREE.DataTexture;
  paused: boolean;
  speedMultiplier: number;
  visible: boolean;
  /** Carcasses can be toggled independently from live fauna (defaults to fauna visibility). */
  carcassesVisible?: boolean;
  populationMode?: PopulationMode;
  onCountUpdate?: (count: number) => void;
  onFaunaEvent?: (event: FaunaEvent) => void;
  invasiveSpeciesIds?: string[];
}

interface FaunaSpeciesLayerProps {
  grid: TerrainGrid;
  terrain: TerrainContext;
  species: SpeciesDefinition;
  paused: boolean;
  speedMultiplier: number;
  visible: boolean;
  registryRef: React.MutableRefObject<Map<string, FaunaAgent[]>>;
  allSpeciesMap: Map<string, SpeciesDefinition>;
  onCountChange: (speciesId: string, count: number) => void;
  emitPuff: (x: number, y: number, z: number) => void;
  emitCarcass: (input: CarcassRecordInput) => void;
  emitFaunaEvent?: (event: Omit<FaunaEvent, "id" | "createdAt">) => void;
  spatialIndexRef: React.MutableRefObject<FaunaSpatialIndex>;
  spatialTickRef: React.MutableRefObject<number>;
  invasiveSpeciesIds: Set<string>;
  populationMode: PopulationMode;
  stepCallbacks: React.MutableRefObject<Map<string, (dt: number) => void>>;
}

function hashUnit(x: number, z: number, seed: number) {
  let value = Math.imul(x + seed * 131, 374761393);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= Math.imul(z + seed * 17, 668265263);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return (value >>> 0) / 4294967295;
}

function stringHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildTerrainContext(grid: TerrainGrid): TerrainContext {
  const waterLevels = waterSurfaceHeights(grid);
  const surface = createTerrainSurface(grid);
  const halfWidth = (grid.width - 1) / 2;
  const halfHeight = (grid.height - 1) / 2;
  const cells: TerrainPoint[][] = [];
  const landCells: TerrainPoint[] = [];
  const waterCells: TerrainPoint[] = [];

  // A superfície da água acompanha o relevo submerso, com a mesma fórmula do
  // TerrainView. Uma constante fixa funcionava em rio raso, mas afundava a fauna
  // vários metros abaixo do mar num grid oceânico — os peixes saíam da malha.
  const waterElevations: number[] = [];
  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell.isWater) waterElevations.push(cell.elevation);
    }
  }
  const waterSurfaceY =
    waterElevations.length > 0
      ? LAND_MIN_HEIGHT + Math.max(...waterElevations) * HEIGHT_SCALE + MIN_VISIBLE_WATER_DEPTH
      : WATER_LEVEL_Y;

  for (const row of grid.cells) {
    const terrainRow: TerrainPoint[] = [];

    for (const cell of row) {
      const point: TerrainPoint = {
        floorY: surface.heightAt((cell.x - halfWidth) * CELL_SIZE,(cell.y - halfHeight) * CELL_SIZE),
        food: new FoodPatch(cell.biomeSuggestion, Boolean(cell.cave && cell.cave.type !== "none")),
        cell,
        x: (cell.x - halfWidth) * CELL_SIZE,
        z: (cell.y - halfHeight) * CELL_SIZE,
        topY: cell.isWater ? waterLevels.get(`${cell.x},${cell.y}`) ?? waterSurfaceY : LAND_MIN_HEIGHT + cell.elevation * HEIGHT_SCALE,
      };

      terrainRow.push(point);
      if (cell.isWater) {
        waterCells.push(point);
      } else {
        landCells.push(point);
      }
    }

    cells.push(terrainRow);
  }

  return { halfWidth, halfHeight, landCells, waterCells, cells, surface };
}

function sampleTerrainPoint(terrain: TerrainContext, x: number, z: number, interpolate = true) {
  const cellX = Math.max(
    0,
    Math.min(terrain.cells[0]!.length - 1, Math.round(x / CELL_SIZE + terrain.halfWidth)),
  );
  const cellY = Math.max(
    0,
    Math.min(terrain.cells.length - 1, Math.round(z / CELL_SIZE + terrain.halfHeight)),
  );
  const point = terrain.cells[cellY]![cellX]!;
  if (!interpolate) return point;
  const floorY = terrain.surface.heightAt(x,z);
  return { ...point, floorY, topY: point.cell.isWater ? point.topY : floorY };
}

function nearestTerrainPoint(points: TerrainPoint[], x: number, z: number): TerrainPoint | null {
  let nearest: TerrainPoint | null = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const dx = point.x - x;
    const dz = point.z - z;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < nearestDistanceSq) {
      nearest = point;
      nearestDistanceSq = distanceSq;
    }
  }
  return nearest;
}

function isPredator(category: SpeciesDefinition["category"]) {
  return category === "predator-medium" || category === "predator-large";
}

function isBird(category: SpeciesDefinition["category"]) {
  return category === "bird";
}

function isFish(category: SpeciesDefinition["category"]) {
  return category === "fish";
}

function isGroundAnimal(category: SpeciesDefinition["category"]) {
  return !isBird(category) && !isFish(category);
}

function animalKind(category: SpeciesDefinition["category"]): AnimalKind {
  if (isBird(category)) return "bird";
  if (isFish(category)) return "fish";
  return "ground";
}

const CAVE_PSEUDO_BIOME = "caverna";

function hasCave(point: TerrainPoint) {
  return point.cell.cave !== undefined && point.cell.cave.type !== "none";
}

function isHabitablePoint(species: SpeciesDefinition, point: TerrainPoint) {
  // Cave species use the "caverna" pseudo-biome: they spawn on cells that expose a
  // cave, not on cells whose biomeSuggestion equals "caverna" (none ever do).
  if (species.habitableBiomes.includes(CAVE_PSEUDO_BIOME)) {
    if (!hasCave(point)) return false;
    if (isFish(species.category)) {
      return point.cell.cave?.type === "river-cave" || (point.cell.riverDistance ?? 99) <= 1 || point.cell.cave!.humidity >= 0.85;
    }
    if (isGroundAnimal(species.category) && point.cell.isWater) return false;
    return true;
  }
  if (isFish(species.category)) {
    return point.cell.isWater && species.habitableBiomes.includes(point.cell.biomeSuggestion);
  }
  if (isGroundAnimal(species.category) && point.cell.isWater) return false;
  return species.habitableBiomes.includes(point.cell.biomeSuggestion);
}

/** Check the segment before moving/attacking so shorelines and cliffs are barriers. */
function traversable(terrain: TerrainContext, from: THREE.Vector3, to: THREE.Vector3, kind: AnimalKind) {
  if (kind === "bird") return true;
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  const samples = Math.max(1, Math.ceil(distance / 0.3));
  let previous = sampleTerrainPoint(terrain, from.x, from.z, false).cell;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = from.x + (to.x - from.x) * t;
    const z = from.z + (to.z - from.z) * t;
    if (Math.abs(x) > terrain.halfWidth || Math.abs(z) > terrain.halfHeight) return false;
    const next = sampleTerrainPoint(terrain, x, z, false).cell;
    if (!canCross(previous, next, kind)) return false;
    previous = next;
  }
  return true;
}

function habitatPool(species: SpeciesDefinition, terrain: TerrainContext) {
  const preferred =
    isFish(species.category) || isBird(species.category)
      ? [...terrain.landCells, ...terrain.waterCells]
      : terrain.landCells;
  const filtered = preferred.filter((point) => isHabitablePoint(species, point));

  if (filtered.length > 0) return filtered;
  if (isFish(species.category)) return terrain.waterCells;
  return terrain.landCells.length > 0 ? terrain.landCells : [...terrain.waterCells];
}

function speciesSize(category: SpeciesDefinition["category"]) {
  switch (category) {
    case "herbivore-large":
    case "predator-large":
      return 0.42;
    case "predator-medium":
      return 0.34;
    case "bird":
      return 0.26;
    case "fish":
      return 0.28;
    default:
      return 0.24;
  }
}

function speciesMass(species: SpeciesDefinition) {
  if (Number.isFinite(species.mass) && species.mass > 0) return species.mass;
  switch (species.category) {
    case "predator-large":
    case "herbivore-large":
      return 0.85;
    case "predator-medium":
      return 0.52;
    case "bird":
    case "fish":
      return 0.28;
    default:
      return 0.28;
  }
}

function awarenessRangeFor(species: SpeciesDefinition) {
  if (Number.isFinite(species.awarenessRange) && species.awarenessRange > 0) {
    return species.awarenessRange;
  }
  if (species.category === "herbivore-large") return 5.4;
  if (species.category === "herbivore-small") return 5.0;
  if (species.category === "bird") return 5.6;
  if (species.category === "fish") return 3.9;
  return 4.2;
}

function resolvePredationParams(species: SpeciesDefinition): ResolvedPredationProfile {
  return {
    ...DEFAULT_PREDATION,
    ...species.predation,
    preyPreference: {
      ...DEFAULT_PREDATION.preyPreference,
      ...(species.predation?.preyPreference ?? {}),
    },
  };
}

function spawnAgents(species: SpeciesDefinition, terrain: TerrainContext, seed: number): FaunaAgent[] {
  const pool = habitatPool(species, terrain);
  const speciesSeed = stringHash(species.id) ^ seed;
  const agents: FaunaAgent[] = [];
  if (pool.length === 0) return agents;
  const size = speciesSize(species.category);

  for (let slot = 0; slot < species.populationTarget; slot += 1) {
    const poolIndex = Math.min(
      pool.length - 1,
      Math.floor(hashUnit(slot * 23, speciesSeed & 1023, speciesSeed + 13) * pool.length),
    );
    const point = pool[poolIndex] ?? pool[0]!;
    const spread = isBird(species.category) ? 0.7 : isFish(species.category) ? 0.45 : 0.35;
    const x = point.x + (hashUnit(slot * 31, speciesSeed & 2047, seed + 41) - 0.5) * spread;
    const z = point.z + (hashUnit(slot * 37, speciesSeed & 4095, seed + 53) - 0.5) * spread;
    const heading = hashUnit(slot * 41, speciesSeed & 8191, seed + 67) * Math.PI * 2;
    const speed =
      species.movementProfile.maxSpeed *
      (0.42 + hashUnit(slot * 47, speciesSeed & 16383, seed + 79) * 0.24);
    const verticalSpeed = isBird(species.category)
      ? (hashUnit(slot * 59, speciesSeed & 32767, seed + 97) - 0.5) * 0.22
      : isFish(species.category)
        ? (hashUnit(slot * 61, speciesSeed & 65535, seed + 109) - 0.5) * 0.08
        : 0;

    const baseY = point.cell.isWater
      ? swimmingHeight(point.topY, point.floorY)
      : point.topY + size * (isPredator(species.category) ? 0.48 : 0.58);
    const position = new THREE.Vector3(
      x,
      isBird(species.category)
        ? point.topY + 1 + hashUnit(slot * 71, speciesSeed & 131071, seed + 127) * 0.7
        : baseY,
      z,
    );
    const velocity = new THREE.Vector3(
      Math.sin(heading) * speed,
      verticalSpeed,
      Math.cos(heading) * speed,
    );

    agents.push({
      slot,
      position,
      velocity,
      spawnPosition: position.clone(),
      spawnVelocity: velocity.clone(),
      state: species.flockProfile.formsFlocks ? "flocking" : "wandering",
      health: 1,
      timer: hashUnit(slot * 83, speciesSeed & 262143, seed + 149) * Math.PI * 4,
      deathTimer: 0,
      active: true,
      scale: 1,
      homeRadius: 2.6 + hashUnit(slot * 89, speciesSeed & 524287, seed + 173) * 2.4,
      flapOffset: hashUnit(slot * 97, speciesSeed & 1048575, seed + 191) * Math.PI * 2,
      // Stagger initial hunger deterministically so predators don't all starve in lockstep.
      hunger: hashUnit(slot * 103, speciesSeed & 2097151, seed + 211) * 0.4,
      satedUntil: 0,
      huntTargetKey: null,
      huntTargetUntil: 0,
      roamTarget: position.clone(),
      roamTargetUntil: 0,
      roamRevision: 0,
      progressAnchor: position.clone(),
      progressCheckAt: 1.5 + hashUnit(slot * 107, speciesSeed & 4194303, seed + 223),
    });
  }

  return agents;
}

function terrainTopForAgent(species: SpeciesDefinition, point: TerrainPoint) {
  if (isFish(species.category)) return swimmingHeight(point.topY, point.floorY);
  if (isBird(species.category)) return point.topY + 1;
  return point.topY + speciesSize(species.category) * (isPredator(species.category) ? 0.48 : 0.58);
}

function carcassYFor(species: SpeciesDefinition, point: TerrainPoint) {
  if (isFish(species.category)) return swimmingHeight(point.topY, point.floorY);
  return point.topY + 0.06;
}

function resetAgent(agent: FaunaAgent, species: SpeciesDefinition, terrain: TerrainContext) {
  const point = sampleTerrainPoint(terrain, agent.spawnPosition.x, agent.spawnPosition.z);
  agent.position.copy(agent.spawnPosition);
  agent.position.y = terrainTopForAgent(species, point);
  agent.velocity.copy(agent.spawnVelocity);
  agent.state = species.flockProfile.formsFlocks ? "flocking" : "wandering";
  agent.health = 1;
  agent.timer = agent.flapOffset;
  agent.deathTimer = 0;
  agent.active = true;
  agent.scale = 1;
  agent.hunger = 0;
  agent.satedUntil = 0;
  agent.huntTargetKey = null;
  agent.huntTargetUntil = 0;
  agent.roamTarget.copy(agent.spawnPosition);
  agent.roamTargetUntil = 0;
  agent.roamRevision = 0;
  agent.progressAnchor.copy(agent.position);
  agent.progressCheckAt = 1.5;
}

function chooseRoamTarget(
  agent: FaunaAgent,
  species: SpeciesDefinition,
  terrain: TerrainContext,
  seed: number,
  now: number,
) {
  const pool = habitatPool(species, terrain);
  const speciesSeed = stringHash(species.id) ^ seed;
  let selected: TerrainPoint | undefined;

  // Prefer a valid point inside the home range. Several deterministic attempts avoid
  // repeatedly selecting an isolated cell on the opposite side of the map.
  for (let attempt = 0; attempt < Math.min(12, pool.length); attempt += 1) {
    const sample = hashUnit(
      agent.slot * 113 + agent.roamRevision * 29 + attempt * 17,
      speciesSeed & 8191,
      seed + 239,
    );
    const point = pool[Math.min(pool.length - 1, Math.floor(sample * pool.length))];
    if (!point) continue;
    const distance = Math.hypot(point.x - agent.spawnPosition.x, point.z - agent.spawnPosition.z);
    if (distance <= agent.homeRadius * 1.15 && traversable(terrain, agent.position, new THREE.Vector3(point.x, point.topY, point.z), animalKind(species.category)) && (!(species.resourceNeeds?.length) || point.food.available(species.resourceNeeds, now))) {
      selected = point;
      break;
    }
  }

  selected ??= nearestTerrainPoint(pool, agent.spawnPosition.x, agent.spawnPosition.z) ?? undefined;
  if (selected) {
    agent.roamTarget.set(selected.x, terrainTopForAgent(species, selected), selected.z);
  } else {
    agent.roamTarget.copy(agent.spawnPosition);
  }
  agent.roamRevision += 1;
  agent.roamTargetUntil = now + 3.5 + hashUnit(agent.roamRevision, agent.slot, speciesSeed) * 4;
}

function FaunaSpeciesLayer({
  grid,
  terrain,
  species,
  paused,
  speedMultiplier,
  visible,
  registryRef,
  allSpeciesMap,
  onCountChange,
  emitPuff,
  emitCarcass,
  emitFaunaEvent,
  spatialIndexRef,
  spatialTickRef,
  invasiveSpeciesIds,
  populationMode,
  stepCallbacks,
}: FaunaSpeciesLayerProps) {
  const initialAgents = useMemo(() => spawnAgents(species, terrain, grid.seed), [grid.seed, species, terrain]);
  const agentsRef = useRef<FaunaAgent[]>(initialAgents);
  const lastCountRef = useRef(species.populationTarget);
  const respawnClockRef = useRef(0);
  const simClockRef = useRef(0);
  const breedingClockRef = useRef(0);
  const stepRef = useRef<(dt: number) => void>(() => {});
  useEffect(() => {
    stepCallbacks.current.set(species.id, dt => stepRef.current(dt));
    return () => { stepCallbacks.current.delete(species.id); };
  }, [stepCallbacks, species.id]);
  const flockIds = useMemo(() => new Set(species.preySpeciesIds), [species.preySpeciesIds]);
  const predation = useMemo(() => resolvePredationParams(species), [species]);
  const awarenessRange = useMemo(() => awarenessRangeFor(species), [species]);
  const kind = animalKind(species.category);

  useEffect(() => {
    simClockRef.current = 0;
    respawnClockRef.current = 0;
    breedingClockRef.current = 0;
    agentsRef.current = initialAgents;
    registryRef.current.set(species.id, agentsRef.current);
    lastCountRef.current = initialAgents.length;
    onCountChange(species.id, initialAgents.length);
    if (import.meta.env.DEV) {
      // Dev-only sanity checks for predation parameters and initial hunger/sated state.
      const hasPrey = species.preySpeciesIds && species.preySpeciesIds.length > 0;
      const pred = resolvePredationParams(species);
      if (hasPrey && (!pred || !(pred.huntRange > 0) || !(pred.attackRange > 0))) {
        console.debug("[fauna:diagnostic] species with prey missing predation params", species.id, pred);
      }
      if (agentsRef.current.some((a) => a.satedUntil > 0)) {
        console.debug("[fauna:diagnostic] some agents start sated", species.id);
      }
    }

    return () => {
      registryRef.current.delete(species.id);
      onCountChange(species.id, 0);
    };
  }, [initialAgents, onCountChange, registryRef, species.id, species.populationTarget]);

  stepRef.current = (dt: number) => {
    if (paused) return;
    simClockRef.current += dt;
    const now = simClockRef.current;
    const agents = agentsRef.current;
    const isHunter = species.preySpeciesIds.length > 0;
    const interactionRadius = Math.max(
      species.flockProfile.flockRadius,
      species.flockProfile.separationDistance,
      awarenessRange,
      isHunter ? predation.huntRange : 0,
    );
    spatialIndexRef.current.rebuild(registryRef.current, spatialTickRef.current);
    let liveCount = 0;

    const killAgent = (
      victim: FaunaAgent,
      victimSpecies: SpeciesDefinition,
      cause: "predation" | "starvation",
      predatorSpecies?: SpeciesDefinition,
    ) => {
      const terrainPoint = sampleTerrainPoint(terrain, victim.position.x, victim.position.z);
      const position = {
        x: victim.position.x,
        y: carcassYFor(victimSpecies, terrainPoint),
        z: victim.position.z,
      };
      emitPuff(position.x, position.y + 0.08, position.z);
      emitCarcass({
        ...position,
        category: victimSpecies.category,
        feedingStrategy: victimSpecies.feedingStrategy,
        cause,
        speciesName: victimSpecies.commonName,
        predatorName: predatorSpecies?.commonName,
        kind: animalKind(victimSpecies.category),
      });
      terrainPoint.food.addCarrion(speciesMass(victimSpecies) * 0.4);
      victim.active = false;
      victim.state = "dying";
      victim.scale = 0.0001;
      victim.huntTargetKey = null;
      victim.huntTargetUntil = 0;
      return position;
    };

    for (const agent of agents) {
      agent.timer += dt;

      if (!agent.active) continue;
      liveCount += 1;

      const localPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);
      const needs = species.resourceNeeds ?? [];
      const effort = agent.state === "hunting" || agent.state === "fleeing" ? 1.8 : 1;
      agent.hunger = Math.min(HUNGER_MAX, agent.hunger + dt * predation.hungerRate * effort);
      // Feeding competes for a finite local resource; omnivores really eat rather than
      // receiving a permanent metabolic discount when no prey remains.
      const canFeed = agent.state !== "fleeing" && agent.state !== "hunting" && isHabitablePoint(species, localPoint);
      const eaten = canFeed && agent.hunger > 0.12 ? localPoint.food.consume(needs, dt * 0.09, now) : 0;
      agent.hunger = Math.max(0, agent.hunger - eaten);
      if (agent.hunger >= predation.starvationThreshold) {
        const position = killAgent(agent, species, "starvation");
        emitFaunaEvent?.({ kind: "starvation", message: `${species.commonName} morreu por falta de alimento`, speciesId: species.id, ...position });
        liveCount -= 1;
        continue;
      }

      const steering = new THREE.Vector3();
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      if (now >= agent.roamTargetUntil || agent.position.distanceTo(agent.roamTarget) < 0.6) {
        chooseRoamTarget(agent, species, terrain, grid.seed, now);
      }
      if (now >= agent.progressCheckAt) {
        const progress = agent.position.distanceTo(agent.progressAnchor);
        agent.progressAnchor.copy(agent.position);
        agent.progressCheckAt = now + 1.5;
        if (progress < 0.35) {
          agent.roamTargetUntil = 0;
          chooseRoamTarget(agent, species, terrain, grid.seed, now);
          const escapeAngle = hashUnit(agent.slot, agent.roamRevision, grid.seed) * Math.PI * 2;
          agent.velocity.x = Math.sin(escapeAngle) * species.movementProfile.maxSpeed * 0.65;
          agent.velocity.z = Math.cos(escapeAngle) * species.movementProfile.maxSpeed * 0.65;
        }
      }
      const wander = new THREE.Vector3().subVectors(agent.roamTarget, agent.position);
      const nearbyEntries = spatialIndexRef.current.query(agent.position.x, agent.position.z, interactionRadius);
      let neighbors = 0;
      let nearestThreatDistance = Number.POSITIVE_INFINITY;
      let nearestHuntScore = Number.POSITIVE_INFINITY;
      let huntTarget: {
        otherAgent: FaunaAgent;
        otherSpecies: SpeciesDefinition;
        offset: THREE.Vector3;
        distance: number;
        preference: number;
        targetKey: string;
      } | null = null;
      let state: AgentState = "wandering";

      for (const entry of nearbyEntries) {
        if (entry.speciesId !== species.id) continue;
        const other = entry.agent;
        if (other === agent || !other.active || other.state === "dying") continue;
        const diff = new THREE.Vector3().subVectors(agent.position, other.position);
        const distance = diff.length();

        if (distance <= 0.0001) continue;

        if (distance < species.flockProfile.flockRadius) {
          alignment.add(other.velocity);
          cohesion.add(other.position);
          neighbors += 1;
        }

        if (distance < species.flockProfile.separationDistance) {
          separation.add(
            diff.normalize().multiplyScalar(
              (species.flockProfile.separationDistance - distance) / species.flockProfile.separationDistance,
            ),
          );
        }
      }

      if (neighbors > 0) {
        alignment.divideScalar(neighbors);
        cohesion.divideScalar(neighbors).sub(agent.position);
        if (species.flockProfile.formsFlocks) {
          steering.addScaledVector(separation, SEPARATION_WEIGHT);
          steering.addScaledVector(alignment.normalize(), ALIGNMENT_WEIGHT);
          steering.addScaledVector(cohesion.normalize(), COHESION_WEIGHT);
          state = "flocking";
        } else {
          steering.addScaledVector(separation, SEPARATION_WEIGHT * 0.7);
        }
      }

      const isSated = !isHunter || !shouldHunt(agent.hunger, predation.starvationThreshold, agent.satedUntil, now, agent.state === "hunting");
      const huntWeight = HUNT_WEIGHT * (0.55 + agent.hunger);

      for (const entry of nearbyEntries) {
        const otherSpeciesId = entry.speciesId;
        if (otherSpeciesId === species.id) continue;
        const otherSpecies = allSpeciesMap.get(otherSpeciesId);
        if (!otherSpecies) continue;

        const currentSpeciesIsPrey = otherSpecies.preySpeciesIds.includes(species.id);
        const currentSpeciesCanHunt = flockIds.has(otherSpeciesId);
        const otherAgent = entry.agent;
        if (!otherAgent.active || otherAgent.state === "dying") continue;

        const offset = new THREE.Vector3().subVectors(otherAgent.position, agent.position);
        const distance = offset.length();
        if (distance <= 0.0001) continue;

        if (currentSpeciesIsPrey && distance < awarenessRange && distance < nearestThreatDistance) {
          nearestThreatDistance = distance;
          steering.addScaledVector(offset.normalize().multiplyScalar(-1), FLEE_WEIGHT);
          state = "fleeing";
        }

        if (!isSated && currentSpeciesCanHunt && distance < predation.huntRange && traversable(terrain, agent.position, otherAgent.position, kind)) {
          const preference = Math.max(0.1, predation.preyPreference[otherSpeciesId] ?? 1);
          const targetKey = `${otherSpeciesId}:${otherAgent.slot}`;
          const targetMemory =
            agent.huntTargetKey === targetKey && now < agent.huntTargetUntil ? 0.58 : 1;
          const huntScore = (distance / preference) * targetMemory;
          if (huntScore >= nearestHuntScore) continue;

          nearestHuntScore = huntScore;
          huntTarget = { otherAgent, otherSpecies, offset, distance, preference, targetKey };
        }
      }

      // Apply exactly one chase vector. Accumulating every candidate that briefly became
      // "nearest" made hunters average conflicting headings and settle into circular paths.
      if (huntTarget && state !== "fleeing") {
        const { otherAgent, otherSpecies, offset, distance, preference, targetKey } = huntTarget;
        const intercept = otherAgent.position.clone().addScaledVector(otherAgent.velocity, pursuitSeconds(distance, species.movementProfile.maxSpeed));
        const aim = traversable(terrain, agent.position, intercept, kind) ? intercept.sub(agent.position) : offset;
        steering.addScaledVector(aim.normalize(), huntWeight * preference);
        state = "hunting";
        agent.huntTargetKey = targetKey;
        agent.huntTargetUntil = now + HUNT_TARGET_MEMORY_SECONDS;

        if (distance < predation.attackRange) {
          otherAgent.health -= dt * predation.damageRate;
          if (otherAgent.health <= 0) {
            const position = killAgent(otherAgent, otherSpecies, "predation", species);
            emitFaunaEvent?.({
              kind: "predation",
              message: `${species.commonName} caçou ${otherSpecies.commonName}`,
              speciesId: species.id,
              predatorSpeciesId: species.id,
              preySpeciesId: otherSpecies.id,
              ...position,
            });
            agent.hunger = Math.max(
              0,
              agent.hunger - speciesMass(otherSpecies) * PREDATION_ENERGY_PER_MASS,
            );
            agent.satedUntil = now + Math.max(8, predation.satiationCooldownMs / 1000);
            agent.huntTargetKey = null;
            agent.huntTargetUntil = 0;
          } else {
            otherAgent.state = "fleeing";
          }
        }
      }

      const terrainPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);
      const validHabitat = isHabitablePoint(species, terrainPoint);
      const homeVector = new THREE.Vector3().subVectors(agent.spawnPosition, agent.position);

      if (!validHabitat || (state !== "hunting" && state !== "fleeing" && homeVector.length() > agent.homeRadius)) {
        steering.addScaledVector(homeVector.normalize(), HOME_WEIGHT);
      }

      if (state !== "hunting" && state !== "fleeing" && wander.lengthSq() > 0.0001) {
        steering.addScaledVector(wander.normalize(), WANDER_WEIGHT);
      }

      if (state !== "hunting" && state !== "fleeing") {
        if (eaten > 0) state = "feeding";
        else if (isHunter && now < agent.satedUntil) state = "resting";
      }
      const desiredDirection =
        steering.lengthSq() > 0.0001 ? steering.normalize() : agent.velocity.clone().normalize();
      const baseSpeed = species.movementProfile.maxSpeed;
      const desiredSpeed =
        state === "feeding" || state === "resting" ? baseSpeed * 0.12 : state === "fleeing"
          ? baseSpeed * species.movementProfile.fleeMultiplier
          : state === "hunting"
            ? baseSpeed * 1.08
            : state === "flocking"
              ? baseSpeed * 0.94
              : baseSpeed * 0.72;

      const desiredVelocity = desiredDirection.multiplyScalar(Math.max(0.08, desiredSpeed));
      if (isGroundAnimal(species.category)) desiredVelocity.y = 0;

      agent.velocity.lerp(desiredVelocity, Math.min(1, species.movementProfile.turnRate * dt * 0.32));

      const maxSpeed =
        state === "fleeing"
          ? baseSpeed * species.movementProfile.fleeMultiplier
          : state === "hunting"
            ? baseSpeed * 1.1
            : baseSpeed;
      const horizontalSpeed = Math.hypot(agent.velocity.x, agent.velocity.z);

      if (horizontalSpeed > maxSpeed) {
        const scale = maxSpeed / horizontalSpeed;
        agent.velocity.x *= scale;
        agent.velocity.z *= scale;
      }

      if (isGroundAnimal(species.category)) {
        agent.velocity.y = 0;
      } else {
        agent.velocity.y = THREE.MathUtils.clamp(
          agent.velocity.y,
          isBird(species.category) ? -0.6 : -0.24,
          isBird(species.category) ? 0.6 : 0.24,
        );
      }

      const nextPosition = agent.position.clone().addScaledVector(agent.velocity, dt);
      if (traversable(terrain, agent.position, nextPosition, kind)) {
        agent.position.copy(nextPosition);
      } else {
        // Try a small turn before reversing. No teleport toward a distant shore.
        let avoided = false;
        for (const angle of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
          const velocity = agent.velocity.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
          const candidate = agent.position.clone().addScaledVector(velocity, dt);
          if (!traversable(terrain, agent.position, candidate, kind)) continue;
          agent.position.copy(candidate);
          agent.velocity.copy(velocity);
          avoided = true;
          break;
        }
        if (!avoided) agent.velocity.multiplyScalar(0.5);
        agent.roamTargetUntil = 0;
      }

      if (Math.abs(agent.position.x) > terrain.halfWidth) {
        agent.position.x = Math.sign(agent.position.x) * terrain.halfWidth;
        agent.velocity.x *= -1;
      }
      if (Math.abs(agent.position.z) > terrain.halfHeight) {
        agent.position.z = Math.sign(agent.position.z) * terrain.halfHeight;
        agent.velocity.z *= -1;
      }

      let resolvedPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);

      if (isFish(species.category) && !resolvedPoint.cell.isWater && terrain.waterCells.length > 0) {
        const waterPoint = nearestTerrainPoint(terrain.waterCells, agent.position.x, agent.position.z);
        if (waterPoint) {
          agent.position.x = THREE.MathUtils.lerp(agent.position.x, waterPoint.x, 0.35);
          agent.position.z = THREE.MathUtils.lerp(agent.position.z, waterPoint.z, 0.35);
          resolvedPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);
        }
      } else if (isGroundAnimal(species.category) && resolvedPoint.cell.isWater && terrain.landCells.length > 0) {
        const landPoint = nearestTerrainPoint(terrain.landCells, agent.position.x, agent.position.z);
        if (landPoint) {
          agent.position.x = THREE.MathUtils.lerp(agent.position.x, landPoint.x, 0.28);
          agent.position.z = THREE.MathUtils.lerp(agent.position.z, landPoint.z, 0.28);
          resolvedPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);
        }
      }

      if (isGroundAnimal(species.category)) {
        agent.position.y = THREE.MathUtils.lerp(
          agent.position.y,
          resolvedPoint.topY + speciesSize(species.category) * (isPredator(species.category) ? 0.48 : 0.58),
          0.42,
        );
      } else if (isBird(species.category)) {
        const targetY =
          resolvedPoint.topY + 1 + Math.sin(agent.timer * 1.1 + agent.flapOffset) * 0.24;
        agent.position.y = THREE.MathUtils.lerp(agent.position.y, targetY, 0.08);
      } else {
        const targetY =
          swimmingHeight(resolvedPoint.topY, resolvedPoint.floorY, Math.sin(agent.timer * 1.8 + agent.flapOffset) * 0.05);
        agent.position.y = THREE.MathUtils.lerp(agent.position.y, targetY, 0.1);
      }

      if (state !== "hunting" && state !== "fleeing" && agent.hunger < 0.4) agent.health = Math.min(1, agent.health + dt * 0.03);
      agent.scale = 1;
      agent.state = state;
    }

    liveCount = agents.filter(agent => agent.active).length;
    if (populationMode === "demonstration" && liveCount < Math.ceil(species.populationTarget * RESPAWN_THRESHOLD)) {
      respawnClockRef.current += dt;
      if (respawnClockRef.current >= RESPAWN_INTERVAL_SECONDS) {
        const deadAgent = agents.find((a) => !a.active);
        if (deadAgent) {
          resetAgent(deadAgent, species, terrain);
          emitFaunaEvent?.({
            kind: "respawn",
            message: `${species.commonName}: reposição do modo demonstração`,
            speciesId: species.id,
            x: deadAgent.position.x,
            y: deadAgent.position.y,
            z: deadAgent.position.z,
          });
          liveCount += 1;
        }
        respawnClockRef.current = 0;
      }
    } else {
      respawnClockRef.current = 0;
    }

    breedingClockRef.current += dt;
    const parents = agents.filter(a => a.active && a.hunger < 0.3 && a.health > 0.8 && a.state !== "hunting" && a.state !== "fleeing");
    const pair = parents.find(a => parents.some(b => b !== a && b.position.distanceTo(a.position) < 3 && traversable(terrain, a.position, b.position, kind)));
    const foodAvailable = pair && ((species.resourceNeeds?.length ?? 0) > 0
      ? sampleTerrainPoint(terrain, pair.position.x, pair.position.z).food.available(species.resourceNeeds!, now)
      : species.preySpeciesIds.some(id => registryRef.current.get(id)?.some(a => a.active)));
    if (populationMode === "ecological" && pair && canBreed(liveCount, species.populationTarget, parents.length, breedingClockRef.current, Boolean(foodAvailable))) {
      const newborn = agents.find(a => !a.active);
      if (newborn) {
        resetAgent(newborn, species, terrain);
        newborn.position.copy(pair.position);
        newborn.spawnPosition.copy(pair.position);
        newborn.hunger = 0.2;
        newborn.satedUntil = now + 8;
        pair.hunger = Math.min(HUNGER_MAX, pair.hunger + 0.18);
        const mate = parents.find(a => a !== pair && a.position.distanceTo(pair.position) < 3 && traversable(terrain, pair.position, a.position, kind));
        if (mate) mate.hunger = Math.min(HUNGER_MAX, mate.hunger + 0.18);
        emitFaunaEvent?.({ kind: "birth", message: `${species.commonName}: nascimento com alimento e energia disponíveis`, speciesId: species.id, x: newborn.position.x, y: newborn.position.y, z: newborn.position.z });
        liveCount++;
        breedingClockRef.current = 0;
      }
    }

    if (liveCount !== lastCountRef.current) {
      lastCountRef.current = liveCount;
      onCountChange(species.id, liveCount);
    }
  };

  return (
    <group visible={visible}>
      {initialAgents.map((agent) => {
        return (
          <AnimalEntity
            key={agent.slot}
            agent={agent}
            kind={kind}
            species={species}
            category={species.category}
            feedingStrategy={species.feedingStrategy}
            speedMultiplier={speedMultiplier}
            isInvasive={invasiveSpeciesIds.has(species.id)}
          />
        );
      })}
    </group>
  );
}

export function FaunaLayer({
  grid,
  species,
  gradientMap: _gradientMap,
  paused,
  speedMultiplier,
  visible,
  carcassesVisible,
  populationMode = "ecological",
  onCountUpdate,
  onFaunaEvent,
  invasiveSpeciesIds = [],
}: FaunaLayerProps) {
  const terrain = useMemo(() => buildTerrainContext(grid), [grid, species]);
  const clock = useMemo(() => new SimulationClock(), [grid, species]);
  const stepCallbacks = useRef(new Map<string, (dt: number) => void>());
  const countCallback = useRef(onCountUpdate);
  const eventCallback = useRef(onFaunaEvent);
  countCallback.current = onCountUpdate;
  eventCallback.current = onFaunaEvent;
  const registryRef = useRef<Map<string, FaunaAgent[]>>(new Map());
  const countsRef = useRef<Map<string, number>>(new Map());
  const spatialIndexRef = useRef(new FaunaSpatialIndex(SPATIAL_INDEX_CELL_SIZE));
  const spatialTickRef = useRef(0);
  const killEventsRef = useRef(0);
  const starvationEventsRef = useRef(0);
  const respawnEventsRef = useRef(0);
  const eventIdRef = useRef(0);
  const puffControllerRef = useRef<DeathPuffController | null>(null);
  const carcassControllerRef = useRef<CarcassController | null>(null);
  const speciesMap = useMemo(() => new Map(species.map((entry) => [entry.id, entry])), [species]);
  const invasiveSet = useMemo(() => new Set(invasiveSpeciesIds), [invasiveSpeciesIds]);

  const emitPuff = useMemo(
    () => (x: number, y: number, z: number) => puffControllerRef.current?.emit(x, y, z),
    [],
  );

  const emitCarcass = useMemo(
    () => (input: CarcassRecordInput) => carcassControllerRef.current?.emit(input),
    [],
  );

  useEffect(() => {
    // Child registration effects run before this effect; derive the initial count
    // from the actual registry instead of clearing counts after registration.
    countsRef.current.clear();
    let total = 0;
    for (const entry of species) {
      const count = registryRef.current.get(entry.id)?.filter(agent => agent.active).length ?? 0;
      countsRef.current.set(entry.id, count);
      total += count;
    }
    countCallback.current?.(total);
  }, [species]);

  useFrame((_, delta) => {
    if (paused || document.hidden) { clock.reset(); return; }
    clock.advance(delta, speedMultiplier, dt => {
      spatialTickRef.current += 1;
      spatialIndexRef.current.rebuild(registryRef.current, spatialTickRef.current);
      // Every species advances once per fixed world tick, in catalog order.
      for (const entry of species) stepCallbacks.current.get(entry.id)?.(dt);
    });
  }, -10);

  const handleCountChange = useCallback((speciesId: string, count: number) => {
    countsRef.current.set(speciesId, count);
    let total = 0;
    for (const value of countsRef.current.values()) total += value;
    countCallback.current?.(total);
  }, []);

  // Centralized fauna event handler: count events (dev) and forward to parent.
  function handleFaunaEvent(event: Omit<FaunaEvent, "id" | "createdAt">) {
    const fullEvent: FaunaEvent = {
      ...event,
      id: `fauna-event-${eventIdRef.current + 1}`,
      createdAt: Date.now(),
    };
    eventIdRef.current += 1;
    // Increment counters by event kind for diagnostics.
    if (import.meta.env.DEV) {
      if (fullEvent.kind === "predation") killEventsRef.current += 1;
      else if (fullEvent.kind === "starvation") starvationEventsRef.current += 1;
      else if (fullEvent.kind === "respawn") respawnEventsRef.current += 1;
    }
    eventCallback.current?.(fullEvent);
  }

  // Dev-only diagnostics: periodic summary (throttled) to avoid log spam.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = setInterval(() => {
      try {
        const totalSpecies = species.length;
        const totalPredators = species.filter((s) => s.preySpeciesIds && s.preySpeciesIds.length > 0).length;
        const predatorsNoPreyPresent = species.filter((s) => {
          if (!s.preySpeciesIds || s.preySpeciesIds.length === 0) return false;
          // check if any prey presence in registry
          const anyPreyPresent = s.preySpeciesIds.some((preyId) => {
            const arr = registryRef.current.get(preyId);
            return !!arr && arr.filter((a) => a.active).length > 0;
          });
          return !anyPreyPresent;
        }).map((s) => s.id);

        const preyCounts: Record<string, number> = {};
        for (const [id, arr] of registryRef.current.entries()) {
          preyCounts[id] = arr.filter((a) => a.active).length;
        }

        console.debug("[fauna:diagnostic] summary", {
          totalSpecies,
          totalPredators,
          predatorsNoPreyPresent,
          preyCounts,
          killEvents: killEventsRef.current,
          starvationEvents: starvationEventsRef.current,
          respawnEvents: respawnEventsRef.current,
        });
        // reset event counters for next window
        killEventsRef.current = 0;
        starvationEventsRef.current = 0;
        respawnEventsRef.current = 0;
      } catch (err) {
        console.debug("[fauna:diagnostic] error", err);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [species]);

  // Dev-only: nudge predator spawn positions closer to prey agents to help observe predation.
  useEffect(() => {
    if (!import.meta.env.DEV || !ENABLE_DEV_PREDATION_NUDGE) return;
    const t = setTimeout(() => {
      try {
        for (const sp of species) {
          if (!sp.preySpeciesIds || sp.preySpeciesIds.length === 0) continue;
          const predators = registryRef.current.get(sp.id);
          if (!predators || predators.length === 0) continue;
          // find any prey agents available in registry
          const preyCandidates: FaunaAgent[] = [];
          for (const preyId of sp.preySpeciesIds) {
            const arr = registryRef.current.get(preyId);
            if (arr && arr.length > 0) preyCandidates.push(...arr.filter((a) => a.active));
          }
          if (preyCandidates.length === 0) continue;
          // move up to 2 predators near random prey agents
          for (let i = 0; i < Math.min(2, predators.length); i += 1) {
            const prey = preyCandidates[Math.floor(Math.random() * preyCandidates.length)];
            const predator = predators[i];
            if (prey && predator) {
              predator.position.x = prey.position.x + (Math.random() - 0.5) * 0.6;
              predator.position.z = prey.position.z + (Math.random() - 0.5) * 0.6;
              predator.position.y = prey.position.y;
            }
          }
        }
      } catch (e) {
        console.debug("[fauna:diagnostic] spawn nudge failed", e);
      }
    }, 800);
    return () => clearTimeout(t);
  }, [species]);

  // Carcasses default to fauna visibility but can be toggled independently:
  // the simulation keeps running (useFrame runs regardless of group visibility),
  // so hiding live fauna does not pause predation/decomposition.
  const showCarcasses = carcassesVisible ?? visible;
  return (
    <group>
      <group visible={visible}>
        {species.map((entry) => (
          <FaunaSpeciesLayer
            key={entry.id}
            grid={grid}
            terrain={terrain}
            species={entry}
            paused={paused}
            speedMultiplier={speedMultiplier}
            visible={visible}
            registryRef={registryRef}
            allSpeciesMap={speciesMap}
            onCountChange={handleCountChange}
            emitPuff={emitPuff}
            emitCarcass={emitCarcass}
            emitFaunaEvent={handleFaunaEvent}
            spatialIndexRef={spatialIndexRef}
            spatialTickRef={spatialTickRef}
            invasiveSpeciesIds={invasiveSet}
            populationMode={populationMode}
            stepCallbacks={stepCallbacks}
          />
        ))}
        <DeathPuffLayer controllerRef={puffControllerRef} visible={visible} />
      </group>
      <CarcassLayer controllerRef={carcassControllerRef} visible={showCarcasses} />
    </group>
  );
}

export default FaunaLayer;
