import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// Imperative handle: FaunaLayer emits a puff at a world position when an agent dies.
export interface DeathPuffController {
  emit: (x: number, y: number, z: number) => void;
}

const MAX_PUFFS = 96;
const PUFF_DURATION = 0.38; // seconds: quick expand-then-dissipate
const GROW_FRACTION = 0.28; // fraction of the lifetime spent expanding

interface Puff {
  active: boolean;
  age: number;
  x: number;
  y: number;
  z: number;
  peak: number;
  rot: number;
}

// Deterministic unit hash (no Math.random) for per-puff jitter.
function puffHash(n: number): number {
  let v = Math.imul(n ^ 0x9e3779b9, 2654435761);
  v ^= v >>> 15;
  v = Math.imul(v, 2246822519);
  v ^= v >>> 13;
  return (v >>> 0) / 4294967295;
}

interface DeathPuffLayerProps {
  controllerRef: MutableRefObject<DeathPuffController | null>;
  visible: boolean;
}

export function DeathPuffLayer({ controllerRef, visible }: DeathPuffLayerProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const puffs = useMemo<Puff[]>(
    () =>
      Array.from({ length: MAX_PUFFS }, () => ({
        active: false,
        age: 0,
        x: 0,
        y: 0,
        z: 0,
        peak: 1,
        rot: 0,
      })),
    [],
  );
  const counterRef = useRef(0);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    controllerRef.current = {
      emit(x, y, z) {
        const slot = puffs.find((p) => !p.active);
        if (!slot) return; // pool exhausted — drop silently (cap is generous)
        const n = (counterRef.current += 1);
        slot.active = true;
        slot.age = 0;
        slot.x = x + (puffHash(n * 3) - 0.5) * 0.18;
        slot.y = y + 0.1;
        slot.z = z + (puffHash(n * 7) - 0.5) * 0.18;
        slot.peak = 0.48 + puffHash(n * 11) * 0.22;
        slot.rot = puffHash(n * 13) * Math.PI * 2;
      },
    };
    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef, puffs]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const dt = Math.min(delta, 0.05);
    let count = 0;

    for (const puff of puffs) {
      if (!puff.active) continue;
      puff.age += dt;
      if (puff.age >= PUFF_DURATION) {
        puff.active = false;
        continue;
      }

      const t = puff.age / PUFF_DURATION;
      // Expand quickly, then shrink toward zero — reads as a black smoke puff dissipating.
      const envelope = t < GROW_FRACTION ? t / GROW_FRACTION : 1 - (t - GROW_FRACTION) / (1 - GROW_FRACTION);
      const scale = Math.max(0.0001, puff.peak * envelope);

      tempObject.position.set(puff.x, puff.y, puff.z);
      tempObject.rotation.set(0, puff.rot, 0);
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      mesh.setMatrixAt(count, tempObject.matrix);
      count += 1;
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PUFFS]} visible={visible} frustumCulled={false}>
      <icosahedronGeometry args={[0.24, 0]} />
      <meshBasicMaterial color={0x12151a} transparent opacity={0.32} depthWrite={false} />
    </instancedMesh>
  );
}

export default DeathPuffLayer;
