/**
 * Terrain features — second logical layer on top of the surface grid.
 *
 * The base {@link TerrainGeneratorService} only describes the *surface* (height,
 * climate, biome, water). This module derives the *structural* layer the ecology
 * simulation needs to place caves, rivers, ledges and procedural objects:
 *
 *   slope / altitudeBand / rockiness  → relief shape
 *   waterFlow / riverDistance         → hydrography (rivers carved by gradient)
 *   cave                              → subterranean habitat (entrance ≠ depth)
 *   objects                           → procedural props (rocks, logs, bones…)
 *
 * Everything is deterministic from the grid seed (no native deps, no RNG state),
 * so the same input always yields the same enriched terrain. The enrichment is
 * purely additive: it never rewrites `elevation`, `isWater` or `biomeSuggestion`,
 * so existing biome/fauna logic and the terrain regression tests stay valid.
 */

import type { TerrainCell, TerrainGrid } from "./terrain-generator.service";

export type CaveType =
  | "none"
  | "shallow-den"
  | "deep-cave"
  | "sinkhole"
  | "cliff-opening"
  | "river-cave"
  | "lava-tube"
  | "karst-system";

export type TerrainObjectType =
  | "rock"
  | "boulder"
  | "fallen-log"
  | "dead-tree"
  | "bush"
  | "nest"
  | "burrow"
  | "bones"
  | "mushroom"
  | "crystal"
  | "waterfall"
  | "cave-entrance"
  | "cliff-ledge";

export type AltitudeBand = "lowland" | "hill" | "mountain" | "cliff";

export interface CaveInfo {
  type: CaveType;
  /** 0–1: how far the system reaches underground (independent of the opening). */
  depth: number;
  /** 0–1: visual size of the entrance/aperture. Small openness + deep depth is allowed. */
  openness: number;
  /** 0–1: internal humidity (high near rivers / flooded systems). */
  humidity: number;
  /** 0–1: how dark the interior is (grows with depth). */
  darkness: number;
  /** Keys ("x,y") of adjacent cave cells in the same system. */
  connectedTo?: string[];
  /** Stable id shared by every cell of a connected cave system. */
  systemId?: string;
  /** True for the surface opening of a system; false for internal-only cells. */
  isEntrance?: boolean;
  /** Structural role within the system: surface opening, deep chamber, or connecting tunnel. */
  role?: "entrance" | "chamber" | "tunnel";
}

export interface TerrainFeatureHints {
  caveQuantity?: "none" | "few" | "many";
  requireVisibleCaves?: boolean;
  preferDeepCave?: boolean;
  rockyOutcrops?: boolean;
}

// ─── Deterministic hashing (mirrors the generator's style, kept local) ──────────

function hashUnit(x: number, y: number, salt: number): number {
  let h = ((x * 1619) ^ (y * 31337) ^ (salt * 1013)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0xffffffff;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

const NEIGHBORS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

const NEIGHBORS_4: ReadonlyArray<readonly [number, number]> = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
];

const SLOPE_GAIN = 5; // value-noise neighbour deltas are small; spread them across 0–1
const MAX_RIVER_DISTANCE = 99;
const cellKey = (x: number, y: number) => `${x},${y}`;

// ─── Relief: slope, altitude band, rockiness ───────────────────────────────────

function computeSlope(cells: TerrainCell[][], width: number, height: number): number[][] {
  const slope: number[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < width; x += 1) {
      const here = cells[y]![x]!.elevation;
      let maxDelta = 0;
      for (const [dx, dy] of NEIGHBORS_8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const delta = Math.abs(here - cells[ny]![nx]!.elevation);
        if (delta > maxDelta) maxDelta = delta;
      }
      row.push(clamp01(maxDelta * SLOPE_GAIN));
    }
    slope.push(row);
  }
  return slope;
}

function altitudeBandFor(elevation: number, slope: number, isWater: boolean): AltitudeBand {
  if (isWater) return "lowland";
  if (slope > 0.55 && elevation > 0.5) return "cliff";
  if (elevation > 0.8) return "mountain";
  if (elevation > 0.5) return "hill";
  return "lowland";
}

function rockinessFor(elevation: number, slope: number, isWater: boolean, noise: number): number {
  if (isWater) return clamp01(noise * 0.1);
  return clamp01(slope * 0.55 + elevation * 0.3 + noise * 0.25 - 0.08);
}

