/**
 * Terrain generator — MVP procedural implementation.
 * Uses value-noise based on deterministic integer hashing (no native deps).
 * SIMPLIFICATION: not real Perlin/Simplex noise; uses smooth interpolation of
 * pseudo-random hash values. Suitable for synthetic scenario exploration only.
 */

import {
  carveChannels,
  carveWaterBasins,
  enrichTerrain,
  type AltitudeBand,
  type CaveInfo,
  type TerrainFeatureHints,
  type TerrainObjectType,
} from "./terrain-features.service";

export interface TerrainCell {
  x: number;
  y: number;
  elevation: number;       // 0–1 normalised
  temperatureC: number;    // °C, derived from base + elevation lapse
  humidityPct: number;     // 0–100 %
  precipitationMmYear: number;
  salinityPsu: number;     // 0–40 PSU (relevant for coastal/water cells)
  climateCode: string;     // simplified Köppen code
  biomeSuggestion: string; // ecosystem slug hint
  isWater: boolean;

  // ─── Structural layer (added by enrichTerrain, optional for backward compat) ──
  /** 0–1 local steepness derived from the elevation gradient. */
  slope?: number;
  /** 0–1 exposed-rock factor (slope + elevation + noise). */
  rockiness?: number;
  /** Relief band derived from elevation + slope. */
  altitudeBand?: AltitudeBand;
  /** 0–1 normalised river flow accumulation (0 = no river on this cell). */
  waterFlow?: number;
  /** Integer cell distance to the nearest water/river cell (0 on water/river). */
  riverDistance?: number;
  /** Subterranean habitat descriptor; absent when the cell has no cave. */
  cave?: CaveInfo;
  /** Procedural props placed on this cell (rocks, logs, bones, cave-entrance…). */
  objects?: TerrainObjectType[];
}

export interface TerrainGrid {
  width: number;
  height: number;
  seed: number;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  cells: TerrainCell[][];
  simulationNote: string;
}

export type ReliefStyle = "default" | "ocean" | "mountain" | "polar";

export interface TerrainInput {
  width: number;
  height: number;
  seed: number;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  baseHumidityPct: number;
  /**
   * Shapes the macro relief. "default" preserves the original generation byte-for-byte;
   * the other styles enrich the terrain with oceans, mountain ridges or polar ice.
   */
  reliefStyle?: ReliefStyle;
  /** Elevation threshold below which a cell is water. Defaults to 0.25 (original behaviour). */
  seaLevel?: number;
  /** Carve river valleys into the heightmap before classification. Defaults to true. */
  carveChannels?: boolean;
  /** 0 = off (default). 0–1 eases elevation down toward the grid borders (island look). */
  edgeFalloff?: number;
  /** Optional prompt-derived structural hints, e.g. visible cave systems. */
  featureHints?: TerrainFeatureHints;
}

// ─── Hash-based value noise (pure TS, deterministic) ─────────────────────────

function hashInt(x: number, y: number, seed: number): number {
  let h = ((x * 1619) ^ (y * 31337) ^ (seed * 1013)) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0xffffffff; // 0..1
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);
  const v00 = hashInt(ix, iy, seed);
  const v10 = hashInt(ix + 1, iy, seed);
  const v01 = hashInt(ix, iy + 1, seed);
  const v11 = hashInt(ix + 1, iy + 1, seed);
  return lerp(lerp(v00, v10, fx), lerp(v01, v11, fx), fy);
}

