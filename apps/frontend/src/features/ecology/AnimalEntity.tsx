import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { FaunaCategory, FeedingStrategy } from "../../services/api/ecology";

export type AgentState = "wandering" | "flocking" | "fleeing" | "hunting" | "dying";

export interface FaunaAgent {
  slot: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  spawnVelocity: THREE.Vector3;
  state: AgentState;
  health: number;
  timer: number;
  deathTimer: number;
  active: boolean;
  scale: number;
  homeRadius: number;
  flapOffset: number;
  /** Rises over time for hunting species; capture resets it, overflow -> starvation. */
  hunger: number;
  /** Simulated timestamp until which hunting steering is skipped after a kill. */
  satedUntil: number;
  /** Stable prey key kept briefly so hunting steering does not retarget every frame. */
  huntTargetKey: string | null;
  huntTargetUntil: number;
}

export type AnimalKind = "ground" | "bird" | "fish";

const TWO_PI = Math.PI * 2;

const STRATEGY_COLOR: Record<FeedingStrategy, number> = {
  carnivore: 0xe63838,
  herbivore: 0x32c85a,
  omnivore: 0xf2f2ea,
};

const STATE_EMISSIVE: Record<AgentState, number> = {
  wandering: 0x000000,
  flocking: 0x04260e,
  fleeing: 0x2dd8ff,
  hunting: 0xffb22e,
  dying: 0x000000,
};