// ─── Channel carving (Part A1): shape valleys into the raw heightmap ────────────
// Tunables — the single documented place for terrain-carving knobs.
export const CHANNEL_CARVE = {
  /** Max elevation lowered at a full-flow channel cell (0-1 elevation units). */
  maxCarve: 0.115,
  /** Normalised flow (0-1) below which a cell is not treated as a channel. */
  carveFlowMin: 0.12,
  /** Valley widening: carve weight applied to cells 0/1/2 steps from a channel. */
  valleyFalloff: [1, 0.58, 0.28] as const,
  /** Box-blur passes applied to the carve field to avoid stair-stepping. */
  smoothing: 1,
  /** Elevation floor channels cannot be carved below. */
  floor: 0.02,
  /** Tiny step enforced downstream so carved channels keep draining. */
  monotonicEpsilon: 0.001,
  /** Extra nonlinear depth applied only to high-flow trunk cells. */
  trunkBoost: 0.065,
  /** Flow at which the extra trunk carve starts becoming visible. */
  trunkFlowMin: 0.58,
} as const;

export const WATER_BASIN_CARVE = {
  /** Max extra lowering for still-water cells at basin centers. */
  maxDepth: 0.075,
  /** Cells over which depth ramps from shore to basin center. */
  shoreFeatherCells: 5,
  /** Keep a thin shelf at the shore instead of cutting a vertical edge. */
  shoreShelf: 0.18,
} as const;

/** D8 lowest-neighbour of a cell, or null at a local minimum. */
function lowestNeighborOf(
  elevation: number[][],
  width: number,
  height: number,
  x: number,
  y: number,
): [number, number] | null {
  let best: [number, number] | null = null;
  let bestE = elevation[y]![x]!;
  for (const [dx, dy] of NEIGHBORS_8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const e = elevation[ny]![nx]!;
    if (e < bestE) {
      bestE = e;
      best = [nx, ny];
    }
  }
  return best;
}

/**
 * Carves river valleys into a raw heightmap *before* water/biome classification, so
 * rivers sit in real depressions instead of being painted on top. Deterministic: it
 * only reads `elevation` (which is seed-derived). Mutates `elevation` in place.
 *
 * Steps: (1) D8 flow accumulation high→low; (2) BFS valley distance to channels;
 * (3) carve field = depth at channels + widened falloff over distance, box-blurred;
 * (4) apply + clamp to floor; (5) enforce monotonic descent along channels so they drain.
 */
export function carveChannels(
  elevation: number[][],
  width: number,
  height: number,
  opts: { maxCarve?: number; carveFlowMin?: number } = {},
): void {
  const maxCarve = opts.maxCarve ?? CHANNEL_CARVE.maxCarve;
  const carveFlowMin = opts.carveFlowMin ?? CHANNEL_CARVE.carveFlowMin;
  const falloff = CHANNEL_CARVE.valleyFalloff;

  // 1. D8 single-flow accumulation: process cells from high to low, push flow downhill.
  const order: Array<[number, number]> = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) order.push([x, y]);
  order.sort((a, b) => elevation[b[1]]![b[0]]! - elevation[a[1]]![a[0]]!);

  const acc: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(1));
  const downstream: Array<Array<[number, number] | null>> = Array.from({ length: height }, () =>
    new Array<[number, number] | null>(width).fill(null),
  );
  let maxAcc = 1;
  for (const [x, y] of order) {
    const low = lowestNeighborOf(elevation, width, height, x, y);
    downstream[y]![x] = low;
    if (low) {
      acc[low[1]]![low[0]]! += acc[y]![x]!;
      if (acc[low[1]]![low[0]]! > maxAcc) maxAcc = acc[low[1]]![low[0]]!;
    }
  }

  // 2. Normalise flow + BFS valley distance (≤2) from channel cells, carrying the
  //    source cell's channel-carve so widening fades around the real channel.
  const channelCarve = (wf: number) => {
    if (wf < carveFlowMin) return 0;
    const base = maxCarve * smoothstep01((wf - carveFlowMin) / (1 - carveFlowMin));
    const trunk = CHANNEL_CARVE.trunkBoost * smoothstep01((wf - CHANNEL_CARVE.trunkFlowMin) / (1 - CHANNEL_CARVE.trunkFlowMin));
    return base + trunk;
  };

  const carve: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  const dist: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(99));
  const srcCarve: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  const queue: Array<[number, number]> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const wf = clamp01(acc[y]![x]! / maxAcc);
      const cc = channelCarve(wf);
      if (cc > 0) {
        dist[y]![x] = 0;
        srcCarve[y]![x] = cc;
        carve[y]![x] = cc;
        queue.push([x, y]);
      }
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head]!;
    const d = dist[y]![x]!;
    if (d >= falloff.length - 1) continue;
    for (const [dx, dy] of NEIGHBORS_8) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (dist[ny]![nx]! <= d + 1) continue;
      dist[ny]![nx]! = d + 1;
      srcCarve[ny]![nx]! = srcCarve[y]![x]!;
      carve[ny]![nx]! = srcCarve[y]![x]! * falloff[d + 1]!;
      queue.push([nx, ny]);
    }
  }

  // 3. One box-blur pass on the carve field → smooth valley walls (no stair-steps).
  for (let pass = 0; pass < CHANNEL_CARVE.smoothing; pass += 1) {
    const blurred: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(0));
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            sum += carve[ny]![nx]!;
            n += 1;
          }
        }
        blurred[y]![x] = sum / n;
      }
    }
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) carve[y]![x] = blurred[y]![x]!;
  }

  // 4. Apply the carve and clamp to the floor.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      elevation[y]![x] = Math.max(CHANNEL_CARVE.floor, elevation[y]![x]! - carve[y]![x]!);
    }
  }

  // 5. Enforce monotonic descent along channel cells so valleys keep draining.
  const eps = CHANNEL_CARVE.monotonicEpsilon;
  for (const [x, y] of order) {
    if (acc[y]![x]! / maxAcc < carveFlowMin) continue;
    const low = downstream[y]![x];
    if (!low) continue;
    const here = elevation[y]![x]!;
    if (elevation[low[1]]![low[0]]! >= here) {
      elevation[low[1]]![low[0]]! = Math.max(CHANNEL_CARVE.floor, here - eps);
    }
  }
}

