import { useLayoutEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { fitTerrainCamera, type TerrainBounds } from "./mobile-camera";

export function FitTerrainCamera({ bounds, resetKey, overview = false, zoomCommand, focusCommand }: { bounds: TerrainBounds; resetKey: number; overview?: boolean; zoomCommand?: {id:number; factor:number}; focusCommand?: {id:number; point:readonly [number,number,number]; distance:number} }) {
  const { camera, size, controls, invalidate } = useThree();
  const lastZoom = useRef(0);
  const lastFocus = useRef(0);
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera) || !size.width || !size.height) return;
    const fit = fitTerrainCamera(bounds, size.width / size.height, camera.fov);
    camera.position.copy(fit.target).add(fit.position.clone().sub(fit.target).multiplyScalar(overview ? 1 : 0.8));
    camera.far = Math.max(500, fit.distance * 6);
    camera.lookAt(fit.target);
    camera.updateProjectionMatrix();
    const orbit = controls as unknown as { target: THREE.Vector3; update(): void } | undefined;
    orbit?.target.copy(fit.target);
    orbit?.update();
    invalidate();
  }, [bounds, camera, controls, size.width, size.height, resetKey, overview, invalidate]);
  useLayoutEffect(() => {
    if (!zoomCommand || zoomCommand.id === lastZoom.current) return;
    lastZoom.current = zoomCommand.id;
    const orbit = controls as unknown as {target: THREE.Vector3; update(): void} | undefined;
    if (!orbit) return;
    const offset = camera.position.clone().sub(orbit.target);
    const distance = offset.length();
    const diagonal = Math.hypot(bounds[3]-bounds[0], bounds[4]-bounds[1], bounds[5]-bounds[2]);
    offset.setLength(THREE.MathUtils.clamp(distance * zoomCommand.factor, Math.max(1,diagonal*.08),diagonal*12));
    camera.position.copy(orbit.target).add(offset);
    orbit.update(); invalidate();
  }, [zoomCommand, camera, controls, bounds, invalidate]);
  useLayoutEffect(() => {
    if (!focusCommand || focusCommand.id === lastFocus.current) return;
    lastFocus.current = focusCommand.id;
    const orbit = controls as unknown as {target: THREE.Vector3; update(): void} | undefined;
    if (!orbit) return;
    const direction = camera.position.clone().sub(orbit.target).normalize();
    orbit.target.set(...focusCommand.point);
    camera.position.copy(orbit.target).addScaledVector(direction,focusCommand.distance);
    camera.lookAt(orbit.target); orbit.update(); invalidate();
  }, [focusCommand,camera,controls,invalidate]);
  return null;
}
