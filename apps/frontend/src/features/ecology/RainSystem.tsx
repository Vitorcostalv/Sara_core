import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_RAIN_DROPS = 5000;
const DROP_CEILING_Y = 30;
const DROP_RESPAWN_SPAN = 8;

interface RainDrop {
  x: number;
  y: number;
  z: number;
}

interface RainSystemProps {
  enabled: boolean;
  intensity: number;
  worldRadius: number;
  waterLevelY: number;
}

function buildDrop(worldRadius: number, yOffset = 0): RainDrop {
  return {
    // Randomness is scoped to the rain particles because they are visual-only.
    x: Math.random() * worldRadius * 2 - worldRadius,
    y: Math.random() * DROP_CEILING_Y + yOffset,
    z: Math.random() * worldRadius * 2 - worldRadius,
  };
}

export function RainSystem({
  enabled,
  intensity,
  worldRadius,
  waterLevelY,
}: RainSystemProps) {
  const rainRef = useRef<THREE.InstancedMesh>(null);
  const dropsRef = useRef<RainDrop[]>([]);
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  const visibleDrops = useMemo(
    () => (enabled ? Math.floor(THREE.MathUtils.clamp(intensity, 0, 100) * 50) : 0),
    [enabled, intensity],
  );

  useEffect(() => {
    dropsRef.current = Array.from({ length: MAX_RAIN_DROPS }, () => buildDrop(worldRadius, 2));
    const mesh = rainRef.current;
    if (!mesh) return;

    mesh.count = visibleDrops;

    for (let index = 0; index < MAX_RAIN_DROPS; index += 1) {
      const drop = dropsRef.current[index]!;
      tempObject.position.set(drop.x, drop.y, drop.z);
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  }, [tempObject, visibleDrops, worldRadius]);

  useEffect(() => {
    if (rainRef.current) {
      rainRef.current.count = visibleDrops;
    }
  }, [visibleDrops]);

  useFrame((_, delta) => {
    const mesh = rainRef.current;
    if (!mesh || !enabled || visibleDrops === 0) return;

    const fallSpeed = 15 + intensity * 0.2;

    for (let index = 0; index < visibleDrops; index += 1) {
      const drop = dropsRef.current[index]!;
      drop.y -= fallSpeed * delta;

      if (drop.y < waterLevelY - 1) {
        // Randomness is scoped to particle respawn because it has no gameplay semantics.
        drop.y = DROP_CEILING_Y + Math.random() * DROP_RESPAWN_SPAN;
        drop.x = Math.random() * worldRadius * 2 - worldRadius;
        drop.z = Math.random() * worldRadius * 2 - worldRadius;
      }

      tempObject.position.set(drop.x, drop.y, drop.z);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
    }

    mesh.count = visibleDrops;
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={rainRef}
      args={[undefined, undefined, MAX_RAIN_DROPS]}
      frustumCulled={false}
      renderOrder={4}
    >
      <cylinderGeometry args={[0.012, 0.012, 0.4, 4]} />
      <meshBasicMaterial color="#a8c4e0" transparent opacity={0.5} depthWrite={false} />
    </instancedMesh>
  );
}

export default RainSystem;