/**
 * Deepens existing still-water basins before classification, so lakes/oceans have
 * a center-to-shore depth gradient instead of a painted, uniformly shallow sheet.
 * Mutates `elevation` in place and only lowers cells already below `seaLevel`.
 */
export function carveWaterBasins(
  elevation: number[][],
  width: number,
  height: number,
  seaLevel: number,
  opts: { maxDepth?: number; shoreFeatherCells?: number } = {},
): void {
  const maxDepth = opts.maxDepth ?? WATER_BASIN_CARVE.maxDepth;
  const shoreFeatherCells = opts.shoreFeatherCells ?? WATER_BASIN_CARVE.shoreFeatherCells;
  const dist: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(99));
  const queue: Array<[number, number]> = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (elevation[y]![x]! >= seaLevel) continue;
      let touchesLand = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      for (const [dx, dy] of NEIGHBORS_8) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (elevation[ny]![nx]! >= seaLevel) touchesLand = true;
      }
      if (touchesLand) {
        dist[y]![x] = 0;
        queue.push([x, y]);
      }
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head]!;
    const d = dist[y]![x]!;
    if (d >= shoreFeatherCells) continue;
    for (const [dx, dy] of NEIGHBORS_8) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (elevation[ny]![nx]! >= seaLevel || dist[ny]![nx]! <= d + 1) continue;
      dist[ny]![nx] = d + 1;
      queue.push([nx, ny]);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (elevation[y]![x]! >= seaLevel) continue;
      const shoreT = smoothstep01(dist[y]![x]! / Math.max(1, shoreFeatherCells));
      const existingDepthT = smoothstep01((seaLevel - elevation[y]![x]!) / Math.max(0.001, seaLevel));
      const carve = maxDepth * (WATER_BASIN_CARVE.shoreShelf + shoreT * (1 - WATER_BASIN_CARVE.shoreShelf)) * (0.45 + existingDepthT * 0.55);
      elevation[y]![x] = Math.max(CHANNEL_CARVE.floor, elevation[y]![x]! - carve);
    }
  }
}

// Smoothstep over an arbitrary [edge0, edge1] window, returning 0–1.
function smoothstep01(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

// ─── Hydrography: carve rivers by descending the elevation gradient ─────────────

interface RiverField {
  waterFlow: number[][];
  riverDistance: number[][];
}

function lowestNeighbor(
  cells: TerrainCell[][],
  width: number,
  height: number,
  x: number,
  y: number
): { x: number; y: number; elevation: number } | null {
  let best: { x: number; y: number; elevation: number } | null = null;
  for (const [dx, dy] of NEIGHBORS_8) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const elevation = cells[ny]![nx]!.elevation;
    if (!best || elevation < best.elevation) best = { x: nx, y: ny, elevation };
  }
  return best;
}

