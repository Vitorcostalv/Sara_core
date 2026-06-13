import React, { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { SpeciesDefinition, TerrainCell, TerrainGrid } from "../../services/api/ecology";
import { AnimalEntity, type AgentState, type FaunaAgent, type AnimalKind } from "./AnimalEntity";
import { FAUNA_MODELS, CATEGORY_TO_MODELS } from "./faunaModels";

// Preload all models at module load time to avoid pop-in
Object.values(FAUNA_MODELS).forEach((m) => useGLTF.preload(`/models/fauna/${m.file}`));

const CELL_SIZE = 1;
const WATER_HEIGHT = 0.26;
const LAND_MIN_HEIGHT = 0.72;
const HEIGHT_SCALE = 6.9;
const WATER_LEVEL_Y = WATER_HEIGHT + 0.06;
const WATER_SWIM_Y = WATER_LEVEL_Y - 0.15;
const DEATH_DURATION_SECONDS = 1.5;
const RESPAWN_INTERVAL_SECONDS = 5;
const RESPAWN_THRESHOLD = 0.6;
const SEPARATION_WEIGHT = 1.5;
const ALIGNMENT_WEIGHT = 1.0;
const COHESION_WEIGHT = 0.8;
const FLEE_WEIGHT = 3.0;
const HUNT_WEIGHT = 2.2;
const HOME_WEIGHT = 1.6;
const WANDER_WEIGHT = 0.45;
// Hunger drives the trophic chain: predators grow hungrier, hunt harder, and starve if they
// never feed. Tuned slow so the balance reads over tens of seconds, not instantly.
const HUNGER_RATE = 0.018; // per simulated second
const STARVATION_THRESHOLD = 1; // hunger ≥ 1 → death by starvation
const HUNGER_MAX = 1.4;

interface TerrainPoint {
  cell: TerrainCell;
  x: number;
  z: number;
  topY: number;
}

interface TerrainContext {
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
  onCountUpdate?: (count: number) => void;
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
  const halfWidth = (grid.width - 1) / 2;
  const halfHeight = (grid.height - 1) / 2;
  const cells: TerrainPoint[][] = [];
  const landCells: TerrainPoint[] = [];
  const waterCells: TerrainPoint[] = [];

  for (const row of grid.cells) {
    const terrainRow: TerrainPoint[] = [];

    for (const cell of row) {
      const point = {
        cell,
        x: (cell.x - halfWidth) * CELL_SIZE,
        z: (cell.y - halfHeight) * CELL_SIZE,
        topY: cell.isWater ? WATER_LEVEL_Y : LAND_MIN_HEIGHT + cell.elevation * HEIGHT_SCALE,
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

  return { halfWidth, halfHeight, landCells, waterCells, cells };
}

function sampleTerrainPoint(terrain: TerrainContext, x: number, z: number) {
  const cellX = Math.max(
    0,
    Math.min(terrain.cells[0]!.length - 1, Math.round(x / CELL_SIZE + terrain.halfWidth)),
  );
  const cellY = Math.max(
    0,
    Math.min(terrain.cells.length - 1, Math.round(z / CELL_SIZE + terrain.halfHeight)),
  );
  return terrain.cells[cellY]![cellX]!;
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

function isHabitablePoint(species: SpeciesDefinition, point: TerrainPoint) {
  if (isFish(species.category)) {
    return point.cell.isWater && species.habitableBiomes.includes(point.cell.biomeSuggestion);
  }
  if (isGroundAnimal(species.category) && point.cell.isWater) return false;
  return species.habitableBiomes.includes(point.cell.biomeSuggestion);
}

function habitatPool(species: SpeciesDefinition, terrain: TerrainContext) {
  const preferred =
    isFish(species.category) || isBird(species.category)
      ? [...terrain.landCells, ...terrain.waterCells]
      : terrain.landCells;
  const filtered = preferred.filter((point) => isHabitablePoint(species, point));

  if (filtered.length > 0) return filtered;
  if (isFish(species.category) && terrain.waterCells.length > 0) return terrain.waterCells;
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

function spawnAgents(species: SpeciesDefinition, terrain: TerrainContext, seed: number): FaunaAgent[] {
  const pool = habitatPool(species, terrain);
  const speciesSeed = stringHash(species.id) ^ seed;
  const agents: FaunaAgent[] = [];
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
      ? WATER_SWIM_Y
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
    });
  }

  return agents;
}

function terrainTopForAgent(species: SpeciesDefinition, point: TerrainPoint) {
  if (isFish(species.category)) return WATER_SWIM_Y;
  if (isBird(species.category)) return point.topY + 1;
  return point.topY + speciesSize(species.category) * (isPredator(species.category) ? 0.48 : 0.58);
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
}

function selectModel(speciesId: string, slot: number, category: SpeciesDefinition["category"]) {
  const modelKeys = CATEGORY_TO_MODELS[category] ?? [];
  if (modelKeys.length === 0) return null;
  const speciesHash = stringHash(speciesId);
  const index = Math.floor(hashUnit(speciesHash, slot, 42) * modelKeys.length) % modelKeys.length;
  const key = modelKeys[index]!;
  return FAUNA_MODELS[key] ?? null;
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
}: FaunaSpeciesLayerProps) {
  const initialAgents = useMemo(() => spawnAgents(species, terrain, grid.seed), [grid.seed, species, terrain]);
  const agentsRef = useRef<FaunaAgent[]>(initialAgents);
  const lastCountRef = useRef(species.populationTarget);
  const respawnClockRef = useRef(0);
  const flockIds = useMemo(() => new Set(species.preySpeciesIds), [species.preySpeciesIds]);
  const kind = animalKind(species.category);

  const perSlotModels = useMemo(
    () => initialAgents.map((a) => selectModel(species.id, a.slot, species.category)),
    [initialAgents, species.category, species.id],
  );

  useEffect(() => {
    agentsRef.current = initialAgents;
    registryRef.current.set(species.id, agentsRef.current);
    lastCountRef.current = species.populationTarget;
    onCountChange(species.id, species.populationTarget);

    return () => {
      registryRef.current.delete(species.id);
      onCountChange(species.id, 0);
    };
  }, [initialAgents, onCountChange, registryRef, species.id, species.populationTarget]);

  useFrame((_, delta) => {
    if (paused) return;

    const dt = Math.min(delta, 0.05) * speedMultiplier;
    const agents = agentsRef.current;
    const isHunter = species.preySpeciesIds.length > 0;
    let liveCount = 0;

    for (const agent of agents) {
      agent.timer += dt;

      if (agent.state === "dying") {
        agent.deathTimer += dt;
        agent.scale = Math.max(0, 1 - agent.deathTimer / DEATH_DURATION_SECONDS);
        agent.position.y = Math.max(0.04, agent.position.y - dt * 0.12);

        if (agent.deathTimer >= DEATH_DURATION_SECONDS) {
          agent.active = false;
          agent.scale = 0.0001;
        } else {
          liveCount += 1;
        }

        continue;
      }

      if (!agent.active) continue;
      liveCount += 1;

      // Hunting species grow hungrier each frame; if they never feed, they starve.
      if (isHunter) {
        agent.hunger = Math.min(HUNGER_MAX, agent.hunger + dt * HUNGER_RATE);
        if (agent.hunger >= STARVATION_THRESHOLD) {
          agent.state = "dying";
          agent.deathTimer = 0;
          continue;
        }
      }

      const steering = new THREE.Vector3();
      const separation = new THREE.Vector3();
      const alignment = new THREE.Vector3();
      const cohesion = new THREE.Vector3();
      const wander = new THREE.Vector3(
        Math.sin(agent.timer * 0.9 + agent.flapOffset),
        isBird(species.category) ? Math.sin(agent.timer * 0.6 + agent.flapOffset * 0.7) * 0.2 : 0,
        Math.cos(agent.timer * 1.1 + agent.flapOffset),
      );
      let neighbors = 0;
      let nearestThreatDistance = Number.POSITIVE_INFINITY;
      let nearestHuntDistance = Number.POSITIVE_INFINITY;
      let state: AgentState = "wandering";

      for (const other of agents) {
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

      // Hungrier hunters chase more aggressively (the chain self-balances without hardcoding).
      const huntWeight = HUNT_WEIGHT * (0.6 + agent.hunger);

      for (const [otherSpeciesId, otherAgents] of registryRef.current.entries()) {
        if (otherSpeciesId === species.id) continue;
        const otherSpecies = allSpeciesMap.get(otherSpeciesId);
        if (!otherSpecies) continue;

        const currentSpeciesIsPrey = otherSpecies.preySpeciesIds.includes(species.id);
        const currentSpeciesCanHunt = flockIds.has(otherSpeciesId);

        for (const otherAgent of otherAgents) {
          if (!otherAgent.active || otherAgent.state === "dying") continue;

          const offset = new THREE.Vector3().subVectors(otherAgent.position, agent.position);
          const distance = offset.length();
          if (distance <= 0.0001) continue;

          if (currentSpeciesIsPrey && distance < 4.2 && distance < nearestThreatDistance) {
            nearestThreatDistance = distance;
            steering.addScaledVector(offset.normalize().multiplyScalar(-1), FLEE_WEIGHT);
            state = "fleeing";
          }

          if (currentSpeciesCanHunt && distance < 6 && distance < nearestHuntDistance) {
            nearestHuntDistance = distance;
            steering.addScaledVector(offset.normalize(), huntWeight);
            state = "hunting";

            if (distance < (isPredator(species.category) ? 0.95 : 0.7)) {
              otherAgent.health -= dt * 0.72;
              if (otherAgent.health <= 0) {
                otherAgent.state = "dying";
                otherAgent.deathTimer = 0;
                agent.hunger = 0; // a successful kill sates the hunter
              } else {
                otherAgent.state = "fleeing";
              }
            }
          }
        }
      }

      const terrainPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);
      const validHabitat = isHabitablePoint(species, terrainPoint);
      const homeVector = new THREE.Vector3().subVectors(agent.spawnPosition, agent.position);

      if (!validHabitat || homeVector.length() > agent.homeRadius) {
        steering.addScaledVector(homeVector.normalize(), HOME_WEIGHT);
      }

      steering.addScaledVector(wander.normalize(), WANDER_WEIGHT);

      const desiredDirection =
        steering.lengthSq() > 0.0001 ? steering.normalize() : agent.velocity.clone().normalize();
      const baseSpeed = species.movementProfile.maxSpeed;
      const desiredSpeed =
        state === "fleeing"
          ? baseSpeed * species.movementProfile.fleeMultiplier
          : state === "hunting"
            ? baseSpeed * 1.18
            : state === "flocking"
              ? baseSpeed * 0.94
              : baseSpeed * 0.72;

      const desiredVelocity = desiredDirection.multiplyScalar(Math.max(0.08, desiredSpeed));
      if (isGroundAnimal(species.category)) desiredVelocity.y = 0;

      agent.velocity.lerp(desiredVelocity, Math.min(1, species.movementProfile.turnRate * dt * 0.42));

      const maxSpeed =
        state === "fleeing"
          ? baseSpeed * species.movementProfile.fleeMultiplier
          : state === "hunting"
            ? baseSpeed * 1.2
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

      agent.position.addScaledVector(agent.velocity, dt);

      if (Math.abs(agent.position.x) > terrain.halfWidth) {
        agent.position.x = Math.sign(agent.position.x) * terrain.halfWidth;
        agent.velocity.x *= -1;
      }
      if (Math.abs(agent.position.z) > terrain.halfHeight) {
        agent.position.z = Math.sign(agent.position.z) * terrain.halfHeight;
        agent.velocity.z *= -1;
      }

      const resolvedPoint = sampleTerrainPoint(terrain, agent.position.x, agent.position.z);

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
        const waterBias = resolvedPoint.cell.isWater ? 0 : 0.25;
        const targetY =
          WATER_SWIM_Y + Math.sin(agent.timer * 1.8 + agent.flapOffset) * 0.05 - waterBias;
        agent.position.y = THREE.MathUtils.lerp(agent.position.y, targetY, 0.1);
      }

      agent.health = Math.min(1, agent.health + dt * 0.03);
      agent.scale = 1;
      agent.state = state;
    }

    if (liveCount < Math.ceil(species.populationTarget * RESPAWN_THRESHOLD)) {
      respawnClockRef.current += dt;
      if (respawnClockRef.current >= RESPAWN_INTERVAL_SECONDS) {
        const deadAgent = agents.find((a) => !a.active);
        if (deadAgent) {
          resetAgent(deadAgent, species, terrain);
          liveCount += 1;
        }
        respawnClockRef.current = 0;
      }
    } else {
      respawnClockRef.current = 0;
    }

    if (liveCount !== lastCountRef.current) {
      lastCountRef.current = liveCount;
      onCountChange(species.id, liveCount);
    }
  });

  return (
    <group visible={visible}>
      {initialAgents.map((agent, i) => {
        const model = perSlotModels[i];
        if (!model) return null;
        return (
          <Suspense key={agent.slot} fallback={null}>
            <AnimalEntity
              agent={agent}
              model={model}
              kind={kind}
              speedMultiplier={speedMultiplier}
            />
          </Suspense>
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
  onCountUpdate,
}: FaunaLayerProps) {
  const terrain = useMemo(() => buildTerrainContext(grid), [grid]);
  const registryRef = useRef<Map<string, FaunaAgent[]>>(new Map());
  const countsRef = useRef<Map<string, number>>(new Map());
  const speciesMap = useMemo(() => new Map(species.map((entry) => [entry.id, entry])), [species]);

  useEffect(() => {
    countsRef.current.clear();
    onCountUpdate?.(0);
  }, [onCountUpdate, species]);

  function handleCountChange(speciesId: string, count: number) {
    countsRef.current.set(speciesId, count);
    let total = 0;
    for (const value of countsRef.current.values()) total += value;
    onCountUpdate?.(total);
  }

  return (
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
        />
      ))}
    </group>
  );
}

export default FaunaLayer;