function octaveNoise(x: number, y: number, seed: number, octaves = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += valueNoise(x * frequency, y * frequency, seed + i * 997) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

// ─── Climate classification (simplified Köppen) ────────────────────────────

function toKoppenCode(tempC: number, precipMm: number, humidity: number): string {
  if (tempC < -3) {
    if (tempC < -25) return "EF"; // ice cap (calota polar / Antártida)
    if (precipMm < 300) return "ET";
    return "Dfc";
  }
  if (tempC < 10) {
    return precipMm > 500 ? "Cfb" : "BSk";
  }
  if (precipMm < 200) return "BWh";
  if (precipMm < 500) return "BSh";
  if (tempC > 22 && precipMm > 2000) return "Af";
  if (tempC > 18 && precipMm > 1000) return "Am";
  if (tempC > 18) return "Aw";
  if (humidity > 70) return "Cfa";
  return "Csa";
}

function toBiomeSuggestion(tempC: number, precipMm: number, elevation: number): string {
  if (elevation > 0.85) return "deserto-frio";
  if (tempC < -5) return "tundra";
  if (tempC < 5) return "taiga";
  if (precipMm < 200) return tempC > 20 ? "deserto-quente" : "deserto-frio";
  if (precipMm < 500) return tempC > 18 ? "caatinga" : "pradaria-estepe";
  if (precipMm < 900 && tempC > 18) return "savana-tropical";
  // Hot + wet lowland → equatorial rainforest. Broadened (temp>20, precip>=1600) so that
  // procedural precip/temperature noise on a rainforest preset doesn't collapse to dry forest.
  if (tempC > 20 && precipMm >= 1600) return "floresta-tropical-umida";
  // Warm + humid but less rainy → Atlantic-forest-like moist forest.
  if (tempC > 18 && precipMm >= 1100) return "mata-atlantica";
  if (precipMm < 1200 && tempC > 18) return "floresta-tropical-seca";
  if (tempC > 10) return "floresta-tropical-seca";
  return "pradaria-estepe";
}

// Water classification. The "default"/"mountain" path is identical to the original
// inline logic; ocean/polar styles surface dedicated marine biomes.
function classifyWaterBiome(style: ReliefStyle, tempC: number, precipMm: number): string {
  if (style === "polar") return "oceano-polar";
  if (style === "ocean") return tempC < 1 ? "oceano-polar" : "oceano-pelagico";
  return precipMm > 1500 ? "oceano-pelagico" : "lago";
}

// Land classification. The "default" path defers fully to toBiomeSuggestion (no behaviour
// change); the enriched styles add mountains and polar ice on top of the climate heuristic.
function classifyLandBiome(
  style: ReliefStyle,
  tempC: number,
  precipMm: number,
  elevation: number
): string {
  if (style === "mountain") {
    if (elevation > 0.78) return tempC < 1 ? "montanha-nevada" : "montanha";
    return toBiomeSuggestion(tempC, precipMm, elevation);
  }
  if (style === "polar") {
    if (elevation > 0.8) return "montanha-nevada";
    if (tempC < -12) return "antartida";
    return toBiomeSuggestion(tempC, precipMm, elevation);
  }
  return toBiomeSuggestion(tempC, precipMm, elevation);
}

// Ridged noise (sharp crests) for mountain chains: folds the smooth noise around its midpoint.
function ridgedNoise(x: number, y: number, seed: number): number {
  return 1 - Math.abs(octaveNoise(x, y, seed) * 2 - 1);
}

// Deterministic radial/edge falloff (A4): 1 in the interior, easing to 0 at the borders.
// `strength` (0–1) is the fraction of the half-extent over which the easing happens.
function edgeFalloffFactor(nx: number, ny: number, strength: number): number {
  const d = Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5)) * 2; // 0 center → 1 border (square)
  const start = 1 - strength;
  if (d <= start) return 1;
  const t = (d - start) / Math.max(1e-6, 1 - start);
  return 1 - smoothstep(t < 0 ? 0 : t > 1 ? 1 : t);
}

// ─── Generator ────────────────────────────────────────────────────────────────

