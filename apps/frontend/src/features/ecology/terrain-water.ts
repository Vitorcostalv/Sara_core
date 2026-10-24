import type { TerrainGrid } from "../../services/api/ecology";

/** One level per connected lake/sea; shared by water geometry and swimming agents. */
export function waterSurfaceHeights(grid: TerrainGrid) {
  const levels = new Map<string, number>();
  const seen = new Set<string>();
  for (const row of grid.cells) for (const first of row) {
    const firstKey = `${first.x},${first.y}`;
    if (!first.isWater || seen.has(firstKey)) continue;
    const body = [first]; seen.add(firstKey);
    let floor = -Infinity, bank = Infinity;
    for (let i = 0; i < body.length; i++) {
      const cell = body[i]!;
      floor = Math.max(floor, 0.72 + cell.elevation * 6.9);
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const next = grid.cells[cell.y + dy!]?.[cell.x + dx!];
        if (!next) continue;
        if (!next.isWater) { bank = Math.min(bank, 0.72 + next.elevation * 6.9); continue; }
        const key = `${next.x},${next.y}`;
        if (!seen.has(key)) { seen.add(key); body.push(next); }
      }
    }
    const level = Math.max(floor + 0.04, Math.min(floor + 0.12, bank - 0.06));
    for (const cell of body) levels.set(`${cell.x},${cell.y}`, level);
  }
  return levels;
}

/** Keep a swimming agent between the bed and surface, even in a shallow pond. */
export function swimmingHeight(surface: number, floor: number, bob = 0) {
  return Math.min(surface - 0.01, Math.max(floor + 0.02, surface - 0.15 + bob));
}
