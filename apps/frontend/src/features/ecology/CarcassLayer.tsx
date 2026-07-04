import { useEffect, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FaunaCategory, FeedingStrategy } from "../../services/api/ecology";

export type CarcassCause = "predation" | "starvation";
export type CarcassAnimalKind = "ground" | "bird" | "fish";

export interface CarcassRecordInput {
  x: number;
  y: number;
  z: number;
  category: FaunaCategory;
  feedingStrategy: FeedingStrategy;
  cause: CarcassCause;
  speciesName: string;
  predatorName?: string;
  kind: CarcassAnimalKind;
}

export interface CarcassController {
  emit: (input: CarcassRecordInput) => void;
}

interface CarcassRecord extends CarcassRecordInput {
  id: number;
  startedAt: number;
  yaw: number;
  scale: number;
}

interface CarcassLayerProps {
  controllerRef: MutableRefObject<CarcassController | null>;
  visible: boolean;
}

const MAX_CARCASSES = 128;
const FRESH_SECONDS = 4.5;
const DECAY_SECONDS = 13;
const TOTAL_SECONDS = 28;

const dummy = new THREE.Object3D();
const color = new THREE.Color();

function categoryScale(category: FaunaCategory) {
  switch (category) {
    case "herbivore-large":
    case "predator-large":
      return 0.62;
    case "predator-medium":
      return 0.48;
    case "bird":
      return 0.34;
    case "fish":
      return 0.3;
    default:
      return 0.36;
  }
}

function colorForRecord(record: CarcassRecord, age: number) {
  if (age < FRESH_SECONDS) {
    const tint = record.cause === "predation" ? 0x6a1f18 : 0x4f3a2f;
    return color.setHex(tint);
  }
  if (age < DECAY_SECONDS) return color.setHex(0x3a342c);
  return color.setHex(0xd3c8ad);
}

function hashUnit(value: number) {
  let h = Math.imul(value + 1013904223, 1664525);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return (h >>> 0) / 4294967295;
}

export function CarcassLayer({ controllerRef, visible }: CarcassLayerProps) {
  const recordsRef = useRef<CarcassRecord[]>([]);
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const remainsRef = useRef<THREE.InstancedMesh>(null);
  const nextIdRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    controllerRef.current = {
      emit(input) {
        const id = nextIdRef.current + 1;
        nextIdRef.current = id;
        recordsRef.current.unshift({
          ...input,
          id,
          startedAt: elapsedRef.current,
          yaw: hashUnit(id * 17) * Math.PI * 2,
          scale: categoryScale(input.category) * (0.85 + hashUnit(id * 31) * 0.28),
        });
        if (recordsRef.current.length > MAX_CARCASSES) recordsRef.current.length = MAX_CARCASSES;
      },
    };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef]);

  useFrame((_, delta) => {
    elapsedRef.current += delta;
    const now = elapsedRef.current;
    recordsRef.current = recordsRef.current.filter((record) => now - record.startedAt < TOTAL_SECONDS);

    let bodyCount = 0;
    let remainsCount = 0;
    for (const record of recordsRef.current) {
      const age = now - record.startedAt;
      const progress = THREE.MathUtils.clamp(age / TOTAL_SECONDS, 0, 1);
      const sink = progress * 0.035;

      if (age < DECAY_SECONDS) {
        const decay = age < FRESH_SECONDS ? 1 : THREE.MathUtils.lerp(1, 0.46, (age - FRESH_SECONDS) / (DECAY_SECONDS - FRESH_SECONDS));
        dummy.position.set(record.x, record.y + record.scale * 0.12 - sink, record.z);
        dummy.rotation.set(record.kind === "fish" ? Math.PI / 2 : 0, record.yaw, Math.PI / 2);
        dummy.scale.set(record.scale * 1.22 * decay, record.scale * 0.34 * decay, record.scale * 0.42 * decay);
        dummy.updateMatrix();
        bodyRef.current?.setMatrixAt(bodyCount, dummy.matrix);
        bodyRef.current?.setColorAt(bodyCount, colorForRecord(record, age));
        bodyCount += 1;
      }

      if (age >= FRESH_SECONDS) {
        const remainsProgress = THREE.MathUtils.clamp((age - FRESH_SECONDS) / (TOTAL_SECONDS - FRESH_SECONDS), 0, 1);
        dummy.position.set(record.x, record.y + 0.035 - sink, record.z);
        dummy.rotation.set(0, record.yaw + 0.4, 0);
        dummy.scale.set(record.scale * (0.28 + remainsProgress * 0.12), 0.035, record.scale * 0.18);
        dummy.updateMatrix();
        remainsRef.current?.setMatrixAt(remainsCount, dummy.matrix);
        remainsRef.current?.setColorAt(remainsCount, colorForRecord(record, age));
        remainsCount += 1;
      }
    }

    if (bodyRef.current) {
      bodyRef.current.count = bodyCount;
      bodyRef.current.instanceMatrix.needsUpdate = true;
      if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    }
    if (remainsRef.current) {
      remainsRef.current.count = remainsCount;
      remainsRef.current.instanceMatrix.needsUpdate = true;
      if (remainsRef.current.instanceColor) remainsRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group visible={visible}>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, MAX_CARCASSES]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.92} metalness={0.02} vertexColors />
      </instancedMesh>
      <instancedMesh ref={remainsRef} args={[undefined, undefined, MAX_CARCASSES]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={0xd3c8ad} roughness={0.85} metalness={0.02} vertexColors />
      </instancedMesh>
    </group>
  );
}

export default CarcassLayer;
