import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { fitTerrainCamera, type TerrainBounds } from "../features/ecology/mobile-camera";

describe("terrain framing on actual canvas aspect ratios", () => {
  const bounds: TerrainBounds = [-10, 0, -8, 10, 12, 8];
  for (const aspect of [0.45, 0.7, 1, 1.8, 2.6]) {
    it(`keeps every terrain corner visible at aspect ${aspect}`, () => {
      const fit = fitTerrainCamera(bounds, aspect);
      const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
      camera.position.copy(fit.position);
      camera.lookAt(fit.target);
      camera.updateMatrixWorld();
      for (const x of [-10, 10]) for (const y of [0, 12]) for (const z of [-8, 8]) {
        const projected = new THREE.Vector3(x, y, z).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(0.92);
        expect(Math.abs(projected.y)).toBeLessThan(0.92);
        expect(projected.z).toBeLessThan(1);
      }
    });
  }
  it("backs away for a tall phone and refits when rotated to landscape", () => {
    expect(fitTerrainCamera(bounds, 0.5).distance).toBeGreaterThan(fitTerrainCamera(bounds, 1.8).distance);
  });
});
