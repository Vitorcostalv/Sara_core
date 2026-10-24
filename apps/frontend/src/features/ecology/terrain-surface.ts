import { hasVisibleRiver } from "./terrain-hydrology";
import type { TerrainGrid } from "../../services/api/ecology";

/** Piecewise planar surface: cell centers retain their generated height, shared
 * corners connect the grid without gaps. The renderer and fauna use this sampler. */
export function createTerrainSurface(grid: TerrainGrid) {
  const corners = new Float32Array((grid.width + 1) * (grid.height + 1));
  const top = (x: number, y: number) => 0.72 + grid.cells[y]![x]!.elevation * 6.9;
  for (let y = 0; y <= grid.height; y++) for (let x = 0; x <= grid.width; x++) {
    let sum = 0, count = 0, channelBed = Infinity;
    for (const dy of [-1, 0]) for (const dx of [-1, 0]) {
      if (!grid.cells[y + dy]?.[x + dx]) continue;
      const cell = grid.cells[y + dy]![x + dx]!;
      const height = top(x + dx, y + dy);
      sum += height; count++;
      if (cell.isWater || hasVisibleRiver(cell.waterFlow)) channelBed = Math.min(channelBed,height);
    }
    corners[y * (grid.width + 1) + x] = Math.min(sum / count,channelBed);
  }
  const corner = (x: number, y: number) => corners[y * (grid.width + 1) + x]!;
  function heightAt(worldX: number, worldZ: number) {
    const gx = Math.max(-0.5, Math.min(grid.width - 0.5, worldX + (grid.width - 1) / 2));
    const gy = Math.max(-0.5, Math.min(grid.height - 0.5, worldZ + (grid.height - 1) / 2));
    const x = Math.max(0, Math.min(grid.width - 1, Math.round(gx)));
    const y = Math.max(0, Math.min(grid.height - 1, Math.round(gy)));
    const u = gx - x, v = gy - y, t = Math.max(Math.abs(u), Math.abs(v)) * 2;
    if (t < 1e-8) return top(x, y);
    const a = corner(x,y), b = corner(x+1,y), c = corner(x+1,y+1), d = corner(x,y+1);
    let edge: number;
    if (Math.abs(u) > Math.abs(v)) {
      const s = v / t + 0.5;
      edge = u > 0 ? b + (c - b) * s : a + (d - a) * s;
    } else {
      const s = u / t + 0.5;
      edge = v > 0 ? d + (c - d) * s : a + (b - a) * s;
    }
    return top(x,y) * (1 - t) + edge * t;
  }
  return { corner, heightAt };
}