function carveRivers(grid: TerrainGrid): RiverField {
  const { width, height, cells, seed } = grid;
  const waterFlow: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(0));

  // One source per ~120 cells, at least one on any non-trivial grid.
  const sourceBudget = Math.max(1, Math.floor((width * height) / 120));
  const candidates: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = cells[y]![x]!;
      if (cell.isWater || cell.elevation < 0.6) continue;
      // Deterministic jitter so sources are scattered, biased toward the highest land.
      candidates.push({ x, y, score: cell.elevation + hashUnit(x, y, seed + 9001) * 0.25 });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const sources = candidates.slice(0, sourceBudget);

  let maxFlow = 0;
  for (const source of sources) {
    let cx = source.x;
    let cy = source.y;
    const visited = new Set<string>();
    for (let step = 0; step < width * height; step += 1) {
      const key = cellKey(cx, cy);
      if (visited.has(key)) break; // reached a basin / loop
      visited.add(key);

      waterFlow[cy]![cx]! += 1;
      if (waterFlow[cy]![cx]! > maxFlow) maxFlow = waterFlow[cy]![cx]!;

      const current = cells[cy]![cx]!;
      if (current.isWater) break; // river reached the sea/lake

      const next = lowestNeighbor(cells, width, height, cx, cy);
      if (!next || next.elevation >= current.elevation) break; // local minimum
      cx = next.x;
      cy = next.y;
    }
  }

  // Normalise flow to 0–1.
  if (maxFlow > 0) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        waterFlow[y]![x]! = clamp01(waterFlow[y]![x]! / maxFlow);
      }
    }
  }

  // Multi-source BFS distance to the nearest water OR river cell.
  const riverDistance: number[][] = Array.from({ length: height }, () =>
    new Array<number>(width).fill(MAX_RIVER_DISTANCE)
  );
  const queue: Array<[number, number]> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (cells[y]![x]!.isWater || waterFlow[y]![x]! > 0) {
        riverDistance[y]![x]! = 0;
        queue.push([x, y]);
      }
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const [x, y] = queue[head]!;
    const d = riverDistance[y]![x]!;
    for (const [dx, dy] of NEIGHBORS_4) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      if (riverDistance[ny]![nx]! <= d + 1) continue;
      riverDistance[ny]![nx]! = d + 1;
      queue.push([nx, ny]);
    }
  }

  return { waterFlow, riverDistance };
}

// ─── Caves: born where relief is strong, near water, or on exposed rock ─────────
// Natural-cave tunables (one documented place) — B1: fewer, cleaner systems.
export const CAVE_NATURAL = {
  /** Higher gate = fewer raw cave cells before grouping. */
  chanceGate: 0.66,
  /** Keep only the largest K connected systems. */
  maxSystems: 6,
  /** Discard isolated systems below this size (unless it would remove every cave). */
  minSystemCells: 2,
  /** Minimum Manhattan distance enforced between kept system entrances. */
  systemSpacing: 5,
} as const;

function classifyCave(params: {
  slope: number;
  rockiness: number;
  elevation: number;
  moisture: number;
  altitudeBand: AltitudeBand;
  riverDistance: number;
  caveNoise: number;
}): CaveType {
  const { slope, elevation, altitudeBand, riverDistance, caveNoise } = params;
  if (riverDistance <= 1 && slope > 0.4) return "river-cave";
  if (altitudeBand === "cliff" || slope > 0.62) return "cliff-opening";
  if (slope < 0.25 && caveNoise > 0.8) return "sinkhole";
  if (elevation > 0.75) return caveNoise > 0.85 ? "karst-system" : "deep-cave";
  return caveNoise > 0.5 ? "deep-cave" : "shallow-den";
}