function shortestAngleDiff(from: number, to: number): number {
  const diff = to - from;
  return (((diff + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI - Math.PI;
}

function baseScaleFor(category: FaunaCategory, kind: AnimalKind): number {
  if (kind === "bird") return 0.46;
  if (kind === "fish") return 0.48;
  switch (category) {
    case "herbivore-large":
    case "predator-large":
      return 0.62;
    case "predator-medium":
      return 0.52;
    default:
      return 0.42;
  }
}

function verticalBob(kind: AnimalKind, agent: FaunaAgent, speedMultiplier: number): number {
  const rate = kind === "bird" ? 4.4 : kind === "fish" ? 3.2 : 2.2;
  const amplitude = kind === "bird" ? 0.08 : kind === "fish" ? 0.045 : 0.025;
  return Math.sin(agent.timer * rate * Math.max(0.25, speedMultiplier) + agent.flapOffset) * amplitude;
}

interface PolygonAnimalProps {
  agent: FaunaAgent;
  kind: AnimalKind;
  category: FaunaCategory;
  feedingStrategy: FeedingStrategy;
  speedMultiplier: number;
}

export function AnimalEntity({
  agent,
  kind,
  category,
  feedingStrategy,
  speedMultiplier,
}: PolygonAnimalProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const bodyRef = useRef<THREE.Mesh>(null!);
  const currentRotYRef = useRef(0);
  const currentTiltRef = useRef(0);
  const color = STRATEGY_COLOR[feedingStrategy] ?? STRATEGY_COLOR.herbivore;
  const baseScale = baseScaleFor(category, kind);

  const materials = useMemo(() => {
    const body = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.76,
      metalness: 0.03,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x171717,
      flatShading: true,
      roughness: 0.82,
      metalness: 0.02,
    });
    const light = new THREE.MeshStandardMaterial({
      color: feedingStrategy === "omnivore" ? 0xd7d7cf : 0xffffff,
      flatShading: true,
      roughness: 0.7,
      metalness: 0,
    });
    const glyph = new THREE.MeshStandardMaterial({
      color: feedingStrategy === "omnivore" ? 0x202020 : 0xf8fbff,
      flatShading: true,
      roughness: 0.68,
      metalness: 0,
    });
    return { body, dark, light, glyph };
  }, [color, feedingStrategy]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!agent.active) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.copy(agent.position);
    group.position.y += verticalBob(kind, agent, speedMultiplier);
    group.scale.setScalar(baseScale * Math.max(0.0001, agent.scale));

    const hSpeed = Math.hypot(agent.velocity.x, agent.velocity.z);
    if (hSpeed > 0.001) {
      const targetRotY = Math.atan2(agent.velocity.x, agent.velocity.z);
      const diff = shortestAngleDiff(currentRotYRef.current, targetRotY);
      currentRotYRef.current += diff * Math.min(1, 9 * delta);
      group.rotation.y = currentRotYRef.current;
    }

    const targetTilt =
      agent.state === "hunting"
        ? -0.16
        : agent.state === "fleeing"
          ? 0.18
          : kind === "fish"
            ? Math.sin(agent.timer * 2.6 + agent.flapOffset) * 0.08
            : 0;
    currentTiltRef.current = THREE.MathUtils.lerp(currentTiltRef.current, targetTilt, Math.min(1, 6 * delta));
    group.rotation.x = currentTiltRef.current;

    const body = bodyRef.current;
    if (body) {
      const bodyMaterial = body.material as THREE.MeshStandardMaterial;
      bodyMaterial.emissive.setHex(STATE_EMISSIVE[agent.state]);
      bodyMaterial.emissiveIntensity = agent.state === "hunting" ? 0.28 : agent.state === "fleeing" ? 0.18 : 0.06;
    }
  });

  const dietGlyph =
    feedingStrategy === "carnivore" ? (
      <mesh castShadow material={materials.glyph} position={[0, kind === "ground" ? 0.66 : 0.28, 0]}>
        <coneGeometry args={[0.075, 0.16, 3]} />
      </mesh>
    ) : feedingStrategy === "omnivore" ? (
      <mesh castShadow material={materials.glyph} position={[0, kind === "ground" ? 0.66 : 0.28, 0]}>
        <octahedronGeometry args={[0.085, 0]} />
      </mesh>
    ) : (
      <mesh castShadow material={materials.glyph} position={[0, kind === "ground" ? 0.66 : 0.28, 0]}>
        <boxGeometry args={[0.12, 0.08, 0.12]} />
      </mesh>
    );

  if (kind === "bird") {
    return (
      <group ref={groupRef}>
        <mesh ref={bodyRef} castShadow material={materials.body} rotation={[Math.PI / 2, 0, 0]}>
          <tetrahedronGeometry args={[0.38, 0]} />
        </mesh>
        <mesh castShadow material={materials.body} position={[-0.34, 0, -0.03]} rotation={[0, 0, -0.2]}>
          <coneGeometry args={[0.11, 0.5, 3]} />
        </mesh>
        <mesh castShadow material={materials.body} position={[0.34, 0, -0.03]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.11, 0.5, 3]} />
        </mesh>
        <mesh castShadow material={materials.light} position={[0, 0.08, 0.36]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.3, 3]} />
        </mesh>
        {dietGlyph}
      </group>
    );
  }

  if (kind === "fish") {
    return (
      <group ref={groupRef}>
        <mesh ref={bodyRef} castShadow material={materials.body} rotation={[0, 0, Math.PI / 4]}>
          <octahedronGeometry args={[0.34, 0]} />
        </mesh>
        <mesh castShadow material={materials.body} position={[0, 0, -0.4]} rotation={[Math.PI / 2, 0, Math.PI]}>
          <coneGeometry args={[0.2, 0.34, 3]} />
        </mesh>
        <mesh castShadow material={materials.light} position={[0, 0, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.1, 0.24, 3]} />
        </mesh>
        {dietGlyph}
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      {dietGlyph}
      <mesh ref={bodyRef} castShadow material={materials.body} position={[0, 0.22, 0]} scale={[1, 0.72, 1.28]}>
        <dodecahedronGeometry args={[0.34, 0]} />
      </mesh>
      <mesh castShadow material={materials.body} position={[0, 0.28, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.17, 0.32, 5]} />
      </mesh>
      <mesh castShadow material={materials.dark} position={[0, 0.2, -0.42]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.08, 0.28, 4]} />
      </mesh>
      <mesh castShadow material={materials.dark} position={[-0.16, -0.02, 0.2]}>
        <boxGeometry args={[0.07, 0.18, 0.08]} />
      </mesh>
      <mesh castShadow material={materials.dark} position={[0.16, -0.02, 0.2]}>
        <boxGeometry args={[0.07, 0.18, 0.08]} />
      </mesh>
      <mesh castShadow material={materials.dark} position={[-0.14, -0.02, -0.22]}>
        <boxGeometry args={[0.07, 0.18, 0.08]} />
      </mesh>
      <mesh castShadow material={materials.dark} position={[0.14, -0.02, -0.22]}>
        <boxGeometry args={[0.07, 0.18, 0.08]} />
      </mesh>
    </group>
  );
}

export default AnimalEntity;