export class TerrainGeneratorService {
  generate(input: TerrainInput): TerrainGrid {
    const { width, height, seed, baseTemperatureC, basePrecipitationMm, baseHumidityPct } = input;
    const style: ReliefStyle = input.reliefStyle ?? "default";
    const seaLevel = input.seaLevel ?? 0.25;
    const shouldCarve = input.carveChannels ?? true;
    const edgeFalloff = input.edgeFalloff ?? 0;
    const LAPSE_RATE = 6.5; // °C per km (simplified)

    // ── Pass 1: raw, seed-derived heightmap. Carving and (later) every
    // elevation-dependent field run on THIS array, in this order. ──
    const elevation: number[][] = Array.from({ length: height }, () => new Array<number>(width).fill(0));
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const nx = col / width;
        const ny = row / height;

        let e = octaveNoise(nx * 3, ny * 3, seed);
        if (style === "mountain") {
          // Fold in a ridged layer so the relief grows sharp peaks instead of rolling hills.
          const ridge = ridgedNoise(nx * 3.2 + 19, ny * 3.2 + 23, seed + 808);
          e = Math.min(1, e * 0.4 + ridge * 0.7);
        } else if (style === "ocean") {
          // A low-frequency basin layer carves contiguous water with scattered islands.
          const basin = octaveNoise(nx * 1.2 + 5, ny * 1.2 + 9, seed + 404, 2);
          e = Math.min(1, e * 0.72 + basin * 0.2);
        }
        // A4 (optional): ease elevation toward the borders so the map reads as a landmass.
        if (edgeFalloff > 0) e *= edgeFalloffFactor(nx, ny, edgeFalloff);

        elevation[row]![col] = e;
      }
    }

    // ── A1: carve river valleys and still-water basins BEFORE classification. ──
    if (shouldCarve) {
      carveChannels(elevation, width, height);
      carveWaterBasins(elevation, width, height, seaLevel);
    }

    // ── Pass 2: derive temperature/water/biome/etc. on the (carved) heightmap. ──
    const cells: TerrainCell[][] = [];
    for (let row = 0; row < height; row++) {
      const rowCells: TerrainCell[] = [];
      for (let col = 0; col < width; col++) {
        const nx = col / width;
        const ny = row / height;
        const elev = elevation[row]![col]!;

        const humidityNoise = octaveNoise(nx * 2 + 11, ny * 2 + 7, seed + 500, 3);
        const precipNoise = octaveNoise(nx * 2.5 + 3, ny * 2.5 + 13, seed + 300, 3);

        // Temperature decreases with elevation (simplified lapse rate). Only relief styles that
        // model real altitude (mountain/polar) get the full 0–4 km column; lowland styles use a
        // gentle scale so a hot-humid lowland prompt (e.g. Amazônia) does not report alpine-cold
        // minimums from procedural elevation noise.
        const altitudeKm = elev * (style === "mountain" || style === "polar" ? 4 : 1.6);
        const temperatureC = baseTemperatureC - altitudeKm * LAPSE_RATE + (humidityNoise - 0.5) * 4;

        // Humidity and precipitation modulated by noise
        const humidityPct = Math.min(100, Math.max(5, baseHumidityPct + (humidityNoise - 0.5) * 50));
        const precipitationMmYear = Math.max(
          0,
          basePrecipitationMm * (0.4 + precipNoise * 1.2)
        );

        // Water if (carved) elevation below threshold
        const isWater = elev < seaLevel;
        const salinityPsu = isWater ? lerp(0, 35, 1 - elev / seaLevel) : 0;

        const climateCode = toKoppenCode(temperatureC, precipitationMmYear, humidityPct);
        const biomeSuggestion = isWater
          ? classifyWaterBiome(style, temperatureC, precipitationMmYear)
          : classifyLandBiome(style, temperatureC, precipitationMmYear, elev);

        rowCells.push({
          x: col,
          y: row,
          elevation: Math.round(elev * 1000) / 1000,
          temperatureC: Math.round(temperatureC * 10) / 10,
          humidityPct: Math.round(humidityPct * 10) / 10,
          precipitationMmYear: Math.round(precipitationMmYear),
          salinityPsu: Math.round(salinityPsu * 10) / 10,
          climateCode,
          biomeSuggestion,
          isWater,
        });
      }
      cells.push(rowCells);
    }

    const grid: TerrainGrid = {
      width,
      height,
      seed,
      baseTemperatureC,
      basePrecipitationMm,
      cells,
      simulationNote:
        "MVP procedural terrain. Uses value noise (not real Perlin/Simplex). " +
        "Climate and biome assignment are heuristic approximations, not validated ecological models.",
    };

    // Second logical layer: rivers (carved by gradient), caves and procedural
    // objects. Purely additive — never rewrites elevation/isWater/biomeSuggestion.
    // Incidental natural caves are gated to cave-prone relief (mountain); explicit cave hints
    // still generate caves in any style. Lowland default/ocean/polar prompts stay cave-free
    // unless hinted, so an Amazon prompt doesn't sprout caves + cave-specialist fauna.
    enrichTerrain(grid, input.featureHints, { allowNaturalCaves: style === "mountain" });

    return grid;
  }
}

export const terrainGeneratorService = new TerrainGeneratorService();