function assignCaves(
  grid: TerrainGrid,
  slope: number[][],
  rockiness: number[][],
  riverDistance: number[][]
): (CaveInfo | undefined)[][] {
  const { width, height, cells, seed } = grid;
  const caves: (CaveInfo | undefined)[][] = Array.from({ length: height }, () =>
    new Array<CaveInfo | undefined>(width).fill(undefined)
  );

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = cells[y]![x]!;
      if (cell.isWater) continue;

      const moisture = cell.humidityPct / 100;
      const caveChance =
        slope[y]![x]! * 0.45 +
        rockiness[y]![x]! * 0.25 +
        moisture * 0.15 +
        cell.elevation * 0.15;
      const caveNoise = hashUnit(x, y, seed + 4242);

      // Blend the structural chance with noise; gate so caves stay sparse.
      if (caveChance * 0.6 + caveNoise * 0.4 < CAVE_NATURAL.chanceGate) continue;

      const band = altitudeBandFor(cell.elevation, slope[y]![x]!, false);
      const type = classifyCave({
        slope: slope[y]![x]!,
        rockiness: rockiness[y]![x]!,
        elevation: cell.elevation,
        moisture,
        altitudeBand: band,
        riverDistance: riverDistance[y]![x]!,
        caveNoise,
      });

      const depth = clamp01(0.4 + cell.elevation * 0.4 + caveNoise * 0.3);
      const openness = clamp01(0.15 + slope[y]![x]! * 0.4 + hashUnit(x, y, seed + 73) * 0.3);
      const near = riverDistance[y]![x]! <= 2;
      const humidity = clamp01(moisture * 0.6 + (near ? 0.4 : 0.1) + (type === "river-cave" ? 0.3 : 0));
      const darkness = clamp01(0.4 + depth * 0.6);

      caves[y]![x] = { type, depth, openness, humidity, darkness };
    }
  }

  // Group adjacent cave cells into connected systems (union via flood fill).
  interface CaveSystem {
    id: string;
    members: Array<{ x: number; y: number; info: CaveInfo }>;
    entrance: { x: number; y: number };
  }
  const systems: CaveSystem[] = [];
  let systemIndex = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const root = caves[y]![x];
      if (!root || root.systemId) continue;

      const systemId = `cave-${systemIndex++}`;
      const members: Array<{ x: number; y: number; info: CaveInfo }> = [];
      const stack: Array<[number, number]> = [[x, y]];
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const info = caves[cy]![cx];
        if (!info || info.systemId) continue;
        info.systemId = systemId;
        info.isEntrance = false;
        info.role = "tunnel";
        members.push({ x: cx, y: cy, info });
        const connected: string[] = [];
        for (const [dx, dy] of NEIGHBORS_8) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (caves[ny]![nx]) {
            connected.push(cellKey(nx, ny));
            stack.push([nx, ny]);
          }
        }
        if (connected.length > 0) info.connectedTo = connected;
      }
      // The widest aperture becomes the surface entrance; the deepest cell is the
      // chamber; everything between stays a connecting tunnel.
      let entrance = members[0]!;
      let chamber = members[0]!;
      for (const member of members) {
        if (member.info.openness > entrance.info.openness) entrance = member;
        if (member.info.depth > chamber.info.depth) chamber = member;
      }
      entrance.info.isEntrance = true;
      entrance.info.role = "entrance";
      if (chamber !== entrance) chamber.info.role = "chamber";
      systems.push({ id: systemId, members, entrance: { x: entrance.x, y: entrance.y } });
    }
  }

  // B1: keep a few deliberate systems — largest K, min size, spaced apart — and
  // erase the rest so natural caves feel curated like the prompt path.
  systems.sort((a, b) => b.members.length - a.members.length);
  const kept: CaveSystem[] = [];
  for (const sys of systems) {
    if (kept.length >= CAVE_NATURAL.maxSystems) break;
    if (sys.members.length < CAVE_NATURAL.minSystemCells) continue;
    const tooClose = kept.some(
      (k) =>
        Math.abs(k.entrance.x - sys.entrance.x) + Math.abs(k.entrance.y - sys.entrance.y) <
        CAVE_NATURAL.systemSpacing,
    );
    if (tooClose) continue;
    kept.push(sys);
  }
  // Fallback: never strip every cave — keep the single largest if nothing qualified.
  if (kept.length === 0 && systems.length > 0) kept.push(systems[0]!);

  const keptIds = new Set(kept.map((s) => s.id));
  for (const sys of systems) {
    if (keptIds.has(sys.id)) continue;
    for (const m of sys.members) caves[m.y]![m.x] = undefined;
  }

  return caves;
}

// ─── Procedural objects: derived from relief, hydrography, biome and caves ──────

const FOREST_BIOMES = new Set([
  "floresta-tropical-umida",
  "floresta-tropical-seca",
  "mata-atlantica",
  "manguezal",
  "pantanal",
  "taiga",
]);
const ARID_BIOMES = new Set(["deserto-quente", "deserto-frio", "caatinga"]);
const GRASS_BIOMES = new Set(["savana-tropical", "cerrado", "pradaria-estepe", "chaparral"]);
const COLD_BIOMES = new Set(["tundra", "montanha", "montanha-nevada", "antartida", "deserto-frio"]);

// Number of cave *systems* (not cells) a prompt should produce.
function visibleCaveTarget(grid: TerrainGrid, hints?: TerrainFeatureHints): number | null {
  if (!hints?.requireVisibleCaves && hints?.caveQuantity === undefined) return null;
  if (hints.caveQuantity === "none") return 0;
  const area = grid.width * grid.height;
  if (hints.caveQuantity === "many") return Math.max(4, Math.min(8, Math.round(area / 320)));
  // "few" → a small handful of systems (2–4), each grown into several cells.
  return Math.max(2, Math.min(4, Math.round(area / 640)));
}

function classifyEntranceType(params: {
  slope: number;
  rockiness: number;
  riverDistance: number;
  caveNoise: number;
  preferDeep: boolean;
}): CaveType {
  const { slope, rockiness, riverDistance, caveNoise, preferDeep } = params;
  if (riverDistance <= 1) return "river-cave";
  if (slope > 0.58) return "cliff-opening";
  if (slope < 0.24 && caveNoise > 0.55) return "sinkhole";
  if (preferDeep || rockiness > 0.56) return caveNoise > 0.78 ? "karst-system" : "deep-cave";
  return "shallow-den";
}

// How many internal (non-entrance) cells a system of a given type should grow.
function internalCellTarget(type: CaveType, preferDeep: boolean, noise: number): number {
  switch (type) {
    case "shallow-den":
      return noise < 0.5 ? 1 : 2;
    case "sinkhole":
      return 1 + Math.floor(noise * 2); // 1–2
    case "river-cave":
    case "cliff-opening":
      return 1 + Math.floor(noise * 3); // 1–3
    case "deep-cave":
      return (preferDeep ? 3 : 2) + Math.floor(noise * 2); // 2–4 (5 if deep)
    case "karst-system":
      return 3 + Math.floor(noise * 4); // 3–6
    default:
      return 1;
  }
}

