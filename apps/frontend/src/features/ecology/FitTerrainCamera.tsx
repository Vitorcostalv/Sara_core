import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fitTerrainCamera, type TerrainBounds } from "./mobile-camera";

export function FitTerrainCamera({ bounds, resetKey }: { bounds: TerrainBounds; resetKey: number }) {
  const { camera, size, controls, invalidate } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !size.width || !size.height) return;
    const fit = fitTerrainCamera(bounds, size.width / size.height, camera.fov);
    camera.position.copy(fit.position);
    camera.far = Math.max(500, fit.distance * 6);
    camera.lookAt(fit.target);
    camera.updateProjectionMatrix();
    const orbit = controls as unknown as { target: THREE.Vector3; update(): void } | undefined;
    orbit?.target.copy(fit.target);
    orbit?.update();
    invalidate();
  }, [bounds, camera, controls, size.width, size.height, resetKey, invalidate]);
  return null;
}
