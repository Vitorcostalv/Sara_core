import * as THREE from "three";

export type TerrainBounds = readonly [number, number, number, number, number, number];

/** Fit every corner, accounting for the horizontal FOV of a portrait canvas. */
export function fitTerrainCamera(bounds: TerrainBounds, aspect: number, fov = 38) {
  const min = new THREE.Vector3(...bounds.slice(0, 3) as [number, number, number]);
  const max = new THREE.Vector3(...bounds.slice(3, 6) as [number, number, number]);
  const target = min.clone().add(max).multiplyScalar(0.5);
  const direction = new THREE.Vector3(0.58, 0.92, 1.16).normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
  const up = direction.clone().cross(right).normalize();
  const tanVertical = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanHorizontal = tanVertical * Math.max(0.1, aspect);
  let distance = 1;
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
    const corner = new THREE.Vector3(x, y, z).sub(target);
    const depth = corner.dot(direction);
    distance = Math.max(distance,
      depth + Math.abs(corner.dot(right)) / tanHorizontal,
      depth + Math.abs(corner.dot(up)) / tanVertical);
  }
  distance *= 1.16;
  return { target, position: target.clone().addScaledVector(direction, distance), distance };
}