/**
 * Prompt-driven caves: instead of scattering isolated single-cell holes, grow a
 * small number of cave *systems*. Spacing is enforced between system entrances,
 * but internal cells are allowed to cluster around their entrance. Each system
 * gets an entrance, one or more deeper chambers, and short connecting tunnels.
 */
function applyCaveHints(
  grid: TerrainGrid,
  slope: number[][],
  rockiness: number[][],
  riverDistance: number[][],
  caves: (CaveInfo | undefined)[][],
  hints?: TerrainFeatureHints
): (CaveInfo | undefined)[][] {
  const systemTarget = visibleCaveTarget(grid, hints);
  if (systemTarget === null) return caves;
  const next: (CaveInfo | undefined)[][] = Array.from({ length: grid.height }, () =>
    new Array<CaveInfo | undefined>(grid.width).fill(undefined)
  );
  if (systemTarget === 0) return next;

  const preferDeep = Boolean(hints?.preferDeepCave);

  // Rank candidate entrance cells (steep, rocky, elevated, near rivers).
  const candidates: Array<{ x: number; y: number; score: number }> = [];
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const cell = grid.cells[y]![x]!;
      if (cell.isWater) continue;
      const existing = caves[y]![x] ? 0.35 : 0;
      const score =
        existing +
        slope[y]![x]! * 0.36 +
        rockiness[y]![x]! * 0.28 +
        cell.elevation * 0.2 +
        (riverDistance[y]![x]! <= 2 ? 0.08 : 0) +
        hashUnit(x, y, grid.seed + 9151) * 0.22;
      candidates.push({ x, y, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  // Pick spaced-apart entrance seeds (spacing applies between systems only).
  const SYSTEM_SPACING = 5;
  const entrances: Array<{ x: number; y: number }> = [];
  for (const candidate of candidates) {
    if (entrances.length >= systemTarget) break;
    const tooClose = entrances.some(
      (entry) => Math.abs(entry.x - candidate.x) + Math.abs(entry.y - candidate.y) < SYSTEM_SPACING
    );
    if (tooClose) continue;
    entrances.push(candidate);
  }

  const isLand = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < grid.width && y < grid.height && !grid.cells[y]![x]!.isWater;

  entrances.forEach((seed, index) => {
    const systemId = `cave-${index}`;
    const caveNoise = hashUnit(seed.x, seed.y, grid.seed + 9091);
    const type = classifyEntranceType({
      slope: slope[seed.y]![seed.x]!,
      rockiness: rockiness[seed.y]![seed.x]!,
      riverDistance: riverDistance[seed.y]![seed.x]!,
      caveNoise,
      preferDeep,
    });
    const baseDepth = clamp01((preferDeep ? 0.6 : 0.4) + grid.cells[seed.y]![seed.x]!.elevation * 0.3 + caveNoise * 0.2);

    // Member cells of this system: index 0 is the entrance.
    const members: Array<{ x: number; y: number; ring: number }> = [{ ...seed, ring: 0 }];
    const claimed = new Set<string>([cellKey(seed.x, seed.y)]);
    const wantInternal = internalCellTarget(type, preferDeep, hashUnit(seed.x, seed.y, grid.seed + 9221));

    // Grow internal cells by walking outward from the entrance onto free land.
    const frontier: Array<{ x: number; y: number; ring: number }> = [{ ...seed, ring: 0 }];
    while (members.length - 1 < wantInternal && frontier.length > 0) {
      const current = frontier.shift()!;
      const neighbors = NEIGHBORS_8
        .map(([dx, dy]) => ({ x: current.x + dx, y: current.y + dy }))
        .filter(
          (n) => isLand(n.x, n.y) && !claimed.has(cellKey(n.x, n.y)) && !next[n.y]![n.x],
        )
        .sort(
          (a, b) =>
            hashUnit(a.x, a.y, grid.seed + 9311 + index) - hashUnit(b.x, b.y, grid.seed + 9311 + index),
        );
      for (const n of neighbors) {
        if (members.length - 1 >= wantInternal) break;
        claimed.add(cellKey(n.x, n.y));
        const next_ = { x: n.x, y: n.y, ring: current.ring + 1 };
        members.push(next_);
        frontier.push(next_);
      }
    }

    const maxRing = members.reduce((max, m) => Math.max(max, m.ring), 0);
    members.forEach((member) => {
      const isEntrance = member.ring === 0;
      // Depth grows the further a cell sits from the entrance; the deepest ring
      // becomes the chamber, intermediate cells become connecting tunnels.
      const depth = clamp01(baseDepth + member.ring * 0.12 + hashUnit(member.x, member.y, grid.seed + 9377) * 0.1);
      const role: CaveInfo["role"] = isEntrance
        ? "entrance"
        : member.ring >= maxRing
          ? "chamber"
          : "tunnel";
      const connected: string[] = [];
      for (const [dx, dy] of NEIGHBORS_8) {
        const nx = member.x + dx;
        const ny = member.y + dy;
        if (claimed.has(cellKey(nx, ny))) connected.push(cellKey(nx, ny));
      }
      next[member.y]![member.x] = {
        type,
        depth,
        openness: clamp01(0.34 + slope[member.y]![member.x]! * 0.42 + hashUnit(member.x, member.y, grid.seed + 9097) * 0.24),
        humidity: clamp01(
          grid.cells[member.y]![member.x]!.humidityPct / 100 +
            (riverDistance[member.y]![member.x]! <= 2 ? 0.28 : 0.04) +
            (type === "river-cave" ? 0.3 : 0),
        ),
        darkness: clamp01(0.45 + depth * 0.55),
        systemId,
        connectedTo: connected,
        isEntrance,
        role,
      };
    });

    // Single-cell fallback: ensure at least an entrance exists for this system.
    if (!next[seed.y]![seed.x]) {
      next[seed.y]![seed.x] = {
        type,
        depth: baseDepth,
        openness: clamp01(0.34 + slope[seed.y]![seed.x]! * 0.42),
        humidity: clamp01(grid.cells[seed.y]![seed.x]!.humidityPct / 100),
        darkness: clamp01(0.45 + baseDepth * 0.55),
        systemId,
        connectedTo: [],
        isEntrance: true,
        role: "entrance",
      };
    }
  });

  return next;
}

function placeObjects(
  grid: TerrainGrid,
  slope: number[][],
  rockiness: number[][],
  waterFlow: number[][],
  riverDistance: number[][],
  caves: (CaveInfo | undefined)[][],
  hints?: TerrainFeatureHints
): TerrainObjectType[][][] {
  const { width, height, cells, seed } = grid;
  const objects: TerrainObjectType[][][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => [] as TerrainObjectType[])
  );

  const roll = (x: number, y: number, salt: number) => hashUnit(x, y, seed + salt);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = cells[y]![x]!;
      const out = objects[y]![x]!;
      if (cell.isWater) {
        // Plantas aquáticas / juncos esparsos na lâmina d'água.
        if (roll(x, y, 611) < 0.18) out.push("bush");
        continue;
      }

      const s = slope[y]![x]!;
      const cave = caves[y]![x];
      const near = riverDistance[y]![x]!;
      const biome = cell.biomeSuggestion;

      // Cave entrances and steep-relief props come first (highest signal).
      // Only the surface opening gets the entrance + rocky rim; internal cells
      // stay visually plain on the surface and are revealed only in X-ray mode.
      if (cave && cave.type !== "none" && cave.isEntrance !== false) {
        out.push("cave-entrance");
        out.push("boulder");
        if (s > 0.35 || hints?.rockyOutcrops) out.push("cliff-ledge");
      }
      if (s > 0.65 && cell.elevation > 0.45 && roll(x, y, 101) < 0.7) out.push("cliff-ledge");
      if (s > 0.6 && roll(x, y, 113) < 0.45) out.push("boulder");
      else if (rockiness[y]![x]! > 0.5 && roll(x, y, 127) < 0.32) out.push("rock");

      // Hydrography: river banks and waterfalls.
      if (near <= 1) {
        if (roll(x, y, 211) < 0.4) out.push("rock");
        if (roll(x, y, 223) < 0.22) out.push("fallen-log");
        if (roll(x, y, 227) < 0.18) out.push("nest");
        if (waterFlow[y]![x]! > 0.55 && s > 0.5 && roll(x, y, 233) < 0.5) out.push("waterfall");
      }

      // Biome-driven props.
      if (FOREST_BIOMES.has(biome)) {
        const moist = cell.humidityPct / 100;
        if (moist > 0.6 && roll(x, y, 311) < 0.3) out.push("mushroom");
        if (roll(x, y, 317) < 0.16) out.push("fallen-log");
        if (roll(x, y, 331) < 0.1) out.push("dead-tree");
        if (roll(x, y, 337) < 0.12) out.push("burrow");
      } else if (ARID_BIOMES.has(biome)) {
        if (roll(x, y, 411) < 0.16) out.push("bones");
        if (roll(x, y, 419) < 0.2) out.push("rock");
        if (roll(x, y, 421) < 0.14) out.push("burrow");
      } else if (GRASS_BIOMES.has(biome)) {
        if (roll(x, y, 511) < 0.22) out.push("bush");
        if (roll(x, y, 517) < 0.1) out.push("bones");
        if (roll(x, y, 521) < 0.12) out.push("nest");
      }

      // Crystals deep underground / cold high relief; bones in cold dead zones.
      if (cave && (cave.type === "deep-cave" || cave.type === "karst-system") && roll(x, y, 711) < 0.5) {
        out.push("crystal");
      } else if (COLD_BIOMES.has(biome) && cell.elevation > 0.8 && roll(x, y, 719) < 0.18) {
        out.push("crystal");
      }
      if (COLD_BIOMES.has(biome) && roll(x, y, 811) < 0.06) out.push("bones");

      // Keep cells uncluttered.
      if (out.length > 3) out.length = 3;
    }
  }

  return objects;
}

