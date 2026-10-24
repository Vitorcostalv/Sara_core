import { expect, it } from "vitest";
import { swimmingHeight, waterSurfaceHeights } from "../features/ecology/terrain-water";
import type { TerrainGrid } from "../services/api/ecology";

it("gives disconnected lakes independent levels while each connected body stays flat", () => {
  const elevations = [[0.3,0.31,0.8,0.6], [0.7,0.7,0.8,0.62]];
  const grid = {width: 4, height: 2, cells: elevations.map((row,y) => row.map((elevation,x) => ({x,y,elevation,isWater: (y === 0 && x < 2) || x === 3})))} as TerrainGrid;
  const levels = waterSurfaceHeights(grid);
  expect(levels.get("0,0")).toBe(levels.get("1,0"));
  expect(levels.get("3,0")).toBe(levels.get("3,1"));
  expect(levels.get("3,0")!).toBeGreaterThan(levels.get("0,0")! + 1);
  expect(levels.has("2,0")).toBe(false);
});

it("keeps fish above the bed of shallow ponds and below their water surface", () => {
  for (const depth of [0.04, 0.12, 1]) {
    for (const bob of [-0.05, 0, 0.05]) {
      const y = swimmingHeight(2 + depth, 2, bob);
      expect(y).toBeGreaterThan(2);
      expect(y).toBeLessThan(2 + depth);
    }
  }
});

it("the initial Amazon river remains below adjacent land instead of becoming a water wall",async()=>{
  const {OFFLINE_ECOSYSTEM_SNAPSHOTS}=await import("../demo/snapshots");
  const snapshot=Object.values(OFFLINE_ECOSYSTEM_SNAPSHOTS).find(s=>s.result.terrain.seed===9021);
  expect(snapshot).toBeDefined();
  const grid=snapshot!.result.terrain;
  const levels=waterSurfaceHeights(grid);
  for(const row of grid.cells) for(const cell of row) if(cell.isWater) {
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const bank=grid.cells[cell.y+dy!]?.[cell.x+dx!];
      if(bank && !bank.isWater) expect(levels.get(`${cell.x},${cell.y}`)!).toBeLessThan(.72+bank.elevation*6.9);
    }
  }
});
