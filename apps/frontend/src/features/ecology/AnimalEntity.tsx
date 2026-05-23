import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
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
  speedMultiplier: number;
}

export function AnimalEntity({ agent, model, kind, speedMultiplier }: AnimalEntityProps) {
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