// ─── Public entry point ─────────────────────────────────────────────────────────

export interface TerrainFeatureSummary {
  riverCells: number;
  caveCells: number;
  caveSystems: number;
  caveTypeCounts: Partial<Record<CaveType, number>>;
  objectCount: number;
}

/**
 * Mutates each cell in-place, adding the structural layer (slope, altitudeBand,
 * rockiness, waterFlow, riverDistance, cave, objects). River banks also receive a
 * small humidity boost (clamped to 100). Returns a summary for diagnostics/reports.
 */
export interface EnrichOptions {
  /**
   * Whether incidental natural caves may form. Caves are a geological feature: they are gated to
   * cave-prone relief (e.g. mountain) or to explicit cave hints, so ordinary lowland prompts
   * (e.g. Amazônia) don't sprout caves/cave-fauna. Explicit hints always take effect regardless.
   * Defaults to true for backward compatibility with direct callers/tests.
   */
  allowNaturalCaves?: boolean;
}

export function enrichTerrain(
  grid: TerrainGrid,
  hints?: TerrainFeatureHints,
  options?: EnrichOptions
): TerrainFeatureSummary {
  const { width, height, cells } = grid;

  const slope = computeSlope(cells, width, height);
  const { waterFlow, riverDistance } = carveRivers(grid);

  const rockiness: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(0));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = cells[y]![x]!;
      const noise = hashUnit(x, y, grid.seed + 1777);
      rockiness[y]![x]! = rockinessFor(cell.elevation, slope[y]![x]!, cell.isWater, noise);
    }
  }

  // Natural caves only when allowed (cave-prone relief); hint-driven caves still apply either way.
  const allowNaturalCaves = options?.allowNaturalCaves ?? true;
  const emptyCaves: (CaveInfo | undefined)[][] = Array.from({ length: height }, () =>
    new Array<CaveInfo | undefined>(width).fill(undefined)
  );
  const naturalCaves = allowNaturalCaves
    ? assignCaves(grid, slope, rockiness, riverDistance)
    : emptyCaves;
  const caves = applyCaveHints(grid, slope, rockiness, riverDistance, naturalCaves, hints);
  const objects = placeObjects(grid, slope, rockiness, waterFlow, riverDistance, caves, hints);

  let riverCells = 0;
  let caveCells = 0;
  let objectCount = 0;
  const caveSystems = new Set<string>();
  const caveTypeCounts: Partial<Record<CaveType, number>> = {};

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const cell = cells[y]![x]!;
      cell.slope = Math.round(slope[y]![x]! * 1000) / 1000;
      cell.rockiness = Math.round(rockiness[y]![x]! * 1000) / 1000;
      cell.waterFlow = Math.round(waterFlow[y]![x]! * 1000) / 1000;
      cell.riverDistance = riverDistance[y]![x]!;
      cell.altitudeBand = altitudeBandFor(cell.elevation, slope[y]![x]!, cell.isWater);

      // River banks are moister (does not flip isWater/biome).
      if (!cell.isWater && riverDistance[y]![x]! === 1) {
        cell.humidityPct = Math.min(100, Math.round((cell.humidityPct + 12) * 10) / 10);
      }
      if (waterFlow[y]![x]! > 0 && !cell.isWater) riverCells += 1;

      const cave = caves[y]![x];
      if (cave) {
        cell.cave = {
          type: cave.type,
          depth: Math.round(cave.depth * 1000) / 1000,
          openness: Math.round(cave.openness * 1000) / 1000,
          humidity: Math.round(cave.humidity * 1000) / 1000,
          darkness: Math.round(cave.darkness * 1000) / 1000,
          ...(cave.connectedTo ? { connectedTo: cave.connectedTo } : {}),
          ...(cave.systemId ? { systemId: cave.systemId } : {}),
          ...(cave.isEntrance !== undefined ? { isEntrance: cave.isEntrance } : {}),
          ...(cave.role ? { role: cave.role } : {}),
        };
        caveCells += 1;
        if (cave.systemId) caveSystems.add(cave.systemId);
        caveTypeCounts[cave.type] = (caveTypeCounts[cave.type] ?? 0) + 1;
      }

      const objs = objects[y]![x]!;
      if (objs.length > 0) {
        cell.objects = objs;
        objectCount += objs.length;
      }
    }
  }

  return {
    riverCells,
    caveCells,
    caveSystems: caveSystems.size,
    caveTypeCounts,
    objectCount,
  };
}
