import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { FaunaCategory } from "../../services/api/ecology";
import type { FaunaModelDef } from "./faunaModels";

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
  /** Rises over time for hunting species; capture resets it, overflow → starvation. */
  hunger: number;
}

export type AnimalKind = "ground" | "bird" | "fish";

const TWO_PI = Math.PI * 2;

function shortestAngleDiff(from: number, to: number): number {
  const diff = to - from;
  return (((diff + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI - Math.PI;
}

function pickClipForState(
  state: AgentState,
  model: FaunaModelDef,
  kind: AnimalKind,
  speed: number,
): string {
  const { animations } = model;

  if (kind === "fish") {
    return animations.flyOrSwim ?? animations.idle;
  }

  if (kind === "bird") {
    if (speed > 0.05) return animations.flyOrSwim ?? animations.idle;
    return animations.idle;
  }

  switch (state) {
    case "wandering":
      return animations.idle;
    case "flocking":
      return animations.walk ?? animations.idle;
    case "fleeing":
      return animations.run ?? animations.walk ?? animations.idle;
    case "hunting":
      return animations.run ?? animations.walk ?? animations.idle;
    case "dying":
      return animations.idle;
    default:
      return animations.idle;
  }
}

function timeScaleForState(state: AgentState): number {
  switch (state) {
    case "fleeing":
    case "hunting":
      return 1.6;
    case "flocking":
      return 1.0;
    case "wandering":
      return 0.6;
    case "dying":
      return 0.3;
    default:
      return 1.0;
  }
}

interface AnimalEntityProps {
  agent: FaunaAgent;
  model: FaunaModelDef;
  kind: AnimalKind;
  category: FaunaCategory;
  speedMultiplier: number;
}

function GltfAnimal({ agent, model, kind, speedMultiplier }: Omit<AnimalEntityProps, "category">) {
  const groupRef = useRef<THREE.Group>(null!);
  const gltf = useGLTF(`/models/fauna/${model.file}`);
  const clonedScene = useMemo(() => skeletonClone(gltf.scene), [gltf.scene]);
  const { actions, mixer } = useAnimations(gltf.animations, groupRef);

  const prevStateRef = useRef<AgentState | null>(null);
  const prevSpeedRef = useRef(0);
  const currentRotYRef = useRef(0);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!agent.active) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.copy(agent.position);
    group.scale.setScalar(model.scaleFactor * Math.max(0.0001, agent.scale));

    const hSpeed = Math.hypot(agent.velocity.x, agent.velocity.z);

    if (hSpeed > 0.001) {
      const targetRotY = Math.atan2(agent.velocity.x, agent.velocity.z) + model.rotationOffsetY;
      const diff = shortestAngleDiff(currentRotYRef.current, targetRotY);
      currentRotYRef.current += diff * Math.min(1, 8 * delta);
      group.rotation.y = currentRotYRef.current;
    }

    const stateChanged = prevStateRef.current !== agent.state;
    const speedChanged = kind === "bird" && Math.abs(hSpeed - prevSpeedRef.current) > 0.04;

    if (stateChanged || speedChanged) {
      prevStateRef.current = agent.state;
      prevSpeedRef.current = hSpeed;

      const clipName = pickClipForState(agent.state, model, kind, hSpeed);
      const nextAction = actions[clipName];

      if (nextAction) {
        Object.values(actions).forEach((a) => {
          if (a && a !== nextAction) a.fadeOut(0.3);
        });
        nextAction.reset().fadeIn(0.3).play();
      }
    }

    mixer.timeScale = timeScaleForState(agent.state) * speedMultiplier;
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

// ─── Procedural fallback ────────────────────────────────────────────────────
// Rendered when a GLB is missing/unfetched so the scene never breaks. A low-poly
// impostor (body + head + tail/fin) colored by category, with the same bobbing and
// velocity-facing rotation as the GLTF path.

const CATEGORY_COLOR: Record<FaunaCategory, number> = {
  "herbivore-large": 0x9c7a4f,
  "herbivore-small": 0xb8946a,
  "predator-medium": 0x7a4a3a,
  "predator-large": 0x5e3a2c,
  bird: 0x4a82b4,
  fish: 0xcf8a46,
};

function ProceduralAnimal({
  agent,
  kind,
  category,
}: {
  agent: FaunaAgent;
  kind: AnimalKind;
  category: FaunaCategory;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const currentRotYRef = useRef(0);
  const color = CATEGORY_COLOR[category] ?? 0x8a7a5a;
  const baseScale = kind === "bird" ? 0.5 : kind === "fish" ? 0.55 : 0.7;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!agent.active) {
      group.visible = false;
      return;
    }

    group.visible = true;
    group.position.copy(agent.position);
    group.scale.setScalar(baseScale * Math.max(0.0001, agent.scale));

    const hSpeed = Math.hypot(agent.velocity.x, agent.velocity.z);
    if (hSpeed > 0.001) {
      const targetRotY = Math.atan2(agent.velocity.x, agent.velocity.z);
      const diff = shortestAngleDiff(currentRotYRef.current, targetRotY);
      currentRotYRef.current += diff * Math.min(1, 8 * delta);
      group.rotation.y = currentRotYRef.current;
    }
    // Light bobbing so static-looking impostors still read as alive.
    group.position.y += Math.sin(agent.timer * 2 + agent.flapOffset) * 0.03;
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[0.34, 0.26, 0.6]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.32, 0.34]}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
      <mesh castShadow position={[0, 0.22, -0.36]}>
        <boxGeometry args={[0.1, 0.1, 0.22]} />
        <meshStandardMaterial color={color} flatShading />
      </mesh>
    </group>
  );
}

// ─── Error boundary ──────────────────────────────────────────────────────────
// useGLTF throws on a missing/failed asset; this catches it and renders the impostor.

class GltfFallbackBoundary extends React.Component<
  React.PropsWithChildren<{ fallback: React.ReactNode }>,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren<{ fallback: React.ReactNode }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function AnimalEntity({ agent, model, kind, category, speedMultiplier }: AnimalEntityProps) {
  return (
    <GltfFallbackBoundary fallback={<ProceduralAnimal agent={agent} kind={kind} category={category} />}>
      <GltfAnimal agent={agent} model={model} kind={kind} speedMultiplier={speedMultiplier} />
    </GltfFallbackBoundary>
  );
}
