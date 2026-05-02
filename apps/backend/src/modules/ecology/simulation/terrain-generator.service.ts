/**
 * Terrain generator — MVP procedural implementation.
 * Uses value-noise based on deterministic integer hashing (no native deps).
 * SIMPLIFICATION: not real Perlin/Simplex noise; uses smooth interpolation of
 * pseudo-random hash values. Suitable for synthetic scenario exploration only.
 */

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

export interface TerrainInput {
  width: number;
  height: number;
  seed: number;
  baseTemperatureC: number;
  basePrecipitationMm: number;
  baseHumidityPct: number;
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
  if (precipMm < 1200 && tempC > 18) return "floresta-tropical-seca";
  if (tempC > 22 && precipMm > 2000) return "floresta-tropical-umida";
  if (tempC > 18 && precipMm > 1200) return "mata-atlantica";
  if (tempC > 10) return "floresta-tropical-seca";
  return "pradaria-estepe";
}

// ─── Generator ────────────────────────────────────────────────────────────────

export class TerrainGeneratorService {
  generate(input: TerrainInput): TerrainGrid {
    const { width, height, seed, baseTemperatureC, basePrecipitationMm, baseHumidityPct } = input;
    const LAPSE_RATE = 6.5; // °C per km (simplified)
    const cells: TerrainCell[][] = [];

    for (let row = 0; row < height; row++) {
      const rowCells: TerrainCell[] = [];
      for (let col = 0; col < width; col++) {
        const nx = col / width;
        const ny = row / height;

        const elevation = octaveNoise(nx * 3, ny * 3, seed);
        const humidityNoise = octaveNoise(nx * 2 + 11, ny * 2 + 7, seed + 500, 3);
        const precipNoise = octaveNoise(nx * 2.5 + 3, ny * 2.5 + 13, seed + 300, 3);

        // Temperature decreases with elevation (simplified lapse rate)
        const altitudeKm = elevation * 4;
        const temperatureC = baseTemperatureC - altitudeKm * LAPSE_RATE + (humidityNoise - 0.5) * 4;

        // Humidity and precipitation modulated by noise
        const humidityPct = Math.min(100, Math.max(5, baseHumidityPct + (humidityNoise - 0.5) * 50));
        const precipitationMmYear = Math.max(
          0,
          basePrecipitationMm * (0.4 + precipNoise * 1.2)
        );

        // Water if elevation below threshold
        const isWater = elevation < 0.25;
        const salinityPsu = isWater ? lerp(0, 35, 1 - elevation / 0.25) : 0;

        const climateCode = toKoppenCode(temperatureC, precipitationMmYear, humidityPct);
        const biomeSuggestion = isWater
          ? precipitationMmYear > 1500 ? "oceano-pelagico" : "lago"
          : toBiomeSuggestion(temperatureC, precipitationMmYear, elevation);

        rowCells.push({
          x: col,
          y: row,
          elevation: Math.round(elevation * 1000) / 1000,
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

    return {
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
  }
}

export const terrainGeneratorService = new TerrainGeneratorService();
