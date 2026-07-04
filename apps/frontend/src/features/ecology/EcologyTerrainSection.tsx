import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Html,
  OrbitControls,
  useTexture,
} from "@react-three/drei";
import { Mountains, Sparkle, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type {
  ActivityPeriod,
  EcosystemReport,
  ReliefStyle,
  SpeciesDefinition,
  TerrainCell,
  TerrainGrid,
  TerrainPromptResult,
} from "../../services/api/ecology";
import { DayNightCycle, formatSimulatedTime } from "./DayNightCycle";
import FaunaLayer, { type FaunaEvent } from "./FaunaLayer";
import { RainSystem } from "./RainSystem";
import { getSpeciesRenderProfile } from "./faunaRenderProfiles";

const BIOME_COLORS: Record<string, number> = {
  "floresta-tropical-umida": 0x2f7a4f,
  "floresta-tropical-seca": 0x6f8f43,
  "mata-atlantica": 0x2f744b,
  cerrado: 0xbe9540,
  caatinga: 0xc98b4d,
  "savana-tropical": 0xcfab54,
  pantanal: 0x599b77,
  manguezal: 0x3d8367,
  tundra: 0xa4afb0,
  taiga: 0x55744c,
  "deserto-quente": 0xd98a56,
  "deserto-frio": 0x9aa4ad,
  "pradaria-estepe": 0x9eb563,
  "oceano-pelagico": 0x4e93bf,
  "oceano-polar": 0x6f9fc4,
  lago: 0x6cb6d7,
  "recife-de-coral": 0xdb9b7b,
  chaparral: 0x9d7a4d,
  montanha: 0x8b8579,
  "montanha-nevada": 0xdde8ee,
  antartida: 0xe6eef2,
};

const BIOME_LABELS: Record<string, string> = {
  "floresta-tropical-umida": "floresta tropical umida",
  "floresta-tropical-seca": "floresta tropical seca",
  "mata-atlantica": "mata atlantica",
  cerrado: "cerrado",
  caatinga: "caatinga",
  "savana-tropical": "savana tropical",
  pantanal: "pantanal",
  manguezal: "manguezal",
  tundra: "tundra",
  taiga: "taiga",
  "deserto-quente": "deserto quente",
  "deserto-frio": "deserto frio",
  "pradaria-estepe": "pradaria estepe",
  "oceano-pelagico": "oceano",
  "oceano-polar": "oceano polar",
  lago: "lago",
  "recife-de-coral": "recife de coral",
  chaparral: "chaparral",
  montanha: "montanha",
  "montanha-nevada": "montanha nevada",
  antartida: "antartida",
};

const CELL_SIZE = 1;
const LAND_SIZE = 0.94;
const WATER_SIZE = 0.98;
const WATER_HEIGHT = 0.34;
const LAND_MIN_HEIGHT = 0.72;
const HEIGHT_SCALE = 6.9;
const WATER_BANK_RECESS = 0.14;
const MIN_VISIBLE_WATER_DEPTH = 0.12;
const SHALLOW_WATER_HEX = 0x88c5d9;
const DEEP_WATER_HEX = 0x1d4d6e;
const HOVER_COLOR = 0xf4dc8c;
const FALLBACK_COLOR = 0x7b6a5b;

// ─── River rendering tunables (the single documented place, frontend side) ──────
const RIVER_FLOW_MIN = 0.16; // render threshold: below this a cell is a trickle, dropped
const RIVER_MIN_COMPONENT_CELLS = 3; // drop river fragments smaller than this (prune stubs)
const RIVER_SURFACE_LIFT = 0.1; // minimum water above the carved channel floor
const RIVER_WATERFALL_DROP = 0.55; // surface-height delta that spawns a waterfall ribbon
const RIVER_WET_BANK_HEX = 0x243a36;

declare global {
  interface Window {
    __terrainDebug?: {
      lightningObserved?: boolean;
      setRainEnabled?: (enabled: boolean) => void;
      setRainIntensity?: (intensity: number) => void;
      setSimulatedTime?: (hour: number) => void;
      simulatedTimeRef?: React.MutableRefObject<number>;
    };
  }
}

interface TerrainForm {
  width: string;
  height: string;
  seed: string;
  baseTemperatureC: string;
  basePrecipitationMm: string;
  baseHumidityPct: string;
}

interface InstanceSpec {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  color: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

interface HoverableInstance extends InstanceSpec {
  cell: TerrainCell;
  tooltipY: number;
}

interface CaveInstance extends InstanceSpec {
  type: NonNullable<TerrainCell["cave"]>["type"];
  depth: number;
  openness: number;
  humidity: number;
  darkness: number;
  systemId?: string;
  connectedTo?: string[];
  isEntrance: boolean;
  role?: "entrance" | "chamber" | "tunnel";
  gridX: number;
  gridY: number;
  surfaceY: number;
}

// A translucent x-ray tube connecting two cave cells of the same system.
interface CaveTunnel {
  ax: number;
  ay: number;
  az: number;
  bx: number;
  by: number;
  bz: number;
  river: boolean;
  systemId?: string;
}

interface LegendEntry {
  label: string;
  color: string;
}

interface VegetationBatches {
  pineTrunks: InstanceSpec[];
  pineCanopies: InstanceSpec[];
  broadleafTrunks: InstanceSpec[];
  broadleafCanopies: InstanceSpec[];
  shrubs: InstanceSpec[];
  cactusBodies: InstanceSpec[];
  cactusArmsLeft: InstanceSpec[];
  cactusArmsRight: InstanceSpec[];
  rocks: InstanceSpec[];
}

// Procedural props derived from cell.objects / cell.cave, grouped by geometry.
interface ObjectBatches {
  stones: InstanceSpec[]; // rock, boulder       (dodecahedron)
  logs: InstanceSpec[]; // fallen-log, dead-tree (cylinder)
  foliage: InstanceSpec[]; // bush, mushroom     (icosahedron)
  blocks: InstanceSpec[]; // bones, cliff-ledge, burrow, nest (box)
  crystals: InstanceSpec[]; // crystal           (cone, up)
  waterfalls: InstanceSpec[]; // waterfall       (box, translucent)
}

interface SceneData {
  land: HoverableInstance[];
  water: HoverableInstance[];
  legend: LegendEntry[];
  vegetation: VegetationBatches;
  objects: ObjectBatches;
  objectLegend: LegendEntry[];
  waterSurfaces: InstanceSpec[]; // animated top faces for lake/sea water volumes
  caves: CaveInstance[]; // every cave cell (entrance + internal) with metadata
  caveTunnels: CaveTunnel[]; // x-ray links between connected cave cells
  rivers: RiverScene; // continuous river channel (bed/current/margin/falls)
  reliefMarkers: ReliefMarker[]; // altitude/cliff highlight discs
  worldRadius: number;
  fogDensity: number;
}

// Tile-aligned river water. The terrain is rendered as columns, so rivers use the
// same per-cell grammar as lake/sea water instead of a smooth tube laid on top.
interface RiverScene {
  volumes: InstanceSpec[]; // filled river water volumes seated in the carved channel
  surfaces: InstanceSpec[]; // animated top faces for river volume tiles
  wetBanks: InstanceSpec[]; // waterline/wet-rock bands along the channel shoulders
  falls: InstanceSpec[]; // translucent vertical drops where connected cells differ in height
}

interface RiverNode {
  gx: number;
  gy: number;
  wx: number;
  wz: number;
  surfaceY: number;
  bankY: number;
  flow: number;
}

// Altitude/cliff highlight used by the Relief layer.
interface ReliefMarker extends InstanceSpec {
  band: "hill" | "mountain" | "cliff";
}

// Colour per procedural object type (low-poly palette consistent with the scene).
const OBJECT_COLORS: Record<string, number> = {
  rock: 0x8f867d,
  boulder: 0x77706a,
  "fallen-log": 0x6f5135,
  "dead-tree": 0x4f3d2a,
  bush: 0x6f8a47,
  mushroom: 0xb5503f,
  bones: 0xe7e2d4,
  "cliff-ledge": 0x9a9085,
  burrow: 0x3a2c20,
  nest: 0x8a6b44,
  crystal: 0x6fd6e0,
  waterfall: 0xa9d8ea,
  "cave-entrance": 0x161310,
};

const OBJECT_LABELS: Record<string, string> = {
  rock: "rochas",
  boulder: "pedregulhos",
  "fallen-log": "troncos",
  "dead-tree": "arvores mortas",
  bush: "arbustos",
  mushroom: "cogumelos",
  bones: "ossos",
  "cliff-ledge": "saliencias",
  burrow: "tocas",
  nest: "ninhos",
  crystal: "cristais",
  waterfall: "cachoeiras",
  "cave-entrance": "entradas de caverna",
};

interface HoverState {
  cell: TerrainCell;
  position: [number, number, number];
  biomeLabel: string;
}

interface InvasiveOverlayData {
  invaderSpeciesId: string;
  invaderName: string;
  invaderScientificName?: string;
  phaseLabel?: string;
  impactMechanisms?: string[];
  affectedSpecies?: Array<{
    speciesId: string;
    commonName: string;
    effect: string;
    populationDelta?: number;
  }>;
  simulatedNotes?: string[];
  explanationOnlyNotes?: string[];
}

function instancedArgs(count: number): [undefined, undefined, number] {
  return [undefined, undefined, Math.max(count, 1)];
}

function hashUnit(x: number, z: number, seed: number) {
  let value = Math.imul(x + seed * 131, 374761393);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= Math.imul(z + seed * 17, 668265263);
  value = Math.imul(value ^ (value >>> 16), 2246822519);
  return (value >>> 0) / 4294967295;
}

function colorHex(color: number) {
  return `#${new THREE.Color(color).getHexString()}`;
}

function terrainTopY(cell: TerrainCell) {
  return LAND_MIN_HEIGHT + cell.elevation * HEIGHT_SCALE;
}

function blendedWaterColor(depth: number, maxDepth: number, seedTone: number) {
  const t = Math.min(1, depth / Math.max(MIN_VISIBLE_WATER_DEPTH, maxDepth));
  const toneVar = 0.95 + seedTone * 0.1;
  const sR = (SHALLOW_WATER_HEX >> 16) & 255;
  const sG = (SHALLOW_WATER_HEX >> 8) & 255;
  const sB = SHALLOW_WATER_HEX & 255;
  const dR = (DEEP_WATER_HEX >> 16) & 255;
  const dG = (DEEP_WATER_HEX >> 8) & 255;
  const dB = DEEP_WATER_HEX & 255;
  return (
    (Math.min(255, Math.round((sR + (dR - sR) * t) * toneVar)) << 16) |
    (Math.min(255, Math.round((sG + (dG - sG) * t) * toneVar)) << 8) |
    Math.min(255, Math.round((sB + (dB - sB) * t) * toneVar))
  );
}

function variedFoliageColor(baseColor: number, cell: TerrainCell, seed: number) {
  const tone = 0.82 + hashUnit(cell.x * 41, cell.y * 53, seed) * 0.36;
  const red = Math.min(255, Math.round(((baseColor >> 16) & 255) * tone));
  const green = Math.min(255, Math.round(((baseColor >> 8) & 255) * tone));
  const blue = Math.min(255, Math.round((baseColor & 255) * tone));
  return (red << 16) | (green << 8) | blue;
}

function biomeLabel(biomeSuggestion: string) {
  return BIOME_LABELS[biomeSuggestion] ?? biomeSuggestion.replaceAll("-", " ");
}

function collectBiomes(grid: TerrainGrid) {
  const biomes = new Set<string>();
  let caveCells = 0;
  for (const row of grid.cells) {
    for (const cell of row) {
      biomes.add(cell.biomeSuggestion);
      if (cell.cave && cell.cave.type !== "none") caveCells += 1;
    }
  }
  // Micro-habitat: cavernas viram um pseudo-bioma para a fauna cavernícola entrar.
  if (caveCells >= 2) biomes.add("caverna");
  return Array.from(biomes);
}

function buildCompactFaunaGrid(grid: TerrainGrid): TerrainGrid {
  const biomeCells = new Map<string, TerrainCell>();

  for (const row of grid.cells) {
    for (const cell of row) {
      if (!biomeCells.has(cell.biomeSuggestion)) {
        biomeCells.set(cell.biomeSuggestion, cell);
      }
    }
  }

  const sourceCells = Array.from(biomeCells.values());
  const minWidth = 4;
  const minHeight = 4;
  const width = Math.max(minWidth, Math.ceil(Math.sqrt(sourceCells.length || 1)));
  const height = Math.max(minHeight, Math.ceil((sourceCells.length || 1) / width));
  const cells: TerrainCell[][] = [];

  for (let row = 0; row < height; row += 1) {
    const terrainRow: TerrainCell[] = [];

    for (let column = 0; column < width; column += 1) {
      const flatIndex = row * width + column;
      const template = sourceCells[flatIndex % sourceCells.length]!;
      terrainRow.push({
        ...template,
        x: column,
        y: row,
      });
    }

    cells.push(terrainRow);
  }

  return {
    width,
    height,
    seed: grid.seed,
    baseTemperatureC: grid.baseTemperatureC,
    basePrecipitationMm: grid.basePrecipitationMm,
    cells,
    simulationNote: "compact fauna payload",
  };
}

function scatter(cell: TerrainCell, seed: number, slot: number) {
  return {
    x: (hashUnit(cell.x * 19 + slot * 7, cell.y * 11, seed + 17) - 0.5) * 0.46,
    z: (hashUnit(cell.x * 13, cell.y * 23 + slot * 5, seed + 31) - 0.5) * 0.46,
    rotation: hashUnit(cell.x * 29 + slot * 3, cell.y * 17 + slot * 2, seed + 47) * Math.PI * 2,
    scale: 0.72 + hashUnit(cell.x * 37 + slot, cell.y * 31 + slot * 9, seed + 59) * 0.7,
  };
}

function usePopulateInstancedMesh(
  meshRef: React.RefObject<THREE.InstancedMesh>,
  instances: InstanceSpec[],
) {
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.count = instances.length;

    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index]!;
      tempObject.position.set(instance.x, instance.y, instance.z);
      tempObject.rotation.set(instance.rx ?? 0, instance.ry ?? 0, instance.rz ?? 0);
      tempObject.scale.set(instance.sx, instance.sy, instance.sz);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);
      mesh.setColorAt(index, tempColor.setHex(instance.color));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances, meshRef, tempColor, tempObject]);
}

const RIVER_NEIGHBORS_8: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];

// Centripetal-ish Catmull-Rom interpolation of one segment p1→p2 (p0,p3 = tangents).
/**
 * Turns the per-cell river field into a smooth, hierarchical network (A2):
 * 1. downstream tree (each cell flows to its lowest river neighbour);
 * 2. Strahler stream order → width hierarchy (wide trunk, thin tributaries);
 * 3. prune tiny disconnected fragments;
 * 4. emit one merged ribbon mesh of Catmull-Rom centerlines with a deterministic
 *    lateral meander, plus waterfall ribbons at steep drops.
 */
function buildRiverScene(nodes: Map<string, RiverNode>, seed: number, falls: InstanceSpec[]): RiverScene {
  if (nodes.size === 0) return { volumes: [], surfaces: [], wetBanks: [], falls };
  const keyOf = (gx: number, gy: number) => `${gx},${gy}`;

  // 1. Downstream tree + children.
  const downstream = new Map<string, string | null>();
  const children = new Map<string, string[]>();
  for (const [key, node] of nodes) {
    let best: RiverNode | null = null;
    for (const [dx, dy] of RIVER_NEIGHBORS_8) {
      const n = nodes.get(keyOf(node.gx + dx, node.gy + dy));
      if (!n) continue;
      if (n.surfaceY < node.surfaceY && (!best || n.surfaceY < best.surfaceY)) best = n;
    }
    const dkey = best ? keyOf(best.gx, best.gy) : null;
    downstream.set(key, dkey);
    if (dkey) children.set(dkey, [...(children.get(dkey) ?? []), key]);
  }

  // 2. Strahler order: children (higher) processed before parents (lower).
  const order = new Map<string, number>();
  const byHeight = [...nodes.entries()].sort((a, b) => b[1].surfaceY - a[1].surfaceY);
  let maxOrder = 1;
  for (const [key] of byHeight) {
    const kids = children.get(key) ?? [];
    if (kids.length === 0) {
      order.set(key, 1);
      continue;
    }
    let topOrder = 0;
    let topCount = 0;
    for (const c of kids) {
      const o = order.get(c) ?? 1;
      if (o > topOrder) {
        topOrder = o;
        topCount = 1;
      } else if (o === topOrder) {
        topCount += 1;
      }
    }
    const o = topCount >= 2 ? topOrder + 1 : topOrder;
    order.set(key, o);
    if (o > maxOrder) maxOrder = o;
  }

  // 3. Prune tiny disconnected fragments (8-adjacency components).
  const keep = new Set<string>();
  const seen = new Set<string>();
  for (const [key, node] of nodes) {
    if (seen.has(key)) continue;
    const stack = [key];
    const comp: string[] = [];
    seen.add(key);
    while (stack.length) {
      const k = stack.pop()!;
      comp.push(k);
      const n = nodes.get(k)!;
      for (const [dx, dy] of RIVER_NEIGHBORS_8) {
        const nk = keyOf(n.gx + dx, n.gy + dy);
        if (nodes.has(nk) && !seen.has(nk)) {
          seen.add(nk);
          stack.push(nk);
        }
      }
    }
    if (comp.length >= RIVER_MIN_COMPONENT_CELLS) for (const k of comp) keep.add(k);
    void node;
  }

  const depthOf = (key: string) => {
    const o = order.get(key) ?? 1;
    const t = maxOrder > 1 ? (o - 1) / (maxOrder - 1) : 0;
    return RIVER_SURFACE_LIFT + 0.16 * t + 0.07 * (nodes.get(key)!.flow ?? 0);
  };
  const waterYOf = (key: string, n = nodes.get(key)!) => {
    const belowBank = n.bankY - WATER_BANK_RECESS;
    return Math.max(n.surfaceY + 0.04, Math.min(n.surfaceY + depthOf(key), belowBank));
  };

  const volumes: InstanceSpec[] = [];
  const surfaces: InstanceSpec[] = [];
  const wetBanks: InstanceSpec[] = [];

  for (const key of keep) {
    const node = nodes.get(key);
    if (!node) continue;
    const waterY = waterYOf(key, node);
    const depth = Math.max(0.04, waterY - node.surfaceY);
    const color = blendedWaterColor(depth, 0.42, hashUnit(node.gx, node.gy, seed + 1147));
    const orderScale = Math.min(1, 0.92 + (order.get(key) ?? 1) * 0.03);
    volumes.push({
      x: node.wx,
      y: node.surfaceY + depth / 2,
      z: node.wz,
      sx: WATER_SIZE * orderScale,
      sy: depth,
      sz: WATER_SIZE * orderScale,
      color,
    });
    surfaces.push({
      x: node.wx,
      y: waterY + 0.006,
      z: node.wz,
      sx: WATER_SIZE * orderScale,
      sy: WATER_SIZE * orderScale,
      sz: 1,
      rx: -Math.PI / 2,
      color,
    });
    wetBanks.push({
      x: node.wx,
      y: Math.max(node.surfaceY + 0.01, waterY - 0.018),
      z: node.wz,
      sx: WATER_SIZE,
      sy: 0.025,
      sz: WATER_SIZE,
      color: RIVER_WET_BANK_HEX,
    });
  }

  for (const [key, node] of nodes) {
    if (!keep.has(key)) continue;
    const dKey = downstream.get(key);
    if (!dKey || !keep.has(dKey)) continue;
    const ds = nodes.get(dKey)!;

    // Catmull-Rom control points: upstream tangent → node → ds → downstream tangent.
    // Waterfall ribbon at a steep connected drop (now falling into a real channel).
    const drop = Math.abs(node.surfaceY - ds.surfaceY);
    if (drop > RIVER_WATERFALL_DROP) {
      const lower = node.surfaceY < ds.surfaceY ? node : ds;
      const angle = Math.atan2(ds.wx - node.wx, ds.wz - node.wz);
      falls.push({
        x: (node.wx + ds.wx) / 2,
        y: waterYOf(keyOf(lower.gx, lower.gy), lower) + drop / 2,
        z: (node.wz + ds.wz) / 2,
        sx: WATER_SIZE * 0.82,
        sy: drop,
        sz: 0.06,
        ry: angle,
        color: 0xdff3fb,
      });
    }
  }

  return { volumes, surfaces, wetBanks, falls };
}

function buildSceneData(grid: TerrainGrid): SceneData {
  const halfWidth = (grid.width - 1) / 2;
  const halfHeight = (grid.height - 1) / 2;
  const worldRadius = Math.max(grid.width * CELL_SIZE, grid.height * CELL_SIZE);

  const land: HoverableInstance[] = [];
  const water: HoverableInstance[] = [];
  const pineTrunks: InstanceSpec[] = [];
  const pineCanopies: InstanceSpec[] = [];
  const broadleafTrunks: InstanceSpec[] = [];
  const broadleafCanopies: InstanceSpec[] = [];
  const shrubs: InstanceSpec[] = [];
  const cactusBodies: InstanceSpec[] = [];
  const cactusArmsLeft: InstanceSpec[] = [];
  const cactusArmsRight: InstanceSpec[] = [];
  const rocks: InstanceSpec[] = [];
  const objStones: InstanceSpec[] = [];
  const objLogs: InstanceSpec[] = [];
  const objFoliage: InstanceSpec[] = [];
  const objBlocks: InstanceSpec[] = [];
  const objCrystals: InstanceSpec[] = [];
  const objWaterfalls: InstanceSpec[] = [];
  const waterSurfaces: InstanceSpec[] = [];
  const caves: CaveInstance[] = [];
  const caveTunnels: CaveTunnel[] = [];
  const riverFalls: InstanceSpec[] = [];
  const reliefMarkers: ReliefMarker[] = [];
  // Collected during the cell loop, resolved into geometry afterwards.
  const caveByKey = new Map<string, CaveInstance>();
  const riverNodes = new Map<string, RiverNode>();

  // Pre-pass: vegetation is cleared on entrance cells and thinned around them so
  // the cave mouth is never hidden by trees. Value is a 0–1 vegetation scale.
  const entranceClear = new Map<string, number>();
  for (const row of grid.cells) {
    for (const cell of row) {
      const isEntrance = cell.cave && cell.cave.type !== "none" && cell.objects?.includes("cave-entrance");
      if (!isEntrance) continue;
      entranceClear.set(`${cell.x},${cell.y}`, 0);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const key = `${cell.x + dx},${cell.y + dy}`;
          entranceClear.set(key, Math.min(entranceClear.get(key) ?? 1, 0.35));
        }
      }
    }
  }
  const legend = new Map<string, string>();
  const objectLegend = new Map<string, string>();
  const waterElevations = grid.cells.flatMap((row) => row.filter((cell) => cell.isWater).map((cell) => cell.elevation));
  const fallbackWaterSurfaceY =
    waterElevations.length > 0
      ? LAND_MIN_HEIGHT + Math.max(...waterElevations) * HEIGHT_SCALE + MIN_VISIBLE_WATER_DEPTH
      : LAND_MIN_HEIGHT + MIN_VISIBLE_WATER_DEPTH;

  function minNeighborLandTop(cell: TerrainCell, skipRiverCells = false): number {
    let minBank = Number.POSITIVE_INFINITY;
    for (const [dx, dy] of RIVER_NEIGHBORS_8) {
      const nx = cell.x + dx;
      const ny = cell.y + dy;
      if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
      const neighbor = grid.cells[ny]![nx]!;
      if (skipRiverCells && neighbor.waterFlow && neighbor.waterFlow > RIVER_FLOW_MIN) continue;
      if (!neighbor.isWater) minBank = Math.min(minBank, terrainTopY(neighbor));
    }
    return Number.isFinite(minBank) ? minBank : fallbackWaterSurfaceY + WATER_BANK_RECESS;
  }

  // Pushes a procedural object instance into the right geometry batch.
  function pushObject(type: string, surfaceY: number, ox: number, oz: number, h: number, seed: number) {
    const color = OBJECT_COLORS[type] ?? FALLBACK_COLOR;
    const jx = (hashUnit(ox * 53, oz * 29, seed + 401) - 0.5) * 0.5;
    const jz = (hashUnit(ox * 17, oz * 41, seed + 409) - 0.5) * 0.5;
    const ry = hashUnit(ox * 31, oz * 13, seed + 419) * Math.PI * 2;
    const s = 0.7 + hashUnit(ox * 23, oz * 37, seed + 421) * 0.6;
    const px = ox + jx;
    const pz = oz + jz;
    objectLegend.set(OBJECT_LABELS[type] ?? type, colorHex(color));

    switch (type) {
      case "rock":
      case "boulder": {
        const r = (type === "boulder" ? 0.2 : 0.12) * s;
        objStones.push({ x: px, y: surfaceY + r * 0.8, z: pz, sx: r, sy: r, sz: r, ry, color });
        break;
      }
      case "fallen-log": {
        const len = 0.42 * s;
        objLogs.push({
          x: px, y: surfaceY + 0.07, z: pz,
          sx: 0.08 * s, sy: len, sz: 0.08 * s,
          rx: Math.PI / 2, ry, color,
        });
        break;
      }
      case "dead-tree": {
        const tall = 0.55 * s;
        objLogs.push({ x: px, y: surfaceY + tall / 2, z: pz, sx: 0.06 * s, sy: tall, sz: 0.06 * s, ry, color });
        break;
      }
      case "bush": {
        const r = 0.17 * s;
        objFoliage.push({ x: px, y: surfaceY + r * 0.8, z: pz, sx: r, sy: r * 0.85, sz: r, ry, color });
        break;
      }
      case "mushroom": {
        const r = 0.08 * s;
        objFoliage.push({ x: px, y: surfaceY + r, z: pz, sx: r, sy: r * 0.8, sz: r, ry, color });
        break;
      }
      case "bones":
      case "cliff-ledge":
      case "burrow":
      case "nest": {
        const w = (type === "cliff-ledge" ? 0.34 : 0.16) * s;
        const hgt = type === "cliff-ledge" ? 0.06 * s : type === "bones" ? 0.05 * s : 0.07 * s;
        objBlocks.push({ x: px, y: surfaceY + hgt / 2, z: pz, sx: w, sy: hgt, sz: w * 0.8, ry, color });
        break;
      }
      case "crystal": {
        const tall = 0.22 * s;
        objCrystals.push({ x: px, y: surfaceY + tall / 2, z: pz, sx: 0.08 * s, sy: tall, sz: 0.08 * s, ry, color });
        break;
      }
      case "waterfall": {
        objWaterfalls.push({
          x: px, y: surfaceY + (h * 0.4) / 2, z: pz,
          sx: 0.16 * s, sy: Math.max(0.4, h * 0.4), sz: 0.06 * s, ry, color,
        });
        break;
      }
      default:
        break;
    }
  }

  for (const row of grid.cells) {
    for (const cell of row) {
      const x = (cell.x - halfWidth) * CELL_SIZE;
      const z = (cell.y - halfHeight) * CELL_SIZE;
      const baseColor = BIOME_COLORS[cell.biomeSuggestion] ?? FALLBACK_COLOR;

      if (cell.isWater) {
        const floorY = terrainTopY(cell);
        const bankY = minNeighborLandTop(cell);
        const surfaceY = Math.max(
          floorY + 0.04,
          Math.min(fallbackWaterSurfaceY, bankY - WATER_BANK_RECESS),
        );
        const depth = Math.max(0.04, surfaceY - floorY);
        const waterColor = blendedWaterColor(depth, WATER_HEIGHT * 2.6, hashUnit(cell.x * 41, cell.y * 53, grid.seed));
        water.push({
          cell,
          x,
          y: floorY + depth / 2,
          z,
          sx: WATER_SIZE,
          sy: depth,
          sz: WATER_SIZE,
          color: waterColor,
          tooltipY: surfaceY + 0.65,
        });
        waterSurfaces.push({
          x,
          y: surfaceY + 0.006,
          z,
          sx: WATER_SIZE,
          sy: WATER_SIZE,
          sz: 1,
          rx: -Math.PI / 2,
          color: waterColor,
        });
        legend.set(biomeLabel(cell.biomeSuggestion), colorHex(SHALLOW_WATER_HEX));

        // Juncos/plantas aquáticas esparsas na lâmina d'água.
        if (cell.objects?.includes("bush")) {
          pushObject("bush", surfaceY, x, z, 0.3, grid.seed + 901);
        }
        continue;
      }

      const height = terrainTopY(cell);
      land.push({
        cell,
        x,
        y: height / 2,
        z,
        sx: LAND_SIZE,
        sy: height,
        sz: LAND_SIZE,
        color: baseColor,
        tooltipY: height + 1.1,
      });
      legend.set(biomeLabel(cell.biomeSuggestion), colorHex(baseColor));
      const caveInfo = cell.cave && cell.cave.type !== "none" ? cell.cave : null;
      // Thin/clear vegetation on and around visible cave entrances.
      const vegScale = entranceClear.get(`${cell.x},${cell.y}`) ?? 1;

      const forestBiome =
        cell.biomeSuggestion === "floresta-tropical-seca" ||
        cell.biomeSuggestion === "floresta-tropical-umida" ||
        cell.biomeSuggestion === "mata-atlantica" ||
        cell.biomeSuggestion === "manguezal" ||
        cell.biomeSuggestion === "pantanal";
      const grassBiome =
        cell.biomeSuggestion === "savana-tropical" ||
        cell.biomeSuggestion === "cerrado" ||
        cell.biomeSuggestion === "pradaria-estepe" ||
        cell.biomeSuggestion === "chaparral";
      const desertBiome =
        cell.biomeSuggestion === "deserto-quente" || cell.biomeSuggestion === "caatinga";
      const iceBiome =
        cell.biomeSuggestion === "antartida" ||
        cell.biomeSuggestion === "montanha-nevada";
      const mountainBiome =
        cell.biomeSuggestion === "tundra" ||
        cell.biomeSuggestion === "deserto-frio" ||
        cell.biomeSuggestion === "montanha" ||
        iceBiome ||
        cell.elevation > 0.84;

      if (cell.biomeSuggestion === "taiga") {
        const seedRoll = hashUnit(cell.x, cell.y, grid.seed + 71);
        const count = caveInfo ? 0 : Math.round((seedRoll < 0.38 ? 2 : seedRoll < 0.78 ? 1 : 0) * vegScale);

        for (let slot = 0; slot < count; slot += 1) {
          const placement = scatter(cell, grid.seed + 79, slot);
          const trunkHeight = 0.42 * placement.scale;
          const canopyHeight = 0.88 * placement.scale;
          pineTrunks.push({
            x: x + placement.x,
            y: height + trunkHeight / 2,
            z: z + placement.z,
            sx: 0.11 * placement.scale,
            sy: trunkHeight,
            sz: 0.11 * placement.scale,
            ry: placement.rotation,
            color: 0x765840,
          });
          pineCanopies.push({
            x: x + placement.x,
            y: height + trunkHeight + canopyHeight / 2 - 0.04,
            z: z + placement.z,
            sx: 0.46 * placement.scale,
            sy: canopyHeight,
            sz: 0.46 * placement.scale,
            ry: placement.rotation,
            color: variedFoliageColor(0x4d7040, cell, grid.seed + 211 + slot),
          });
        }
      } else if (forestBiome) {
        const forestDensity =
          cell.biomeSuggestion === "floresta-tropical-umida" ? 2.5 : 1.8;
        const count = caveInfo ? 0 : Math.floor(forestDensity * hashUnit(cell.x, cell.y, grid.seed + 103) * vegScale);

        for (let slot = 0; slot < count; slot += 1) {
          const placement = scatter(cell, grid.seed + 109, slot);
          const trunkHeight = 0.38 * placement.scale;
          const crownSize = 0.4 * placement.scale;
          broadleafTrunks.push({
            x: x + placement.x,
            y: height + trunkHeight / 2,
            z: z + placement.z,
            sx: 0.12 * placement.scale,
            sy: trunkHeight,
            sz: 0.12 * placement.scale,
            ry: placement.rotation,
            color: 0x7d5b41,
          });
          broadleafCanopies.push({
            x: x + placement.x,
            y: height + trunkHeight + crownSize * 0.9,
            z: z + placement.z,
            sx: crownSize,
            sy: crownSize * 0.92,
            sz: crownSize,
            ry: placement.rotation,
            color: variedFoliageColor(
              cell.biomeSuggestion === "floresta-tropical-umida" ? 0x3f844f : 0x62804a,
              cell,
              grid.seed + 223 + slot,
            ),
          });
        }
      } else if (grassBiome) {
        const seedRoll = hashUnit(cell.x, cell.y, grid.seed + 131);
        const count = caveInfo ? 0 : Math.round((seedRoll < 0.34 ? 2 : seedRoll < 0.7 ? 1 : 0) * vegScale);

        for (let slot = 0; slot < count; slot += 1) {
          const placement = scatter(cell, grid.seed + 139, slot);
          shrubs.push({
            x: x + placement.x,
            y: height + 0.18 * placement.scale,
            z: z + placement.z,
            sx: 0.18 * placement.scale,
            sy: 0.15 * placement.scale,
            sz: 0.18 * placement.scale,
            ry: placement.rotation,
            color: variedFoliageColor(
              cell.biomeSuggestion === "cerrado" ? 0x8b7a3a : 0x7f964c,
              cell,
              grid.seed + 239 + slot,
            ),
          });
        }
      } else if (desertBiome) {
        if (!caveInfo && hashUnit(cell.x, cell.y, grid.seed + 151) < 0.22 * vegScale) {
          const placement = scatter(cell, grid.seed + 157, 0);
          const bodyHeight = 0.48 * placement.scale;
          cactusBodies.push({
            x: x + placement.x,
            y: height + bodyHeight / 2,
            z: z + placement.z,
            sx: 0.16 * placement.scale,
            sy: bodyHeight,
            sz: 0.16 * placement.scale,
            ry: placement.rotation,
            color: 0x618245,
          });
          cactusArmsLeft.push({
            x: x + placement.x - 0.12 * placement.scale,
            y: height + bodyHeight * 0.64,
            z: z + placement.z,
            sx: 0.08 * placement.scale,
            sy: 0.24 * placement.scale,
            sz: 0.08 * placement.scale,
            rx: 0,
            ry: placement.rotation,
            rz: Math.PI / 2.9,
            color: 0x678849,
          });
          cactusArmsRight.push({
            x: x + placement.x + 0.12 * placement.scale,
            y: height + bodyHeight * 0.72,
            z: z + placement.z,
            sx: 0.08 * placement.scale,
            sy: 0.21 * placement.scale,
            sz: 0.08 * placement.scale,
            rx: 0,
            ry: placement.rotation,
            rz: -Math.PI / 3.2,
            color: 0x6b8f4d,
          });
        }
      }

      // Ice biomes get denser, taller white-blue formations; rocky biomes keep sparse stones.
      const rockChance = iceBiome ? 0.62 : 0.42;
      if (mountainBiome && hashUnit(cell.x, cell.y, grid.seed + 181) < rockChance) {
        const count = hashUnit(cell.x, cell.y, grid.seed + 191) < 0.24 ? 2 : 1;

        for (let slot = 0; slot < count; slot += 1) {
          const placement = scatter(cell, grid.seed + 197, slot);
          const formationSize = (iceBiome ? 0.22 : 0.18) * placement.scale;
          const rockColor = iceBiome
            ? variedFoliageColor(0xd6e6f0, cell, grid.seed + 251 + slot)
            : cell.biomeSuggestion === "tundra"
            ? 0xaeb8bc
            : 0x8f867d;
          rocks.push({
            x: x + placement.x,
            y: height + formationSize * 0.9,
            z: z + placement.z,
            sx: formationSize,
            sy: formationSize,
            sz: formationSize,
            ry: placement.rotation,
            color: rockColor,
          });
        }
      }

      // ─── Procedural objects (etapa 4 render) ──────────────────────────────────
      if (cell.objects && cell.objects.length > 0) {
        for (let slot = 0; slot < cell.objects.length; slot += 1) {
          const type = cell.objects[slot]!;
          if (type === "cave-entrance") continue; // rendered by the cave layer
          pushObject(type, height, x, z, height, grid.seed + 977 + slot * 13);
        }
      }

      // ─── Cave cells: collect entrance + internal cells with metadata ──────────
      if (caveInfo) {
        const openness = caveInfo.openness ?? 0.3;
        const depth = caveInfo.depth ?? 0.4;
        const mouthR = 0.22 + openness * 0.28;
        const isEntrance = caveInfo.isEntrance !== false && (cell.objects?.includes("cave-entrance") ?? true);
        const caveColor =
          caveInfo.type === "river-cave"
            ? 0x0f3141
            : caveInfo.type === "deep-cave" || caveInfo.type === "karst-system"
              ? 0x120f0e
              : 0x1c1713;
        const caveInstance: CaveInstance = {
          x,
          y: height + 0.08,
          z,
          sx: mouthR,
          sy: 0.08,
          sz: 0.2 + depth * 0.32,
          rx: 0,
          color: caveColor,
          type: caveInfo.type,
          depth,
          openness,
          humidity: caveInfo.humidity ?? 0.3,
          darkness: caveInfo.darkness ?? 0.6,
          systemId: caveInfo.systemId,
          connectedTo: caveInfo.connectedTo,
          isEntrance,
          role: caveInfo.role,
          gridX: cell.x,
          gridY: cell.y,
          surfaceY: height,
        };
        caves.push(caveInstance);
        caveByKey.set(`${cell.x},${cell.y}`, caveInstance);
        if (isEntrance) {
          objectLegend.set(
            caveInfo.type === "river-cave" ? "cavernas com agua" : "entradas de caverna",
            colorHex(caveColor),
          );
        }
      }

      // ─── River cells: collect for continuous-channel reconstruction ───────────
      // Higher threshold than before so trickles disappear and only real streams stay.
      if (cell.waterFlow && cell.waterFlow > RIVER_FLOW_MIN) {
        riverNodes.set(`${cell.x},${cell.y}`, {
          gx: cell.x,
          gy: cell.y,
          wx: x,
          wz: z,
          surfaceY: height,
          bankY: minNeighborLandTop(cell, true),
          flow: Math.min(1, cell.waterFlow),
        });
      }

      // ─── Relief markers (Relief layer): highlight cliffs, mountains, ledges ────
      const band = cell.altitudeBand;
      const isCliff = band === "cliff" || cell.objects?.includes("cliff-ledge");
      const isMountain = band === "mountain" || cell.elevation > 0.84;
      const isHill = band === "hill" || cell.elevation > 0.62;
      if (isCliff || isMountain || isHill) {
        const markerBand: ReliefMarker["band"] = isCliff ? "cliff" : isMountain ? "mountain" : "hill";
        const reliefColor = isCliff ? 0xd8542f : isMountain ? 0xe39a3c : 0xc9c06a;
        reliefMarkers.push({
          x,
          y: height + 0.12,
          z,
          sx: LAND_SIZE * 0.46,
          sy: LAND_SIZE * 0.46,
          sz: 1,
          rx: Math.PI / 2,
          color: reliefColor,
          band: markerBand,
        });
      }
    }
  }

  // ─── Cave tunnels: link connected cave cells (same system) for x-ray view ─────
  const seenTunnels = new Set<string>();
  for (const cave of caves) {
    const links = cave.connectedTo ?? [];
    for (const otherKey of links) {
      const other = caveByKey.get(otherKey);
      if (!other) continue;
      const pairKey =
        `${cave.gridX},${cave.gridY}` < otherKey
          ? `${cave.gridX},${cave.gridY}|${otherKey}`
          : `${otherKey}|${cave.gridX},${cave.gridY}`;
      if (seenTunnels.has(pairKey)) continue;
      seenTunnels.add(pairKey);
      const roomA = cave.surfaceY - 0.4 - cave.depth * HEIGHT_SCALE * 0.4;
      const roomB = other.surfaceY - 0.4 - other.depth * HEIGHT_SCALE * 0.4;
      caveTunnels.push({
        ax: cave.x,
        ay: roomA,
        az: cave.z,
        bx: other.x,
        by: roomB,
        bz: other.z,
        river: cave.type === "river-cave" || other.type === "river-cave",
        systemId: cave.systemId,
      });
    }
  }

  // ─── River network (A2): downstream tree → Strahler order → meandering ribbon ──
  const riverScene = buildRiverScene(riverNodes, grid.seed, riverFalls);

  return {
    land,
    water,
    legend: Array.from(legend.entries()).map(([label, color]) => ({ label, color })),
    vegetation: {
      pineTrunks,
      pineCanopies,
      broadleafTrunks,
      broadleafCanopies,
      shrubs,
      cactusBodies,
      cactusArmsLeft,
      cactusArmsRight,
      rocks,
    },
    objects: {
      stones: objStones,
      logs: objLogs,
      foliage: objFoliage,
      blocks: objBlocks,
      crystals: objCrystals,
      waterfalls: objWaterfalls,
    },
    objectLegend: Array.from(objectLegend.entries()).map(([label, color]) => ({ label, color })),
    waterSurfaces,
    caves,
    caveTunnels,
    rivers: riverScene,
    reliefMarkers,
    worldRadius,
    fogDensity: 0.006 / Math.max(0.85, Math.sqrt(worldRadius / 18)),
  };
}

function TerrainColumns({
  sceneData,
  gradientMap,
  terrainOpacity = 1,
  onInspect,
}: {
  sceneData: SceneData;
  gradientMap: THREE.DataTexture;
  terrainOpacity?: number;
  onInspect: (cell: TerrainCell, position: [number, number, number], biomeLabel: string) => void;
}) {
  const landRef = useRef<THREE.InstancedMesh>(null!);
  const waterRef = useRef<THREE.InstancedMesh>(null!);
  const hoverRef = useRef<{ kind: "land" | "water" | null; index: number }>({
    kind: null,
    index: -1,
  });
  const tempColor = useMemo(() => new THREE.Color(), []);

  usePopulateInstancedMesh(landRef, sceneData.land);

  function updateHover(kind: "land" | "water", index: number) {
    // Only visual highlight; do not expose textual tooltip on hover.
    const sameHover = hoverRef.current.kind === kind && hoverRef.current.index === index;
    if (sameHover) return;

    if (hoverRef.current.kind) {
      const previousPool = hoverRef.current.kind === "land" ? sceneData.land : sceneData.water;
      const previousRef = hoverRef.current.kind === "land" ? landRef : waterRef;
      const previousMesh = previousRef.current;

      const previousInstance = previousPool[hoverRef.current.index];

      if (previousMesh && previousInstance) {
        previousMesh.setColorAt(
          hoverRef.current.index,
          tempColor.setHex(previousInstance.color),
        );
        if (previousMesh.instanceColor) previousMesh.instanceColor.needsUpdate = true;
      }
    }

    const pool = kind === "land" ? sceneData.land : sceneData.water;
    const meshRef = kind === "land" ? landRef : waterRef;
    const mesh = meshRef.current;
    const hoveredInstance = pool[index];

    if (!mesh || !hoveredInstance) {
      hoverRef.current = { kind: null, index: -1 };
      return;
    }

    mesh.setColorAt(index, tempColor.setHex(HOVER_COLOR));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    hoverRef.current = { kind, index };
  }

  function clearHover() {
    if (!hoverRef.current.kind) {
      return;
    }

    const pool = hoverRef.current.kind === "land" ? sceneData.land : sceneData.water;
    const meshRef = hoverRef.current.kind === "land" ? landRef : waterRef;
    const mesh = meshRef.current;
    const previousInstance = pool[hoverRef.current.index];

    if (mesh && previousInstance) {
      mesh.setColorAt(hoverRef.current.index, tempColor.setHex(previousInstance.color));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    hoverRef.current = { kind: null, index: -1 };
  }

    return (
    <>
      <instancedMesh
        ref={landRef}
        args={instancedArgs(sceneData.land.length)}
        castShadow
        receiveShadow
        onPointerMove={(event) => {
          event.stopPropagation();
          if (typeof event.instanceId === "number") updateHover("land", event.instanceId);
        }}
        onPointerOut={clearHover}
        onPointerDown={(event) => {
          // Inspect only with Ctrl (Windows/Linux) or Cmd (Mac)
          if (!(event.ctrlKey || event.metaKey)) return;
          event.stopPropagation();
          if (typeof event.instanceId === "number") {
            const inst = sceneData.land[event.instanceId];
            if (inst) onInspect(inst.cell, [inst.x, inst.tooltipY, inst.z], biomeLabel(inst.cell.biomeSuggestion));
          }
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial gradientMap={gradientMap} transparent={terrainOpacity < 0.99} opacity={terrainOpacity} />
      </instancedMesh>

      <WaterLayer
        sceneData={sceneData}
        gradientMap={gradientMap}
        waterRef={waterRef}
        updateHover={updateHover}
        clearHover={clearHover}
        onInspect={(inst: HoverableInstance) => onInspect(inst.cell, [inst.x, inst.tooltipY, inst.z], biomeLabel(inst.cell.biomeSuggestion))}
      />
    </>
  );
}

function WaterDepthVolumes({
  sceneData,
  gradientMap,
  waterRef,
  updateHover,
  clearHover,
  onInspect,
}: {
  // optional inspect handler for water instances
  sceneData: SceneData;
  gradientMap: THREE.DataTexture;
  waterRef: React.RefObject<THREE.InstancedMesh>;
  updateHover: (kind: "land" | "water", index: number) => void;
  clearHover: () => void;
  onInspect?: (inst: HoverableInstance) => void;
}) {
  usePopulateInstancedMesh(waterRef, sceneData.water);

  return (
    <instancedMesh
      ref={waterRef}
      args={instancedArgs(sceneData.water.length)}
      receiveShadow
      onPointerMove={(event) => {
        event.stopPropagation();
        if (typeof event.instanceId === "number") updateHover("water", event.instanceId);
      }}
      onPointerOut={clearHover}
      onPointerDown={(event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        event.stopPropagation();
        if (typeof event.instanceId === "number" && typeof onInspect === "function") {
          const inst = sceneData.water[event.instanceId];
          if (inst) onInspect(inst);
        }
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshToonMaterial gradientMap={gradientMap} />
    </instancedMesh>
  );
}


function WaterSurfaceTiles({ surfaces }: { surfaces: InstanceSpec[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const normalTexture = useTexture("/textures/waternormals.jpg");
  const normalScale = useMemo(() => new THREE.Vector2(0.18, 0.18), []);
  usePopulateInstancedMesh(ref, surfaces);

  useLayoutEffect(() => {
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(1.2, 1.2);
  }, [normalTexture]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    normalTexture.offset.x = t * 0.025;
    normalTexture.offset.y = t * 0.017;
  });

  return (
    <instancedMesh ref={ref} args={instancedArgs(surfaces.length)} receiveShadow>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial
        transparent
        opacity={0.74}
        roughness={0.32}
        metalness={0}
        normalMap={normalTexture}
        normalScale={normalScale}
        side={THREE.DoubleSide}
        depthWrite={false}
        vertexColors
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </instancedMesh>
  );
}

function WaterLayer({
  sceneData,
  gradientMap,
  waterRef,
  updateHover,
  clearHover,
  onInspect,
}: {
  sceneData: SceneData;
  gradientMap: THREE.DataTexture;
  waterRef: React.RefObject<THREE.InstancedMesh>;
  updateHover: (kind: "land" | "water", index: number) => void;
  clearHover: () => void;
  onInspect?: (inst: HoverableInstance) => void;
}) {
  return (
    <>
      <WaterDepthVolumes
        sceneData={sceneData}
        gradientMap={gradientMap}
        waterRef={waterRef}
        updateHover={updateHover}
        clearHover={clearHover}
        onInspect={onInspect}
      />
      <Suspense fallback={null}>
        <WaterSurfaceTiles surfaces={sceneData.waterSurfaces} />
      </Suspense>
    </>
  );
}

function VegetationField({
  sceneData,
  gradientMap,
  opacity,
}: {
  sceneData: SceneData;
  gradientMap: THREE.DataTexture;
  opacity: number;
}) {
  const pineTrunksRef = useRef<THREE.InstancedMesh>(null!);
  const pineCanopiesRef = useRef<THREE.InstancedMesh>(null!);
  const broadleafTrunksRef = useRef<THREE.InstancedMesh>(null!);
  const broadleafCanopiesRef = useRef<THREE.InstancedMesh>(null!);
  const shrubsRef = useRef<THREE.InstancedMesh>(null!);
  const cactusBodiesRef = useRef<THREE.InstancedMesh>(null!);
  const cactusArmsLeftRef = useRef<THREE.InstancedMesh>(null!);
  const cactusArmsRightRef = useRef<THREE.InstancedMesh>(null!);
  const rocksRef = useRef<THREE.InstancedMesh>(null!);

  usePopulateInstancedMesh(pineTrunksRef, sceneData.vegetation.pineTrunks);
  usePopulateInstancedMesh(pineCanopiesRef, sceneData.vegetation.pineCanopies);
  usePopulateInstancedMesh(broadleafTrunksRef, sceneData.vegetation.broadleafTrunks);
  usePopulateInstancedMesh(broadleafCanopiesRef, sceneData.vegetation.broadleafCanopies);
  usePopulateInstancedMesh(shrubsRef, sceneData.vegetation.shrubs);
  usePopulateInstancedMesh(cactusBodiesRef, sceneData.vegetation.cactusBodies);
  usePopulateInstancedMesh(cactusArmsLeftRef, sceneData.vegetation.cactusArmsLeft);
  usePopulateInstancedMesh(cactusArmsRightRef, sceneData.vegetation.cactusArmsRight);
  usePopulateInstancedMesh(rocksRef, sceneData.vegetation.rocks);
  const materialProps = { transparent: opacity < 0.99, opacity };

  return (
    <group visible={opacity > 0.05}>
      <instancedMesh
        ref={pineTrunksRef}
        args={instancedArgs(sceneData.vegetation.pineTrunks.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={pineCanopiesRef}
        args={instancedArgs(sceneData.vegetation.pineCanopies.length)}
        castShadow
      >
        <coneGeometry args={[1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafTrunksRef}
        args={instancedArgs(sceneData.vegetation.broadleafTrunks.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafCanopiesRef}
        args={instancedArgs(sceneData.vegetation.broadleafCanopies.length)}
        castShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={shrubsRef}
        args={instancedArgs(sceneData.vegetation.shrubs.length)}
        castShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={cactusBodiesRef}
        args={instancedArgs(sceneData.vegetation.cactusBodies.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={cactusArmsLeftRef}
        args={instancedArgs(sceneData.vegetation.cactusArmsLeft.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={cactusArmsRightRef}
        args={instancedArgs(sceneData.vegetation.cactusArmsRight.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
      <instancedMesh
        ref={rocksRef}
        args={instancedArgs(sceneData.vegetation.rocks.length)}
        castShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} {...materialProps} />
      </instancedMesh>
    </group>
  );
}

function ProceduralObjectsField({
  objects,
  gradientMap,
}: {
  objects: ObjectBatches;
  gradientMap: THREE.DataTexture;
}) {
  const stonesRef = useRef<THREE.InstancedMesh>(null!);
  const logsRef = useRef<THREE.InstancedMesh>(null!);
  const foliageRef = useRef<THREE.InstancedMesh>(null!);
  const blocksRef = useRef<THREE.InstancedMesh>(null!);
  const crystalsRef = useRef<THREE.InstancedMesh>(null!);
  const waterfallsRef = useRef<THREE.InstancedMesh>(null!);

  usePopulateInstancedMesh(stonesRef, objects.stones);
  usePopulateInstancedMesh(logsRef, objects.logs);
  usePopulateInstancedMesh(foliageRef, objects.foliage);
  usePopulateInstancedMesh(blocksRef, objects.blocks);
  usePopulateInstancedMesh(crystalsRef, objects.crystals);
  usePopulateInstancedMesh(waterfallsRef, objects.waterfalls);

  return (
    <>
      <instancedMesh ref={stonesRef} args={instancedArgs(objects.stones.length)} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh ref={logsRef} args={instancedArgs(objects.logs.length)} castShadow>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={instancedArgs(objects.foliage.length)} castShadow>
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh ref={blocksRef} args={instancedArgs(objects.blocks.length)} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh ref={crystalsRef} args={instancedArgs(objects.crystals.length)} castShadow>
        <coneGeometry args={[1, 1, 5]} />
        <meshStandardMaterial emissive="#1f6f78" emissiveIntensity={0.45} roughness={0.3} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={waterfallsRef} args={instancedArgs(objects.waterfalls.length)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial transparent opacity={0.55} roughness={0.2} />
      </instancedMesh>
    </>
  );
}

const caveBeaconColor = (type: CaveInstance["type"]) =>
  type === "river-cave" ? "#4cc6f0" : "#ffb74d";

// B4: stable deterministic hue per cave system, so distinct systems are separable.
function caveHue(systemId?: string): number {
  if (!systemId) return 0.08;
  let h = 2166136261;
  for (let i = 0; i < systemId.length; i += 1) {
    h ^= systemId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 360) / 360;
}
// Dark, cave-like tint carrying the system hue (river caves bias blue).
function caveSystemColor(cave: CaveInstance): THREE.Color {
  if (cave.type === "river-cave") return new THREE.Color().setHSL(0.55, 0.5, 0.32);
  return new THREE.Color().setHSL(caveHue(cave.systemId), 0.45, 0.26);
}

// Underground room geometry derived from a cave cell's depth/type.
function caveRoomShape(cave: CaveInstance) {
  const sink = cave.type === "sinkhole";
  const deep = cave.type === "deep-cave" || cave.type === "karst-system";
  const river = cave.type === "river-cave";
  const roomCenterY = cave.surfaceY - 0.4 - cave.depth * HEIGHT_SCALE * 0.4;
  const roomH = (sink ? 0.5 : 0.6 + cave.depth * 1.8) * (deep ? 1.35 : 1);
  const roomW = LAND_SIZE * (sink ? 0.42 : deep ? 1.05 : river ? 0.8 : cave.type === "shallow-den" ? 0.52 : 0.7);
  const roomTopY = roomCenterY + roomH / 2;
  const shaftH = Math.max(0.2, cave.surfaceY - roomTopY);
  const shaftR = sink ? 0.32 : 0.1 + cave.openness * 0.1;
  return { roomCenterY, roomH, roomW, shaftH, shaftR };
}

function CaveEntrances({
  caves,
  showMarkers,
}: {
  caves: CaveInstance[];
  showMarkers: boolean;
}) {
  const beaconRef = useRef<THREE.Group>(null);

  // The dark recessed mouth + an internal shadow disc read as a cave opening.
  // Subtle, optional locator ring (no tall light column) — pulses gently.
  useFrame(({ clock }) => {
    const group = beaconRef.current;
    if (!group) return;
    const t = clock.elapsedTime;
    group.children.forEach((child, index) => {
      const s = 1 + Math.sin(t * 2 + index * 0.7) * 0.12;
      child.scale.set(s, 1, s);
    });
  });

  return (
    <group>
      {caves.map((cave, index) => {
        const sink = cave.type === "sinkhole";
        const river = cave.type === "river-cave";
        const cliff = cave.type === "cliff-opening" || river;
        const tint = caveSystemColor(cave);
        const mouthW = cave.sx * (sink ? 1.8 : cliff ? 1.65 : 1.35);
        const throat = 0.34 + cave.depth * 0.42;
        const yaw = hashUnit(cave.gridX, cave.gridY, 331) * Math.PI * 2;
        return (
          <group key={`mouth-${cave.gridX}-${cave.gridY}-${index}`} position={[cave.x, cave.surfaceY - 0.1, cave.z]} rotation={[0, yaw, 0]}>
            <mesh position={[0, sink ? -0.16 : 0.05, cliff ? -0.1 : 0]} scale={[mouthW, sink ? throat * 0.8 : mouthW * 0.72, throat]}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshStandardMaterial color={river ? "#071f2a" : "#100d0b"} roughness={0.98} metalness={0} side={THREE.BackSide} />
            </mesh>
            <mesh position={[0, 0.02, 0]} scale={[mouthW * 1.3, 0.08, mouthW * (sink ? 1.18 : 0.86)]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial color="#0e0b09" roughness={0.98} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} scale={[mouthW * 1.1, mouthW * (sink ? 1.1 : 0.72), 1]}>
              <torusGeometry args={[1, 0.12, 8, 22]} />
              <meshStandardMaterial color={`#${tint.clone().offsetHSL(0, -0.12, 0.18).getHexString()}`} roughness={0.88} metalness={0.02} />
            </mesh>
            {cliff ? (
              <mesh position={[0, mouthW * 0.32, -0.08]} scale={[mouthW * 0.82, mouthW * 0.68, 0.12]}>
                <sphereGeometry args={[1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
                <meshStandardMaterial color="#16120f" roughness={0.95} side={THREE.DoubleSide} />
              </mesh>
            ) : null}
            {river ? (
              <mesh position={[0, 0.012, -0.04]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[mouthW * 1.45, throat * 1.6]} />
                <meshStandardMaterial color="#4ea8c8" transparent opacity={0.62} roughness={0.38} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        );
      })}

      {showMarkers ? (
        <group ref={beaconRef}>
          {caves.map((cave, index) => (
            <mesh
              key={`${cave.gridX}-${cave.gridY}-${index}`}
              position={[cave.x, cave.surfaceY + 0.6, cave.z]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[0.26, 0.04, 8, 20]} />
              <meshBasicMaterial color={caveBeaconColor(cave.type)} transparent opacity={0.7} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
}

// Quaternion-oriented translucent tube between two underground rooms.
function TunnelTube({
  a,
  b,
  color,
  emphasized,
}: {
  a: { x: number; y: number; z: number };
  b: { x: number; y: number; z: number };
  color: string;
  emphasized?: boolean;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(a.x, a.y, a.z);
    const end = new THREE.Vector3(b.x, b.y, b.z);
    const dir = new THREE.Vector3().subVectors(end, start);
    const len = Math.max(0.001, dir.length());
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { position: [mid.x, mid.y, mid.z] as [number, number, number], quaternion: quat, length: len };
  }, [a, b]);
  return (
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[emphasized ? 0.22 : 0.16, emphasized ? 0.22 : 0.16, length, 10, 1, true]} />
      <meshStandardMaterial color={color} transparent opacity={emphasized ? 0.5 : 0.32} roughness={0.94} side={THREE.BackSide} depthWrite={false} />
    </mesh>
  );
}

// X-ray blueprint of the subterranean structure (B2/B3/B4): role-typed volumes,
// depth-faded so deep chambers recede, per-system colour, and progressive
// disclosure — default shows entrances + subtle silhouettes; the selected system
// reveals full per-cell rings and brighter interiors.
function CaveInterior({
  caves,
  tunnels,
  selectedSystemId,
}: {
  caves: CaveInstance[];
  tunnels: CaveTunnel[];
  selectedSystemId: string | null;
}) {
  return (
    <group>
      {caves.map((cave, index) => {
        const { roomCenterY, roomH, roomW, shaftH, shaftR } = caveRoomShape(cave);
        const river = cave.type === "river-cave";
        const selected = selectedSystemId != null && cave.systemId === selectedSystemId;
        const tint = caveSystemColor(cave);
        // Depth fade: deeper chambers recede (lower opacity + darker), unless selected.
        const fade = 1 - Math.min(0.55, cave.depth * 0.55);
        const baseColor = tint.clone().multiplyScalar(selected ? 1.1 : fade);
        const roomOpacity = (selected ? 0.6 : 0.3) * (0.7 + fade * 0.5);
        const isChamber = cave.role === "chamber";
        const isTunnel = cave.role === "tunnel";
        const speleothemCount = isTunnel ? 1 : isChamber ? 5 : 3;
        return (
          <group key={`${cave.gridX}-${cave.gridY}-${index}`} position={[cave.x, 0, cave.z]}>
            {/* Entrance gets a bold dark shaft from the surface down to the room. */}
            {cave.isEntrance ? (
              <mesh position={[0, cave.surfaceY - shaftH / 2, 0]}>
                <cylinderGeometry args={[shaftR, shaftR * 0.9, shaftH, 10, 1, true]} />
                <meshStandardMaterial
                  color={tint.clone().multiplyScalar(0.5)}
                  transparent
                  opacity={selected ? 0.58 : 0.42}
                  depthWrite={false}
                  roughness={0.96}
                  side={THREE.BackSide}
                />
              </mesh>
            ) : null}
            <mesh position={[0, roomCenterY, 0]} scale={[isTunnel ? roomW * 0.45 : roomW * 0.72, roomH * 0.55, isTunnel ? roomW * 0.45 : roomW * 0.6]}>
              {isChamber ? (
                <sphereGeometry args={[1, 16, 10]} />
              ) : isTunnel ? (
                <sphereGeometry args={[1, 10, 8]} />
              ) : (
                <sphereGeometry args={[1, 14, 8]} />
              )}
              <meshStandardMaterial color={baseColor} transparent opacity={roomOpacity} roughness={0.98} side={THREE.BackSide} depthWrite={false} />
            </mesh>
            <mesh position={[0, roomCenterY - roomH * 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[roomW * (isTunnel ? 0.28 : 0.48), 18]} />
              <meshStandardMaterial color={baseColor.clone().multiplyScalar(0.45)} transparent opacity={selected ? 0.72 : 0.5} roughness={1} depthWrite={false} />
            </mesh>
            {Array.from({ length: speleothemCount }).map((_, pointIndex) => {
              const angle = hashUnit(cave.gridX * 17 + pointIndex, cave.gridY * 19, 700) * Math.PI * 2;
              const radius = roomW * (0.12 + hashUnit(cave.gridX * 23, cave.gridY * 29 + pointIndex, 701) * 0.28);
              const px = Math.cos(angle) * radius;
              const pz = Math.sin(angle) * radius;
              const h = 0.16 + hashUnit(cave.gridX * 31 + pointIndex, cave.gridY * 37, 702) * 0.34;
              const fromCeiling = pointIndex % 2 === 0;
              return (
                <mesh
                  key={`sp-${pointIndex}`}
                  position={[px, fromCeiling ? roomCenterY + roomH * 0.34 - h / 2 : roomCenterY - roomH * 0.42 + h / 2, pz]}
                  rotation={[fromCeiling ? Math.PI : 0, 0, 0]}
                >
                  <coneGeometry args={[0.045 + h * 0.08, h, 7]} />
                  <meshStandardMaterial color={baseColor.clone().offsetHSL(0, -0.08, 0.12)} transparent opacity={selected ? 0.75 : 0.48} roughness={0.95} depthWrite={false} />
                </mesh>
              );
            })}
            {isChamber || selected ? (
              <pointLight color="#f0b36d" intensity={selected ? 0.5 : 0.24} distance={roomW * 3.2} position={[0, roomCenterY - roomH * 0.12, 0]} />
            ) : null}
            {/* River caves keep a bright underground water plane. */}
            {river ? (
              <mesh position={[0, roomCenterY - roomH / 2 + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[roomW * 0.92, roomW * 0.92]} />
                <meshBasicMaterial color="#5fc6ef" transparent opacity={selected ? 0.6 : 0.45} depthTest={false} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            ) : null}
            {/* B3: surface ring only for entrances by default; full per-cell rings only
                for the selected system (progressive disclosure → kills ring spam). */}
            {cave.isEntrance || selected ? (
              <mesh position={[0, cave.surfaceY + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[roomW * 0.42, roomW * 0.58, 18]} />
                <meshBasicMaterial
                  color={river ? "#4cc6f0" : `#${tint.clone().offsetHSL(0, 0, 0.35).getHexString()}`}
                  transparent
                  opacity={selected ? 0.7 : cave.isEntrance ? 0.45 : 0.3}
                  depthTest={false}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ) : null}
          </group>
        );
      })}
      {tunnels.map((tunnel, index) => {
        const selected = selectedSystemId != null && tunnel.systemId === selectedSystemId;
        const color = tunnel.river
          ? "#3aa0c8"
          : `#${new THREE.Color().setHSL(caveHue(tunnel.systemId), 0.45, selected ? 0.45 : 0.28).getHexString()}`;
        return (
          <TunnelTube
            key={`tunnel-${index}`}
            a={{ x: tunnel.ax, y: tunnel.ay, z: tunnel.az }}
            b={{ x: tunnel.bx, y: tunnel.by, z: tunnel.bz }}
            color={color}
            emphasized={selected}
          />
        );
      })}
    </group>
  );
}

// Temporary pulsing halo over every cell of a clicked cave system (tinted by hue).
function CaveSystemHighlight({ caves }: { caves: CaveInstance[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const color = useMemo(
    () => `#${new THREE.Color().setHSL(caveHue(caves[0]?.systemId), 0.7, 0.62).getHexString()}`,
    [caves],
  );
  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2) * 0.14;
    group.children.forEach((child) => child.scale.set(pulse, 1, pulse));
  });
  return (
    <group ref={groupRef}>
      {caves.map((cave, index) => (
        <mesh
          key={`hl-${cave.gridX}-${cave.gridY}-${index}`}
          position={[cave.x, cave.surfaceY + 0.05, cave.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[LAND_SIZE * 0.4, LAND_SIZE * 0.62, 22]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

// Continuous river ribbon (A3): same water family as lakes/sea — a scrolling
// normal map suggests current; transparent + polygon-offset to avoid z-fighting
// against the carved banks. Built once from the merged spline geometry.
function RiverFalls({ falls }: { falls: InstanceSpec[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  usePopulateInstancedMesh(ref, falls);
  return (
    <instancedMesh ref={ref} args={instancedArgs(falls.length)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#dff3fb" transparent opacity={0.55} roughness={0.2} depthWrite={false} />
    </instancedMesh>
  );
}

function RiverDepthVolumes({ volumes }: { volumes: InstanceSpec[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  usePopulateInstancedMesh(ref, volumes);
  return (
    <instancedMesh ref={ref} args={instancedArgs(volumes.length)} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={0.58} roughness={0.5} metalness={0.02} vertexColors depthWrite={false} />
    </instancedMesh>
  );
}

function RiverWetBanks({ wetBanks }: { wetBanks: InstanceSpec[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  usePopulateInstancedMesh(ref, wetBanks);
  return (
    <instancedMesh ref={ref} args={instancedArgs(wetBanks.length)} receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial transparent opacity={0.42} roughness={0.86} metalness={0.02} vertexColors depthWrite={false} />
    </instancedMesh>
  );
}

function RiverOverlay({ rivers }: { rivers: RiverScene }) {
  return (
    <group>
      {rivers.volumes.length > 0 ? <RiverDepthVolumes volumes={rivers.volumes} /> : null}
      {rivers.wetBanks.length > 0 ? <RiverWetBanks wetBanks={rivers.wetBanks} /> : null}
      {rivers.surfaces.length > 0 ? (
        <Suspense fallback={null}>
          <WaterSurfaceTiles surfaces={rivers.surfaces} />
        </Suspense>
      ) : null}
      {rivers.falls.length > 0 ? <RiverFalls falls={rivers.falls} /> : null}
    </group>
  );
}

function ReliefOverlay({ markers }: { markers: ReliefMarker[] }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  usePopulateInstancedMesh(ref, markers);
  return (
    <instancedMesh ref={ref} args={instancedArgs(markers.length)}>
      <ringGeometry args={[0.58, 0.92, 20]} />
      <meshBasicMaterial transparent opacity={0.5} depthWrite={false} side={THREE.DoubleSide} vertexColors />
    </instancedMesh>
  );
}

function eventColor(kind: FaunaEvent["kind"]) {
  switch (kind) {
    case "predation":
      return "#e24834";
    case "starvation":
      return "#8a6b44";
    case "respawn":
      return "#38b86f";
    case "decomposition":
      return "#d3c8ad";
    default:
      return "#f0c84f";
  }
}

function EventMarkerLayer({
  events,
  selectedEventId,
  showPredationHighlights,
}: {
  events: FaunaEvent[];
  selectedEventId: string | null;
  showPredationHighlights: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.4) * 0.08;
    group.children.forEach((child) => {
      const selected = child.userData.selected === true;
      child.scale.setScalar(selected ? pulse * 1.28 : pulse);
    });
  });

  const visibleEvents = events
    .filter((event) => showPredationHighlights || event.kind !== "predation")
    .slice(0, 24);

  return (
    <group ref={groupRef}>
      {visibleEvents.map((event) => {
        const selected = event.id === selectedEventId;
        const color = eventColor(event.kind);
        return (
          <group
            key={event.id}
            position={[event.x, event.y + 0.18, event.z]}
            userData={{ selected }}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[selected ? 0.58 : 0.42, 0.025, 8, 28]} />
              <meshBasicMaterial color={color} transparent opacity={selected ? 0.92 : 0.62} depthWrite={false} />
            </mesh>
            <mesh position={[0, selected ? 0.18 : 0.12, 0]}>
              <sphereGeometry args={[selected ? 0.09 : 0.06, 10, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.86} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

interface LocatorTarget {
  x: number;
  y: number;
  z: number;
  key: string;
}

interface CaveSystemStat {
  cells: number;
  chambers: number;
  tunnels: number;
  entrances: number;
  maxDepth: number;
  hasWater: boolean;
}

// Temporary high-contrast pulse spawned when the user clicks a recent event.
function LocatorPulse({ target }: { target: LocatorTarget | null }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const ring = ringRef.current;
    if (!ring) return;
    const t = (clock.elapsedTime * 1.3) % 1;
    ring.scale.setScalar(0.6 + t * 1.8);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.92 * (1 - t);
  });
  if (!target) return null;
  return (
    <group key={target.key} position={[target.x, target.y + 0.12, target.z]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.78, 30]} />
        <meshBasicMaterial color="#ffe08a" transparent opacity={0.9} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.14, 3, 8, 1, true]} />
        <meshBasicMaterial color="#ffe08a" transparent opacity={0.42} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function _HoverBadge({ hovered }: { hovered: HoverState | null }) {
  if (!hovered) return null;

  return (
    <Html position={hovered.position} center distanceFactor={11}>
      <div className="terrain-stage__tooltip">
        <strong>{hovered.cell.isWater ? "agua" : hovered.biomeLabel}</strong>
        <span>
          {hovered.cell.temperatureC.toFixed(1)} C - {hovered.cell.precipitationMmYear} mm/ano
        </span>
        <span>
          elevacao {(hovered.cell.elevation * 100).toFixed(0)}% - {hovered.cell.climateCode}
        </span>
        {hovered.cell.altitudeBand ? (
          <span>
            relevo: {ALTITUDE_BAND_LABELS[hovered.cell.altitudeBand] ?? hovered.cell.altitudeBand}
            {hovered.cell.waterFlow && hovered.cell.waterFlow > 0.08 ? " - rio" : ""}
          </span>
        ) : null}
        {hovered.cell.cave && hovered.cell.cave.type !== "none" ? (
          <span>
            caverna: {CAVE_TYPE_LABELS[hovered.cell.cave.type] ?? hovered.cell.cave.type} (prof.{" "}
            {(hovered.cell.cave.depth * 100).toFixed(0)}%)
          </span>
        ) : null}
        {hovered.cell.objects && hovered.cell.objects.length > 0 ? (
          <span>
            objetos: {hovered.cell.objects.map((o) => OBJECT_LABELS[o] ?? o).join(", ")}
          </span>
        ) : null}
      </div>
    </Html>
  );
}

const ALTITUDE_BAND_LABELS: Record<string, string> = {
  lowland: "planicie",
  hill: "colina",
  mountain: "montanha",
  cliff: "penhasco",
};

const CAVE_TYPE_LABELS: Record<string, string> = {
  "shallow-den": "toca rasa",
  "deep-cave": "caverna profunda",
  sinkhole: "dolina",
  "cliff-opening": "abertura em penhasco",
  "river-cave": "caverna de rio",
  "lava-tube": "tubo de lava",
  "karst-system": "sistema cárstico",
};

function AutoOrbitControls({ worldRadius }: { worldRadius: number }) {
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setAutoRotate(false), 4000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <OrbitControls
      makeDefault
      autoRotate={autoRotate}
      autoRotateSpeed={0.52}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={worldRadius * 0.55}
      maxDistance={worldRadius * 2.6}
      minPolarAngle={0.5}
      maxPolarAngle={1.26}
      onStart={() => setAutoRotate(false)}
    />
  );
}

function TerrainScene({
  sceneData,
  grid,
  faunaSpecies,
  faunaPaused,
  faunaSpeedMultiplier,
  showFauna,
  showObjects,
  showCaves,
  showRivers,
  showRelief,
  showCarcasses,
  showEvents,
  showCaveMarkers,
  caveXRay,
  subsoil,
  vegetationOpacity,
  faunaEvents,
  selectedEventId,
  showPredationHighlights,
  locator,
  highlightSystemId,
  rainEnabled,
  rainIntensity,
  simulatedTimeRef,
  onLightningObserved,
  onFaunaCountUpdate,
  onInspect,
  onFaunaEvent,
  invasiveSpeciesIds = [],
}: {
  sceneData: SceneData;
  grid: TerrainGrid;
  faunaSpecies: SpeciesDefinition[];
  faunaPaused: boolean;
  faunaSpeedMultiplier: number;
  showFauna: boolean;
  showObjects: boolean;
  showCaves: boolean;
  showRivers: boolean;
  showRelief: boolean;
  showCarcasses: boolean;
  showEvents: boolean;
  showCaveMarkers: boolean;
  caveXRay: boolean;
  subsoil: boolean;
  vegetationOpacity: number;
  faunaEvents: FaunaEvent[];
  selectedEventId: string | null;
  showPredationHighlights: boolean;
  locator: LocatorTarget | null;
  highlightSystemId: string | null;
  rainEnabled: boolean;
  rainIntensity: number;
  simulatedTimeRef: React.MutableRefObject<number>;
  onLightningObserved?: () => void;
  onFaunaCountUpdate: (count: number) => void;
  onInspect?: (cell: TerrainCell) => void;
  onFaunaEvent?: (event: FaunaEvent) => void;
  invasiveSpeciesIds?: string[];
}) {
  const entranceCaves = useMemo(() => sceneData.caves.filter((cave) => cave.isEntrance), [sceneData.caves]);
  const rainWaterLevelY = useMemo(() => {
    const surfaces = [...sceneData.waterSurfaces, ...sceneData.rivers.surfaces];
    if (surfaces.length === 0) return LAND_MIN_HEIGHT + MIN_VISIBLE_WATER_DEPTH;
    return surfaces.reduce((sum, surface) => sum + surface.y, 0) / surfaces.length;
  }, [sceneData.rivers.surfaces, sceneData.waterSurfaces]);
  const highlightCaves = useMemo(
    () => (highlightSystemId ? sceneData.caves.filter((cave) => cave.systemId === highlightSystemId) : []),
    [sceneData.caves, highlightSystemId],
  );
  const gradientMap = useMemo(() => {
    const steps = new Uint8Array([50, 130, 200, 255]);
    const texture = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, []);

  return (
    <>
      <DayNightCycle
        worldRadius={sceneData.worldRadius}
        baseFogDensity={sceneData.fogDensity}
        rainEnabled={rainEnabled}
        rainIntensity={rainIntensity}
        simulatedTimeRef={simulatedTimeRef}
        onLightningObserved={onLightningObserved}
      />

      <TerrainColumns
        sceneData={sceneData}
        gradientMap={gradientMap}
        terrainOpacity={subsoil ? 0.42 : 1}
        onInspect={(cell) => onInspect?.(cell)}
      />
      <VegetationField sceneData={sceneData} gradientMap={gradientMap} opacity={vegetationOpacity} />
      {showObjects ? (
        <ProceduralObjectsField objects={sceneData.objects} gradientMap={gradientMap} />
      ) : null}
      {showCaves ? <CaveEntrances caves={entranceCaves} showMarkers={showCaveMarkers} /> : null}
      {showCaves && (caveXRay || subsoil) ? (
        <CaveInterior caves={sceneData.caves} tunnels={sceneData.caveTunnels} selectedSystemId={highlightSystemId} />
      ) : null}
      {highlightCaves.length > 0 ? <CaveSystemHighlight caves={highlightCaves} /> : null}
      {showRivers ? <RiverOverlay rivers={sceneData.rivers} /> : null}
      {showRelief ? <ReliefOverlay markers={sceneData.reliefMarkers} /> : null}
      <FaunaLayer
        grid={grid}
        species={faunaSpecies}
        gradientMap={gradientMap}
        paused={faunaPaused}
        speedMultiplier={faunaSpeedMultiplier}
        visible={showFauna}
        carcassesVisible={showCarcasses}
        onCountUpdate={onFaunaCountUpdate}
        onFaunaEvent={(event) => onFaunaEvent?.(event)}
        invasiveSpeciesIds={invasiveSpeciesIds}
      />
      {showEvents ? (
        <EventMarkerLayer
          events={faunaEvents}
          selectedEventId={selectedEventId}
          showPredationHighlights={showPredationHighlights}
        />
      ) : null}
      <LocatorPulse target={locator} />
      <RainSystem
        enabled={rainEnabled}
        intensity={rainIntensity}
        worldRadius={sceneData.worldRadius}
        waterLevelY={rainWaterLevelY}
      />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.3}
        scale={sceneData.worldRadius * 1.5}
        blur={2.5}
        far={10}
      />
      {/* Hover badge intentionally disabled; inspection via Ctrl/Cmd+Click. */}
      <AutoOrbitControls worldRadius={sceneData.worldRadius} />
    </>
  );
}

class CanvasErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="terrain-stage__fallback" role="alert">
          <strong>WebGL indisponivel</strong>
          <span>O visualizador 3D nao conseguiu iniciar neste navegador ou dispositivo.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

export function TerrainView({
  grid,
  faunaSpecies,
  faunaPaused,
  faunaSpeedMultiplier,
  showFauna,
  showObjects,
  showCaves,
  showRivers,
  showRelief = false,
  showCarcasses = true,
  showEvents = true,
  showCaveMarkers = true,
  caveXRay = false,
  subsoil = false,
  vegetationOpacity = 1,
  showPredationHighlights = true,
  activePreset = "explore",
  rainEnabled,
  rainIntensity,
  simulatedTimeRef,
  onLightningObserved,
  onFaunaCountUpdate,
  // Optional in-scene layer controls
  onToggleLayer,
  onVegetationOpacityChange,
  onApplyPreset,
  // Optional parent-driven UI state for inspector and recent events
  inspected,
  setInspected,
  faunaEvents,
  setFaunaEvents,
  selectedFaunaEventId,
  setSelectedFaunaEventId,
  invasiveSpeciesIds = [],
  invasiveOverlay = null,
}: {
  grid: TerrainGrid;
  faunaSpecies: SpeciesDefinition[];
  faunaPaused: boolean;
  faunaSpeedMultiplier: number;
  showFauna: boolean;
  showObjects: boolean;
  showCaves: boolean;
  showRivers: boolean;
  showRelief?: boolean;
  showCarcasses?: boolean;
  showEvents?: boolean;
  showCaveMarkers?: boolean;
  caveXRay?: boolean;
  subsoil?: boolean;
  vegetationOpacity?: number;
  showPredationHighlights?: boolean;
  activePreset?: LayerPreset;
  onToggleLayer?: (key: LayerKey) => void;
  onVegetationOpacityChange?: (value: number) => void;
  onApplyPreset?: (preset: LayerPreset) => void;
  rainEnabled: boolean;
  rainIntensity: number;
  simulatedTimeRef: React.MutableRefObject<number>;
  onLightningObserved?: () => void;
  onFaunaCountUpdate: (count: number) => void;
  inspected?: TerrainCell | null;
  setInspected?: React.Dispatch<React.SetStateAction<TerrainCell | null>>;
  faunaEvents?: FaunaEvent[];
  setFaunaEvents?: React.Dispatch<React.SetStateAction<FaunaEvent[]>>;
  selectedFaunaEventId?: string | null;
  setSelectedFaunaEventId?: React.Dispatch<React.SetStateAction<string | null>>;
  invasiveSpeciesIds?: string[];
  invasiveOverlay?: InvasiveOverlayData | null;
}) {
  // If parent didn't provide UI state, maintain internal fallbacks so the component remains functional.
  const [internalInspected, internalSetInspected] = useState<TerrainCell | null>(null);
  const [internalFaunaEvents, internalSetFaunaEvents] = useState<FaunaEvent[]>([]);
  const [internalSelectedEventId, internalSetSelectedEventId] = useState<string | null>(null);

  const inspectedState = inspected !== undefined ? inspected : internalInspected;
  const setInspectedState = setInspected ?? internalSetInspected;
  const faunaEventsState = faunaEvents !== undefined ? faunaEvents : internalFaunaEvents;
  const setFaunaEventsState = setFaunaEvents ?? internalSetFaunaEvents;
  const selectedEventId = selectedFaunaEventId !== undefined ? selectedFaunaEventId : internalSelectedEventId;
  const setSelectedEventId = setSelectedFaunaEventId ?? internalSetSelectedEventId;

  const sceneData = useMemo(() => buildSceneData(grid), [grid]);
  const faunaStrategyCounts = useMemo(() => {
    const counts = new Map<SpeciesDefinition["feedingStrategy"], number>();
    for (const entry of faunaSpecies) {
      counts.set(entry.feedingStrategy, (counts.get(entry.feedingStrategy) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([feedingStrategy, count]) => ({ feedingStrategy, count }))
      .sort((a, b) => b.count - a.count);
  }, [faunaSpecies]);
  const activityCounts = useMemo(() => {
    const counts = new Map<ActivityPeriod, number>();
    for (const entry of faunaSpecies) {
      const period = entry.behaviorProfile?.activityPeriod;
      if (!period) continue;
      counts.set(period, (counts.get(period) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => b.count - a.count);
  }, [faunaSpecies]);
  const cameraPosition = useMemo(() => {
    const span = sceneData.worldRadius;
    return [span * 0.58, span * 0.92, span * 1.16] as [number, number, number];
  }, [sceneData.worldRadius]);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [animalsOpen, setAnimalsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [locator, setLocator] = useState<LocatorTarget | null>(null);
  const [highlightSystemId, setHighlightSystemId] = useState<string | null>(null);
  const locatorTimer = useRef<number | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const toastTimers = useRef<number[]>([]);

  // Compact cave summary used by the Layers panel + inspector hints.
  const caveSummary = useMemo(() => {
    const entrances = sceneData.caves.filter((cave) => cave.isEntrance).length;
    const systems = new Set(sceneData.caves.map((cave) => cave.systemId).filter(Boolean)).size;
    const maxDepth = sceneData.caves.reduce((max, cave) => Math.max(max, cave.depth), 0);
    return { entrances, systems, maxDepth };
  }, [sceneData.caves]);
  const caveSystemStats = useMemo(() => {
    const stats = new Map<string, CaveSystemStat>();
    for (const cave of sceneData.caves) {
      if (!cave.systemId) continue;
      const entry =
        stats.get(cave.systemId) ?? { cells: 0, chambers: 0, tunnels: 0, entrances: 0, maxDepth: 0, hasWater: false };
      entry.cells += 1;
      if (cave.role === "chamber") entry.chambers += 1;
      if (cave.role === "tunnel") entry.tunnels += 1;
      if (cave.isEntrance) entry.entrances += 1;
      entry.maxDepth = Math.max(entry.maxDepth, cave.depth);
      if (cave.type === "river-cave" || cave.humidity >= 0.8) entry.hasWater = true;
      stats.set(cave.systemId, entry);
    }
    return stats;
  }, [sceneData.caves]);

  // Highlight a whole cave system for a few seconds (entrance click in inspector).
  const highlightSystem = useCallback((systemId: string | null) => {
    setHighlightSystemId(systemId);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    if (systemId) highlightTimer.current = window.setTimeout(() => setHighlightSystemId(null), 5000);
  }, []);

  // Show a temporary locator pulse on the map for a clicked event (3-5s).
  const focusEvent = useCallback(
    (event: FaunaEvent) => {
      setSelectedEventId(event.id);
      setLocator({ x: event.x, y: event.y, z: event.z, key: `${event.id}-${event.createdAt}` });
      if (locatorTimer.current) window.clearTimeout(locatorTimer.current);
      locatorTimer.current = window.setTimeout(() => setLocator(null), 4000);
    },
    [setSelectedEventId],
  );

  // Discreet predation toast that auto-dismisses (~2.8s).
  const pushToast = useCallback((event: FaunaEvent) => {
    const toast: ToastItem = { id: `${event.id}-${event.createdAt}`, kind: event.kind, message: event.message };
    setToasts((current) => [...current, toast].slice(-3));
    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((entry) => entry.id !== toast.id));
    }, 2800);
    toastTimers.current.push(timer);
  }, []);

  useEffect(
    () => () => {
      if (locatorTimer.current) window.clearTimeout(locatorTimer.current);
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
      toastTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  return (
    <div className="terrain-stage">
      <div className="terrain-stage__chrome">
        <div>
          <p className="terrain-stage__eyebrow">visualizador 3d</p>
          <h4>Ecossistema low-poly</h4>
          <p className="terrain-stage__summary">
            {grid.width} x {grid.height} celulas - semente {grid.seed} - base{" "}
            {grid.baseTemperatureC} C / {grid.basePrecipitationMm} mm
          </p>
        </div>
        <div className="terrain-stage__legend" aria-label="Legenda de biomas">
          {sceneData.legend.map(({ label, color }) => (
            <div key={label} className="terrain-stage__legend-item">
              <span
                className="terrain-stage__legend-swatch"
                style={{ "--terrain-legend-swatch": color } as React.CSSProperties}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
        {faunaStrategyCounts.length > 0 ? (
          <div className="terrain-stage__legend terrain-stage__legend--fauna" aria-label="Legenda de fauna">
            {faunaStrategyCounts.map(({ feedingStrategy, count }) => (
              <div key={feedingStrategy} className="terrain-stage__legend-item">
                <span
                  className="terrain-stage__legend-swatch terrain-stage__legend-swatch--polygon"
                  style={{
                    "--terrain-legend-swatch": FEEDING_STRATEGY_COLORS[feedingStrategy],
                  } as React.CSSProperties}
                />
                <span>
                  {FEEDING_STRATEGY_LABELS[feedingStrategy]} ({count})
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {activityCounts.length > 0 ? (
          <div className="terrain-stage__legend terrain-stage__legend--fauna" aria-label="Fauna por periodo de atividade">
            {activityCounts.map(({ period, count }) => (
              <div key={period} className="terrain-stage__legend-item">
                <span>
                  {ACTIVITY_PERIOD_LABELS[period]} ({count})
                </span>
              </div>
            ))}
          </div>
        ) : null}
        {sceneData.objectLegend.length > 0 ? (
          <div className="terrain-stage__legend terrain-stage__legend--objects" aria-label="Legenda de objetos">
            {sceneData.objectLegend.map(({ label, color }) => (
              <div key={label} className="terrain-stage__legend-item">
                <span
                  className="terrain-stage__legend-swatch"
                  style={{ "--terrain-legend-swatch": color } as React.CSSProperties}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="terrain-stage__viewport">
        <div className="terrain-stage__vignette" aria-hidden="true" />
        <CanvasErrorBoundary>
          <Canvas
            data-testid="terrain-canvas-viewport"
            shadows
            dpr={[1, 2]}
            camera={{ position: cameraPosition, fov: 34, near: 0.1, far: 500 }}
            gl={{
              antialias: true,
            }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.5;
            }}
          >
            {/* If postprocessing is reintroduced later, it belongs here after the scene content. */}
            <Suspense fallback={null}>
              <TerrainScene
                sceneData={sceneData}
                grid={grid}
                faunaSpecies={faunaSpecies}
                faunaPaused={faunaPaused}
                faunaSpeedMultiplier={faunaSpeedMultiplier}
                showFauna={showFauna}
                showObjects={showObjects}
                showCaves={showCaves}
                showRivers={showRivers}
                showRelief={showRelief}
                showCarcasses={showCarcasses}
                showEvents={showEvents}
                showCaveMarkers={showCaveMarkers}
                caveXRay={caveXRay}
                subsoil={subsoil}
                vegetationOpacity={vegetationOpacity}
                faunaEvents={faunaEventsState}
                selectedEventId={selectedEventId}
                showPredationHighlights={showPredationHighlights}
                locator={locator}
                highlightSystemId={highlightSystemId}
                rainEnabled={rainEnabled}
                rainIntensity={rainIntensity}
                simulatedTimeRef={simulatedTimeRef}
                onLightningObserved={onLightningObserved}
                onFaunaCountUpdate={onFaunaCountUpdate}
                onInspect={(cell) => setInspectedState(cell)}
                invasiveSpeciesIds={invasiveSpeciesIds}
                onFaunaEvent={(event) => {
                  setFaunaEventsState((state) => [event, ...state].slice(0, 24));
                  // Predation is the salient event — surface it as a brief toast
                  // instead of keeping the panel open all the time.
                  if (showEvents && event.kind === "predation") pushToast(event);
                }}
              />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>

        <div className="terrain-overlay">
          {inspectedState ? (
            <CellInspectorPanel
              cell={inspectedState}
              faunaSpecies={faunaSpecies}
              caveSystemStats={caveSystemStats}
              caveXRayActive={caveXRay || subsoil}
              onClose={() => setInspectedState(null)}
              onHighlightSystem={highlightSystem}
            />
          ) : null}

          {onToggleLayer ? (
            <LayersControl
              open={layersOpen}
              onToggleOpen={() => setLayersOpen((value) => !value)}
              onClose={() => setLayersOpen(false)}
              activePreset={activePreset}
              state={{
                objects: showObjects,
                rivers: showRivers,
                caves: showCaves,
                relief: showRelief,
                fauna: showFauna,
                carcasses: showCarcasses,
                events: showEvents,
                predation: showPredationHighlights,
                markers: showCaveMarkers,
                xray: caveXRay,
                subsoil,
              }}
              onToggle={onToggleLayer}
              onApplyPreset={(preset) => onApplyPreset?.(preset)}
              vegetationOpacity={vegetationOpacity}
              onVegetationChange={(value) => onVegetationOpacityChange?.(value)}
              caveSummary={caveSummary}
            />
          ) : null}

          <AnimalsPanel
            species={faunaSpecies}
            open={animalsOpen}
            onToggleOpen={() => setAnimalsOpen((value) => !value)}
            onClose={() => setAnimalsOpen(false)}
            invasiveSpeciesIds={invasiveSpeciesIds}
          />

          {invasiveOverlay ? <InvasiveImpactOverlay overlay={invasiveOverlay} /> : null}

          {showEvents ? (
            <EventHub
              events={faunaEventsState}
              selectedId={selectedEventId}
              expanded={eventsExpanded}
              onToggleExpanded={() => setEventsExpanded((value) => !value)}
              onSelect={focusEvent}
            />
          ) : null}

          {showEvents ? <ToastStack toasts={toasts} /> : null}
        </div>
      </div>
    </div>
  );
}

function caveInhabitantsForCell(cell: TerrainCell, species: SpeciesDefinition[]) {
  const cave = cell.cave && cell.cave.type !== "none" ? cell.cave : null;
  if (!cave) return [];
  return species.filter((entry) => {
    if (!entry.habitableBiomes.includes("caverna")) return false;
    if (entry.category === "fish") {
      return cave.type === "river-cave" || (cell.riverDistance ?? 99) <= 1 || cave.humidity >= 0.85;
    }
    return !cell.isWater;
  });
}

function CellInspectorPanel({
  cell,
  faunaSpecies,
  caveSystemStats,
  caveXRayActive,
  onClose,
  onHighlightSystem,
}: {
  cell: TerrainCell;
  faunaSpecies: SpeciesDefinition[];
  caveSystemStats: Map<string, CaveSystemStat>;
  caveXRayActive: boolean;
  onClose: () => void;
  onHighlightSystem: (systemId: string | null) => void;
}) {
  const cave = cell.cave && cell.cave.type !== "none" ? cell.cave : null;
  const caveSpecies = caveInhabitantsForCell(cell, faunaSpecies);
  const isEntrance = cell.objects?.includes("cave-entrance") ?? false;
  const stat = cave?.systemId ? caveSystemStats.get(cave.systemId) : undefined;
  const systemCells = stat?.cells ?? 1;
  const isFallback = systemCells <= 1;
  const hasUnderwater = stat?.hasWater ?? (cave ? cave.type === "river-cave" || cave.humidity >= 0.8 : false);

  return (
    <section className="terrain-inspector" aria-label="Inspector de celula">
      <div className="terrain-inspector__header">
        <strong>Inspector de celula</strong>
        <button type="button" onClick={onClose}>Fechar</button>
      </div>
      <dl className="terrain-inspector__grid">
        <div><dt>Coords</dt><dd>{cell.x}, {cell.y}</dd></div>
        <div><dt>Bioma</dt><dd>{biomeLabel(cell.biomeSuggestion)}</dd></div>
        <div><dt>Elevacao</dt><dd>{(cell.elevation * 100).toFixed(0)}%</dd></div>
        <div><dt>Agua</dt><dd>{cell.isWater ? "sim" : "nao"}</dd></div>
        <div><dt>Temperatura</dt><dd>{cell.temperatureC.toFixed(1)} C</dd></div>
        <div><dt>Precipitacao</dt><dd>{cell.precipitationMmYear} mm/ano</dd></div>
        <div><dt>Relevo</dt><dd>{cell.altitudeBand ? ALTITUDE_BAND_LABELS[cell.altitudeBand] ?? cell.altitudeBand : "-"}</dd></div>
        <div><dt>Objetos</dt><dd>{(cell.objects ?? []).map((o) => OBJECT_LABELS[o] ?? o).join(", ") || "-"}</dd></div>
      </dl>
      {cave ? (
        <div className="terrain-inspector__section">
          <strong>Sistema de caverna ({isEntrance ? "entrada" : cave.role === "chamber" ? "câmara" : "túnel"})</strong>
          <dl className="terrain-inspector__grid">
            <div><dt>Tipo</dt><dd>{CAVE_TYPE_LABELS[cave.type] ?? cave.type}</dd></div>
            <div><dt>Sistema</dt><dd>{cave.systemId ?? "-"}</dd></div>
            <div><dt>Celulas</dt><dd>{systemCells}{isFallback ? " (fallback)" : ""}</dd></div>
            <div><dt>Entradas</dt><dd>{stat?.entrances ?? (isEntrance ? 1 : 0)}</dd></div>
            <div><dt>Camaras</dt><dd>{stat?.chambers ?? 0}</dd></div>
            <div><dt>Tuneis</dt><dd>{stat?.tunnels ?? 0}</dd></div>
            <div><dt>Conexoes</dt><dd>{cave.connectedTo?.length ?? 0}</dd></div>
            <div><dt>Prof. (cel/máx)</dt><dd>{(cave.depth * 100).toFixed(0)}% / {((stat?.maxDepth ?? cave.depth) * 100).toFixed(0)}%</dd></div>
            <div><dt>Agua subterranea</dt><dd>{hasUnderwater ? "sim" : "nao"}</dd></div>
          </dl>
          <div className="terrain-inspector__species">
            <span>Fauna cavernicola possivel</span>
            <p>{caveSpecies.map((entry) => entry.commonName).join(", ") || "sem especie compatível no grid"}</p>
          </div>
          {isFallback ? (
            <p className="terrain-inspector__hint">Sistema de celula unica (fallback) — terreno nao permitiu crescer galerias.</p>
          ) : null}
          {!caveXRayActive ? (
            <p className="terrain-inspector__hint">Ative o modo Subsolo/Raio-X (Camadas) para ver o interior.</p>
          ) : null}
          {cave.systemId ? (
            <button
              type="button"
              className="terrain-inspector__action"
              onClick={() => onHighlightSystem(cave.systemId ?? null)}
            >
              Destacar sistema no mapa
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

const FAUNA_EVENT_LABELS: Record<FaunaEvent["kind"], string> = {
  predation: "Predacao",
  starvation: "Fome",
  respawn: "Respawn",
  decomposition: "Decomposicao",
};

const FAUNA_EVENT_ICONS: Record<FaunaEvent["kind"], string> = {
  predation: "🩸",
  starvation: "🍂",
  respawn: "✦",
  decomposition: "🦴",
};

// ─── Discreet event hub: collapsed chip by default, expands to a compact panel ──
function EventHub({
  events,
  selectedId,
  expanded,
  onToggleExpanded,
  onSelect,
}: {
  events: FaunaEvent[];
  selectedId: string | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelect: (event: FaunaEvent) => void;
}) {
  if (!expanded) {
    return (
      <button
        type="button"
        className="terrain-eventhub__chip"
        onClick={onToggleExpanded}
        aria-label="Abrir eventos recentes"
      >
        <span className="terrain-eventhub__chip-icon" aria-hidden="true">⚑</span>
        Eventos
        <span className="terrain-eventhub__chip-count">{events.length}</span>
      </button>
    );
  }
  return (
    <section className="terrain-eventhub" aria-label="Eventos recentes da fauna">
      <div className="terrain-eventhub__header">
        <strong>Eventos recentes</strong>
        <button type="button" onClick={onToggleExpanded} aria-label="Fechar eventos">✕</button>
      </div>
      {events.length > 0 ? (
        <div className="terrain-eventhub__list">
          {events.slice(0, 12).map((event) => (
            <button
              key={event.id}
              type="button"
              className={`terrain-eventhub__item${event.id === selectedId ? " is-selected" : ""}`}
              onClick={() => onSelect(event)}
            >
              <span
                className="terrain-eventhub__icon"
                style={{ "--event-color": eventColor(event.kind) } as React.CSSProperties}
              >
                {FAUNA_EVENT_ICONS[event.kind]}
              </span>
              <span className="terrain-eventhub__text">
                <small>{FAUNA_EVENT_LABELS[event.kind]}</small>
                {event.message}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="terrain-eventhub__empty">Nenhum evento registrado.</p>
      )}
    </section>
  );
}

// ─── Discreet predation toasts (auto-expire, never block the camera) ───────────
interface ToastItem {
  id: string;
  kind: FaunaEvent["kind"];
  message: string;
}

function ToastStack({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="terrain-toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="terrain-toast">
          <span
            className="terrain-toast__icon"
            style={{ "--event-color": eventColor(toast.kind) } as React.CSSProperties}
          >
            {FAUNA_EVENT_ICONS[toast.kind]}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Animals present: compact chip → filterable list of resolved species ───────
type AnimalFilter = "all" | "herbivore" | "carnivore" | "omnivore" | "bird" | "fish" | "cave" | "water" | "predator";

const ANIMAL_FILTERS: { key: AnimalFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "herbivore", label: "Herbivoros" },
  { key: "carnivore", label: "Carnivoros" },
  { key: "omnivore", label: "Onivoros" },
  { key: "predator", label: "Predadores" },
  { key: "bird", label: "Aves" },
  { key: "fish", label: "Peixes" },
  { key: "cave", label: "Cavernicolas" },
  { key: "water", label: "Aquaticos" },
];

function speciesHabitat(species: SpeciesDefinition): "cave" | "water" | "land" {
  if (species.habitableBiomes.includes("caverna")) return "cave";
  if (species.category === "fish" || species.habitableBiomes.some((b) => b === "oceano" || b === "oceano-polar")) {
    return "water";
  }
  return "land";
}

function matchesAnimalFilter(species: SpeciesDefinition, filter: AnimalFilter): boolean {
  switch (filter) {
    case "all": return true;
    case "herbivore":
    case "carnivore":
    case "omnivore": return species.feedingStrategy === filter;
    case "bird": return species.category === "bird";
    case "fish": return species.category === "fish";
    case "cave": return speciesHabitat(species) === "cave";
    case "water": return speciesHabitat(species) === "water";
    case "predator": return (species.preySpeciesIds?.length ?? 0) > 0;
    default: return true;
  }
}

const HABITAT_TAG: Record<"cave" | "water" | "land", string> = {
  cave: "caverna",
  water: "agua",
  land: "terra",
};

function invasiveEffectLabel(effect: string) {
  switch (effect) {
    case "predation":
      return "predacao";
    case "competition":
      return "competicao";
    case "habitat-alteration":
      return "alteracao de habitat";
    case "disease":
      return "doenca";
    case "resource-pressure":
      return "pressao sobre recursos";
    default:
      return effect || "impacto nao detalhado";
  }
}

function InvasiveImpactOverlay({ overlay }: { overlay: InvasiveOverlayData }) {
  const affected = overlay.affectedSpecies?.slice(0, 4) ?? [];
  return (
    <section className="terrain-invasive" aria-label="Leitura da invasao">
      <div className="terrain-invasive__header">
        <strong>Foco invasora</strong>
        <span className="terrain-invasive__phase">{overlay.phaseLabel ?? "fase nao informada"}</span>
      </div>
      <div className="terrain-invasive__species">
        <span className="terrain-invasive__badge">Invasora</span>
        <div>
          <strong>{overlay.invaderName}</strong>
          <small>{overlay.invaderScientificName ?? "nome cientifico indisponivel"}</small>
        </div>
      </div>
      <div className="terrain-invasive__section">
        <span>Mecanismos</span>
        <p>{overlay.impactMechanisms?.join(", ") || "detalhes de impacto indisponiveis"}</p>
      </div>
      <div className="terrain-invasive__section">
        <span>Nativas afetadas</span>
        {affected.length > 0 ? (
          <ul className="terrain-invasive__list">
            {affected.map((entry) => (
              <li key={`${entry.speciesId}-${entry.effect}`}>
                <strong>{entry.commonName}</strong>
                <span>
                  {invasiveEffectLabel(entry.effect)}
                  {typeof entry.populationDelta === "number" ? ` · delta ${entry.populationDelta}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>Sem especies afetadas listadas pelo backend.</p>
        )}
      </div>
      <div className="terrain-invasive__section">
        <span>Escopo</span>
        <p>{overlay.simulatedNotes?.join(", ") || "A simulacao visual mostra presenca e convivencia da invasora."}</p>
        {overlay.explanationOnlyNotes?.length ? (
          <p className="terrain-invasive__muted">Explicacao apenas: {overlay.explanationOnlyNotes.join(", ")}</p>
        ) : null}
      </div>
    </section>
  );
}

function AnimalsPanel({
  species,
  open,
  onToggleOpen,
  onClose,
  invasiveSpeciesIds,
}: {
  species: SpeciesDefinition[];
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  invasiveSpeciesIds: string[];
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<AnimalFilter>("all");
  const [search, setSearch] = useState("");
  const invasiveSet = useMemo(() => new Set(invasiveSpeciesIds), [invasiveSpeciesIds]);
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  const filtered = species.filter((s) => {
    if (!matchesAnimalFilter(s, filter)) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${s.commonName} ${s.scientificName}`.toLowerCase().includes(query);
  });

  if (!open) {
    return (
      <button type="button" className="terrain-animals__chip" onClick={onToggleOpen} aria-label="Animais presentes">
        <span aria-hidden="true">🐾</span>
        Animais
        <span className="terrain-animals__chip-count">{species.length}</span>
      </button>
    );
  }

  return (
    <section ref={rootRef} className="terrain-animals" aria-label="Animais presentes no ecossistema">
      <div className="terrain-animals__header">
        <strong>Animais presentes ({species.length})</strong>
        <button type="button" onClick={onClose} aria-label="Fechar lista de animais">✕</button>
      </div>
      <input
        type="search"
        className="terrain-animals__search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar nome comum ou cientifico"
      />
      <div className="terrain-animals__filters">
        {ANIMAL_FILTERS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`terrain-animals__filter${filter === entry.key ? " is-active" : ""}`}
            onClick={() => setFilter(entry.key)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {filtered.length > 0 ? (
        <ul className="terrain-animals__list">
          {filtered.map((s) => {
            const habitat = speciesHabitat(s);
            const renderProfile = getSpeciesRenderProfile(s);
            const isInvasive = invasiveSet.has(s.id);
            return (
              <li key={s.id} className="terrain-animals__item">
                <span
                  className="terrain-animals__dot"
                  style={{ "--strategy-color": FEEDING_STRATEGY_COLORS[s.feedingStrategy] } as React.CSSProperties}
                />
                <span className="terrain-animals__name">
                  {s.commonName}
                  {isInvasive ? <small className="terrain-animals__badge">Invasora</small> : null}
                </span>
                <span className="terrain-animals__meta">{s.scientificName || "nome cientifico indisponivel"}</span>
                <span className="terrain-animals__tags">
                  {FEEDING_STRATEGY_LABELS[s.feedingStrategy]}
                  {" · "}
                  {HABITAT_TAG[habitat]}
                  {" · "}
                  {s.trophicLevel}
                  {renderProfile.assetPath ? " · sprite" : " · fallback"}
                  {(s.preySpeciesIds?.length ?? 0) > 0 ? " · predador" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="terrain-animals__empty">Nenhuma especie nesta categoria.</p>
      )}
    </section>
  );
}

// ─── Compact in-scene layer switcher ───────────────────────────────────────────
type LayerKey =
  | "objects"
  | "rivers"
  | "caves"
  | "relief"
  | "fauna"
  | "carcasses"
  | "events"
  | "predation"
  | "markers"
  | "xray"
  | "subsoil";

type LayerPreset = "explore" | "terrain" | "caves" | "subsoil" | "fauna" | "clean";

const PRESET_LABELS: Record<LayerPreset, string> = {
  explore: "Explorar",
  terrain: "Terreno",
  caves: "Cavernas",
  subsoil: "Subsolo",
  fauna: "Fauna",
  clean: "Limpo",
};

interface LayerToggleState {
  objects: boolean;
  rivers: boolean;
  caves: boolean;
  relief: boolean;
  fauna: boolean;
  carcasses: boolean;
  events: boolean;
  predation: boolean;
  markers: boolean;
  xray: boolean;
  subsoil: boolean;
}

const LAYER_DEFS: { key: LayerKey; label: string; hint: string }[] = [
  { key: "fauna", label: "Fauna", hint: "Animais vivos" },
  { key: "events", label: "Eventos", hint: "Marcadores, chip e avisos" },
  { key: "predation", label: "Predacao", hint: "Aneis de caca no mapa" },
  { key: "carcasses", label: "Carcacas", hint: "Restos visiveis" },
  { key: "rivers", label: "Rios", hint: "Fluxo de agua" },
  { key: "caves", label: "Cavernas", hint: "Entradas e bocas" },
  { key: "subsoil", label: "Subsolo", hint: "Terreno translucido + interior das cavernas" },
  { key: "xray", label: "Raio-X", hint: "Interior/subsolo das cavernas" },
  { key: "markers", label: "Marcadores", hint: "Aneis localizadores das cavernas (debug)" },
  { key: "relief", label: "Relevo", hint: "Altitude, penhascos, saliencias" },
  { key: "objects", label: "Objetos", hint: "Rochas, troncos, cogumelos" },
];

const LAYER_PRESETS: { key: LayerPreset; label: string }[] = (
  ["explore", "terrain", "caves", "subsoil", "fauna", "clean"] as LayerPreset[]
).map((key) => ({ key, label: PRESET_LABELS[key] }));

function LayersControl({
  open,
  onToggleOpen,
  onClose,
  activePreset,
  state,
  onToggle,
  onApplyPreset,
  vegetationOpacity,
  onVegetationChange,
  caveSummary,
}: {
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  activePreset: LayerPreset;
  state: LayerToggleState;
  onToggle: (key: LayerKey) => void;
  onApplyPreset: (preset: LayerPreset) => void;
  vegetationOpacity: number;
  onVegetationChange: (value: number) => void;
  caveSummary: { entrances: number; systems: number; maxDepth: number };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [advanced, setAdvanced] = useState(false);

  // Close the panel when the user clicks anywhere outside it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open, onClose]);

  return (
    <div ref={rootRef} className={`terrain-layers${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="terrain-layers__button"
        onClick={onToggleOpen}
        aria-expanded={open}
        aria-label="Camadas do mapa"
      >
        <span className="terrain-layers__button-icon" aria-hidden="true">▣</span>
        Camadas · {PRESET_LABELS[activePreset]}
      </button>
      {open ? (
        <div className="terrain-layers__panel" role="menu">
          <p className="terrain-layers__mode">Modo: {PRESET_LABELS[activePreset]}</p>
          <div className="terrain-layers__presets">
            {LAYER_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                aria-pressed={activePreset === preset.key}
                className={`terrain-layers__preset terrain-layers__preset--mode${activePreset === preset.key ? " is-active" : ""}`}
                onClick={() => onApplyPreset(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {state.caves ? (
            <p className="terrain-layers__summary">
              Cavernas: {caveSummary.entrances} entradas · {caveSummary.systems} sistemas · prof. máx.{" "}
              {Math.round(caveSummary.maxDepth * 100)}%
            </p>
          ) : null}

          <div className="terrain-layers__veg">
            <label htmlFor="terrain-veg-opacity">Vegetacao</label>
            <div className="terrain-layers__veg-presets">
              {[0, 0.4, 1].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`terrain-layers__preset${Math.abs(vegetationOpacity - value) < 0.03 ? " is-active" : ""}`}
                  onClick={() => onVegetationChange(value)}
                >
                  {Math.round(value * 100)}%
                </button>
              ))}
            </div>
            <input
              id="terrain-veg-opacity"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vegetationOpacity}
              onChange={(event) => onVegetationChange(Number(event.target.value))}
            />
          </div>

          <button
            type="button"
            className="terrain-layers__advanced-toggle"
            onClick={() => setAdvanced((value) => !value)}
            aria-expanded={advanced}
          >
            <span>Avancado</span>
            <span aria-hidden="true">{advanced ? "▾" : "▸"}</span>
          </button>

          {advanced ? (
            <div className="terrain-layers__switches">
              {LAYER_DEFS.map((def) => {
                const active = state[def.key];
                const disabled =
                  (def.key === "xray" || def.key === "markers" || def.key === "subsoil") && !state.caves;
                return (
                  <button
                    key={def.key}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={active}
                    className={`terrain-layers__switch${active ? " is-active" : ""}`}
                    onClick={() => onToggle(def.key)}
                    disabled={disabled}
                    title={def.hint}
                  >
                    <span className="terrain-layers__switch-track" aria-hidden="true">
                      <span className="terrain-layers__switch-thumb" />
                    </span>
                    <span className="terrain-layers__switch-label">{def.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const RATING_LABEL: Record<string, string> = {
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

const FAUNA_CATEGORY_LABELS: Record<string, string> = {
  "herbivore-small": "Herbívoros pequenos",
  "herbivore-large": "Herbívoros grandes",
  "predator-medium": "Predadores médios",
  "predator-large": "Predadores grandes",
  bird: "Aves",
  fish: "Peixes",
};

const FEEDING_STRATEGY_LABELS: Record<SpeciesDefinition["feedingStrategy"], string> = {
  carnivore: "Carnivoros",
  herbivore: "Herbivoros",
  omnivore: "Onivoros",
};

const FEEDING_STRATEGY_COLORS: Record<SpeciesDefinition["feedingStrategy"], string> = {
  carnivore: "#e63838",
  herbivore: "#32c85a",
  omnivore: "#f2f2ea",
};

const ACTIVITY_PERIOD_LABELS: Record<ActivityPeriod, string> = {
  diurnal: "Diurnos",
  nocturnal: "Noturnos",
  crepuscular: "Crepusculares",
};

const DEMO_PROMPT =
  "Gere um ecossistema de floresta tropical úmida, com rios, alta biodiversidade, vegetação densa e risco de desmatamento.";

const INITIAL_FORM = {
  width: "48",
  height: "36",
  seed: "42",
  baseTemperatureC: "22",
  basePrecipitationMm: "1200",
  baseHumidityPct: "65",
} satisfies TerrainForm;

const EMPTY_FORMATIONS: EcosystemReport["formations"] = {
  caveCells: 0,
  caveSystems: 0,
  visibleEntrances: 0,
  subterraneanCells: 0,
  chamberCells: 0,
  tunnelCells: 0,
  connections: 0,
  maxCaveDepth: 0,
  avgCaveDepth: 0,
  shallowCaveCount: 0,
  deepCaveCount: 0,
  fallbackSingleCellSystems: 0,
  largestSystemCells: 0,
  caveTypes: [],
  mountainCoveragePct: 0,
  cliffCoveragePct: 0,
  rockyCoveragePct: 0,
  ledgeCells: 0,
  riverCells: 0,
  maxWaterFlow: 0,
  waterfallCells: 0,
};

interface EcologyTerrainSectionProps {
  /** Prompt vindo de outra aba (ex: chat da Consulta) para gerar um ecossistema ao montar. */
  initialPrompt?: string | null;
  /** Chamado após o prompt inicial ser consumido, para o pai limpar o estado compartilhado. */
  onInitialPromptConsumed?: () => void;
}

function EcologyTerrainSection({
  initialPrompt,
  onInitialPromptConsumed,
}: EcologyTerrainSectionProps = {}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [grid, setGrid] = useState<TerrainGrid | null>(null);
  const [faunaSpecies, setFaunaSpecies] = useState<SpeciesDefinition[]>([]);
  const [faunaPaused, setFaunaPaused] = useState(false);
  const [faunaSpeedMultiplier, setFaunaSpeedMultiplier] = useState(1);
  const [showFauna, setShowFauna] = useState(true);
  const [showObjects, setShowObjects] = useState(true);
  const [showCaves, setShowCaves] = useState(true);
  const [showRivers, setShowRivers] = useState(true);
  const [showRelief, setShowRelief] = useState(false);
  const [showCarcasses, setShowCarcasses] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showCaveMarkers, setShowCaveMarkers] = useState(false);
  const [caveXRay, setCaveXRay] = useState(false);
  const [subsoil, setSubsoil] = useState(false);
  const [vegetationOpacity, setVegetationOpacity] = useState(1);
  const [showPredationHighlights, setShowPredationHighlights] = useState(true);
  const [activePreset, setActivePreset] = useState<LayerPreset>("explore");
  // Manual switch toggles drop the named preset back to a custom/advanced state.
  const handleToggleLayer = useCallback((key: LayerKey) => {
    setActivePreset("explore");
    switch (key) {
      case "objects": setShowObjects((v) => !v); break;
      case "rivers": setShowRivers((v) => !v); break;
      case "caves": setShowCaves((v) => !v); break;
      case "relief": setShowRelief((v) => !v); break;
      case "fauna": setShowFauna((v) => !v); break;
      case "carcasses": setShowCarcasses((v) => !v); break;
      case "events": setShowEvents((v) => !v); break;
      case "predation": setShowPredationHighlights((v) => !v); break;
      case "markers": setShowCaveMarkers((v) => !v); break;
      case "xray": setCaveXRay((v) => !v); break;
      case "subsoil": setSubsoil((v) => !v); break;
    }
  }, []);
  // One-click view presets. The Cave preset thins vegetation and lights up the
  // cave/x-ray/relief layers so the underground structure is immediately legible.
  const handleApplyPreset = useCallback((preset: LayerPreset) => {
    setActivePreset(preset);
    switch (preset) {
      case "explore":
        // Natural ecosystem: no debug rings/markers/x-ray/relief overlays.
        setShowFauna(true); setShowEvents(true); setShowObjects(true); setShowRivers(true);
        setShowCaves(true); setShowRelief(false); setShowCarcasses(true); setCaveXRay(false);
        setShowCaveMarkers(false); setSubsoil(false); setVegetationOpacity(1);
        break;
      case "terrain":
        setShowFauna(false); setShowEvents(false); setShowObjects(true); setShowRivers(true);
        setShowCaves(true); setShowRelief(true); setShowCarcasses(false); setCaveXRay(false);
        setShowCaveMarkers(false); setSubsoil(false); setVegetationOpacity(0.3);
        break;
      case "caves":
        setShowFauna(false); setShowEvents(false); setShowObjects(false); setShowRivers(true);
        setShowCaves(true); setShowRelief(true); setShowCarcasses(false); setCaveXRay(true);
        setShowCaveMarkers(true); setSubsoil(false); setVegetationOpacity(0.25);
        break;
      case "subsoil":
        // Strong underground focus: translucent terrain, interiors emphasised.
        setShowFauna(false); setShowEvents(false); setShowObjects(false); setShowRivers(true);
        setShowCaves(true); setShowRelief(false); setShowCarcasses(false); setCaveXRay(true);
        setShowCaveMarkers(false); setSubsoil(true); setVegetationOpacity(0);
        break;
      case "fauna":
        setShowFauna(true); setShowEvents(true); setShowObjects(false); setShowRivers(true);
        setShowCaves(false); setShowRelief(false); setShowCarcasses(true); setCaveXRay(false);
        setShowCaveMarkers(false); setSubsoil(false); setVegetationOpacity(0.6);
        break;
      case "clean":
        setShowFauna(false); setShowEvents(false); setShowObjects(false); setShowRivers(true);
        setShowCaves(true); setShowRelief(false); setShowCarcasses(false); setCaveXRay(false);
        setShowCaveMarkers(false); setSubsoil(false); setVegetationOpacity(0);
        break;
    }
  }, []);
  const [rainEnabled, setRainEnabled] = useState(false);
  const [rainIntensity, setRainIntensity] = useState(70);
  const [displayTime, setDisplayTime] = useState("12:00");
  const [faunaLiveCount, setFaunaLiveCount] = useState(0);
  const [inspected, setInspected] = useState<TerrainCell | null>(null);
  const [faunaEvents, setFaunaEvents] = useState<FaunaEvent[]>([]);
  const [selectedFaunaEventId, setSelectedFaunaEventId] = useState<string | null>(null);
  const [isFaunaLoading, setIsFaunaLoading] = useState(false);
  const [faunaError, setFaunaError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<TerrainPromptResult | null>(null);
  const [report, setReport] = useState<EcosystemReport | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  // Macro relief shaping (oceano/montanha/polar) preservado entre regenerações manuais.
  const [terrainShape, setTerrainShape] = useState<{
    reliefStyle?: ReliefStyle;
    seaLevel?: number;
  }>({});
  const simulatedTimeRef = useRef(12);
  const reportFormations = report?.formations ?? EMPTY_FORMATIONS;

  function field(key: keyof TerrainForm) {
    return {
      value: form[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm((current) => ({ ...current, [key]: event.target.value }));
      },
    };
  }

  function numberOr(value: string, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  async function generate() {
    setIsLoading(true);
    setError(null);
    setReport(null);
    setFaunaSpecies([]);
    setFaunaLiveCount(0);
    setFaunaEvents([]);
    setSelectedFaunaEventId(null);
    setFaunaError(null);
    setIsFaunaLoading(false);

    try {
      const response = await ecologyApi.simulateTerrain({
        width: Math.min(64, Math.max(4, numberOr(form.width, 24))),
        height: Math.min(48, Math.max(4, numberOr(form.height, 18))),
        seed: numberOr(form.seed, 42),
        baseTemperatureC: numberOr(form.baseTemperatureC, 18),
        basePrecipitationMm: numberOr(form.basePrecipitationMm, 1200),
        baseHumidityPct: numberOr(form.baseHumidityPct, 60),
        reliefStyle: terrainShape.reliefStyle,
        seaLevel: terrainShape.seaLevel,
      });
      setGrid(response.data);

      setIsFaunaLoading(true);
      try {
        const faunaResponse = await ecologyApi.fauna({
          biomes: collectBiomes(response.data),
          grid: buildCompactFaunaGrid(response.data),
        });
        setFaunaSpecies(faunaResponse.data.species);
      } catch (faunaRequestError) {
        setFaunaError(getApiErrorMessage(faunaRequestError));
      } finally {
        setIsFaunaLoading(false);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  async function promptAndGenerate(overridePrompt?: string) {
    const effectivePrompt = (overridePrompt ?? aiPrompt).trim();
    if (!effectivePrompt) return;
    setIsAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setReport(null);
    setFaunaEvents([]);
    setSelectedFaunaEventId(null);

    try {
      // Uma única chamada: bioma + terreno + fauna + relatório estruturado.
      const response = await ecologyApi.ecosystemReport({ prompt: effectivePrompt });
      const result = response.data;
      setAiResult(result);
      setReport(result.report);
      setForm({
        width: String(result.terrainParams.width),
        height: String(result.terrainParams.height),
        seed: String(result.terrainParams.seed),
        baseTemperatureC: String(result.terrainParams.baseTemperatureC),
        basePrecipitationMm: String(result.terrainParams.basePrecipitationMm),
        baseHumidityPct: String(result.terrainParams.baseHumidityPct),
      });
      setTerrainShape({
        reliefStyle: result.terrainParams.reliefStyle,
        seaLevel: result.terrainParams.seaLevel,
      });

      // Aplica o terreno e a fauna já resolvidos pelo servidor
      setError(null);
      setFaunaLiveCount(0);
      setFaunaError(null);
      setIsFaunaLoading(false);
      setGrid(result.terrain);
      setFaunaSpecies(result.species);
    } catch (requestError) {
      setAiError(getApiErrorMessage(requestError));
    } finally {
      setIsAiLoading(false);
    }
  }

  // Gera automaticamente quando um prompt chega de outra aba (ex: chat da Consulta).
  // O ref evita disparo duplicado para o mesmo prompt (StrictMode / re-render).
  const consumedPromptRef = useRef<string | null>(null);
  useEffect(() => {
    const incoming = initialPrompt?.trim();
    if (!incoming || consumedPromptRef.current === incoming) return;
    consumedPromptRef.current = incoming;
    setAiPrompt(incoming);
    void promptAndGenerate(incoming);
    onInitialPromptConsumed?.();
  }, [initialPrompt]);

  useEffect(() => {
    const syncDisplayTime = () => {
      setDisplayTime(formatSimulatedTime(simulatedTimeRef.current));
    };

    syncDisplayTime();
    const intervalId = window.setInterval(syncDisplayTime, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspected(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    window.__terrainDebug = {
      lightningObserved: window.__terrainDebug?.lightningObserved ?? false,
      setRainEnabled,
      setRainIntensity,
      setSimulatedTime: (hour: number) => {
        simulatedTimeRef.current = ((hour % 24) + 24) % 24;
        setDisplayTime(formatSimulatedTime(simulatedTimeRef.current));
      },
      simulatedTimeRef,
    };

    return () => {
      delete window.__terrainDebug;
    };
  }, [setRainEnabled, setRainIntensity]);

  return (
    <div className="page-stack">
      <style>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;700&display=swap");

        .terrain-shell,
        .terrain-stage,
        .terrain-stage__tooltip,
        .terrain-stage__fallback {
          font-family: "JetBrains Mono", monospace;
        }

        .terrain-shell {
          display: grid;
          gap: 1rem;
        }

        .terrain-shell .signal-panel__header h3,
        .terrain-stage h4 {
          font-family: "Fraunces", serif;
          letter-spacing: 0;
        }

        .terrain-shell.signal-panel--llm {
          border-color: rgba(124, 88, 56, 0.18);
          background:
            linear-gradient(180deg, rgba(250, 241, 229, 0.98), rgba(244, 228, 209, 0.92));
          box-shadow: inset 0 1px 0 rgba(255, 247, 236, 0.8);
        }

        .terrain-ai-prompt {
          display: grid;
          gap: 0.6rem;
        }

        .terrain-ai-prompt__row {
          display: flex;
          gap: 0.7rem;
          align-items: flex-start;
        }

        .terrain-ai-prompt__input {
          flex: 1;
          resize: none;
          font-family: inherit;
          line-height: 1.5;
        }

        .terrain-ai-badge {
          display: grid;
          gap: 0.25rem;
          padding: 0.65rem 0.85rem;
          border-radius: 0.55rem;
          border: 1px solid rgba(124, 88, 56, 0.22);
          background: rgba(255, 248, 238, 0.78);
          font-size: 0.84rem;
          color: #5f3826;
        }

        .terrain-ai-badge strong {
          font-size: 0.92rem;
          color: #3d2010;
        }

        .terrain-ai-badge__meta {
          font-size: 0.75rem;
          color: #9b6e4e;
          font-family: "JetBrains Mono", monospace;
          margin-top: 0.1rem;
        }

        .terrain-ai-error {
          margin: 0;
          font-size: 0.82rem;
          color: #b03a2e;
        }

        .terrain-shell .signal-panel__header p,
        .terrain-shell .signal-message span {
          max-width: 72ch;
        }

        .terrain-stage {
          display: grid;
          gap: 0.85rem;
        }

        .terrain-stage__chrome {
          display: grid;
          gap: 0.85rem;
          align-items: start;
        }

        .terrain-stage__eyebrow {
          margin: 0 0 0.35rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-size: 0.72rem;
          color: #946542;
        }

        .terrain-stage h4 {
          margin: 0;
          font-size: clamp(1.7rem, 2vw, 2.35rem);
          color: #5f3826;
        }

        .terrain-stage__summary {
          margin: 0.35rem 0 0;
          font-size: 0.84rem;
          line-height: 1.6;
          color: #77553d;
        }

        .terrain-stage__legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .terrain-stage__legend-item {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(125, 88, 55, 0.14);
          background: rgba(255, 248, 238, 0.72);
          color: #6c4b36;
          font-size: 0.72rem;
          line-height: 1;
          backdrop-filter: blur(6px);
        }

        .terrain-stage__legend-swatch {
          width: 0.72rem;
          height: 0.72rem;
          border-radius: 50%;
          background: var(--terrain-legend-swatch, #d4b191);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
          flex: 0 0 auto;
        }

        .terrain-stage__legend--fauna {
          padding-top: 0.1rem;
        }

        .terrain-stage__legend-swatch--polygon {
          border-radius: 0.14rem;
          transform: rotate(45deg);
          border: 1px solid rgba(35, 25, 18, 0.22);
        }

        .terrain-stage__viewport {
          position: relative;
          min-height: 32rem;
          border-radius: 0.9rem;
          overflow: hidden;
          border: 1px solid rgba(123, 86, 54, 0.18);
          background:
            linear-gradient(180deg, rgba(255, 228, 191, 0.88), rgba(221, 170, 120, 0.84));
          box-shadow:
            inset 0 1px 0 rgba(255, 250, 242, 0.72),
            0 18px 42px rgba(104, 71, 44, 0.14);
        }

        .terrain-stage__viewport canvas {
          display: block;
        }

        .terrain-stage__vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 244, 225, 0) 36%, rgba(111, 60, 32, 0.13) 100%),
            radial-gradient(circle at 50% 100%, rgba(126, 77, 43, 0.16), rgba(126, 77, 43, 0) 48%);
        }

        .terrain-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
        }

        .terrain-inspector,
        .terrain-events {
          position: absolute;
          pointer-events: auto;
          border-radius: 0.5rem;
          border: 1px solid rgba(88, 59, 38, 0.16);
          background: rgba(255, 249, 240, 0.94);
          color: #513521;
          box-shadow: 0 16px 34px rgba(78, 50, 28, 0.18);
          backdrop-filter: blur(12px);
        }

        .terrain-inspector {
          top: 0.75rem;
          right: 0.75rem;
          width: min(23rem, calc(100% - 1.5rem));
          max-height: calc(100% - 1.5rem);
          overflow: auto;
          padding: 0.85rem;
        }

        .terrain-inspector__header,
        .terrain-events__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .terrain-inspector__header button,
        .terrain-events__header button {
          border: 1px solid rgba(107, 75, 50, 0.22);
          border-radius: 0.4rem;
          background: rgba(255, 255, 255, 0.52);
          color: #5d3d28;
          font: inherit;
          font-size: 0.76rem;
          padding: 0.26rem 0.5rem;
          cursor: pointer;
        }

        .terrain-inspector__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
          margin: 0.75rem 0 0;
        }

        .terrain-inspector__grid div {
          min-width: 0;
          padding: 0.42rem 0.5rem;
          border-radius: 0.4rem;
          background: rgba(110, 75, 47, 0.08);
        }

        .terrain-inspector dt,
        .terrain-events small,
        .terrain-inspector__species span {
          display: block;
          color: #8a684d;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .terrain-inspector dd {
          margin: 0.18rem 0 0;
          font-size: 0.8rem;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .terrain-inspector__section {
          margin-top: 0.9rem;
          padding-top: 0.8rem;
          border-top: 1px solid rgba(111, 74, 45, 0.16);
        }

        .terrain-inspector__species {
          margin-top: 0.7rem;
          padding: 0.55rem 0.6rem;
          border-radius: 0.45rem;
          background: rgba(26, 25, 22, 0.06);
        }

        .terrain-inspector__species p {
          margin: 0.22rem 0 0;
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .terrain-inspector__hint {
          margin: 0.6rem 0 0;
          padding: 0.4rem 0.5rem;
          border-radius: 0.4rem;
          background: rgba(76, 198, 240, 0.12);
          color: #2a6c86;
          font-size: 0.76rem;
          line-height: 1.35;
        }

        .terrain-inspector__action {
          margin-top: 0.6rem;
          width: 100%;
          padding: 0.42rem 0.5rem;
          border: 1px solid rgba(124, 88, 56, 0.3);
          border-radius: 0.45rem;
          background: rgba(124, 88, 56, 0.12);
          color: #5d3d28;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .terrain-inspector__action:hover { background: rgba(124, 88, 56, 0.2); }

        .terrain-events {
          top: 0.75rem;
          left: 0.75rem;
          width: min(20rem, calc(100% - 1.5rem));
          padding: 0.75rem;
        }

        .terrain-events__list {
          display: grid;
          gap: 0.4rem;
          margin-top: 0.55rem;
          max-height: 18rem;
          overflow: auto;
        }

        .terrain-events__item {
          display: grid;
          grid-template-columns: 0.6rem minmax(0, 1fr);
          align-items: start;
          gap: 0.5rem;
          width: 100%;
          min-height: 2.5rem;
          padding: 0.45rem 0.5rem;
          border: 1px solid transparent;
          border-radius: 0.45rem;
          background: rgba(255, 255, 255, 0.38);
          color: #4b3324;
          font: inherit;
          font-size: 0.78rem;
          line-height: 1.3;
          text-align: left;
          cursor: pointer;
        }

        .terrain-events__item--selected {
          border-color: rgba(111, 70, 37, 0.28);
          background: rgba(255, 244, 228, 0.8);
        }

        .terrain-events__dot {
          width: 0.52rem;
          height: 0.52rem;
          margin-top: 0.2rem;
          border-radius: 999px;
          background: var(--event-color, #f0c84f);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--event-color, #f0c84f) 18%, transparent);
        }

        .terrain-events__empty {
          margin: 0.55rem 0 0;
          color: #7c604a;
          font-size: 0.8rem;
        }

        /* ─── Event hub: collapsed chip + dark expandable panel (bottom-right) ── */
        .terrain-eventhub__chip {
          position: absolute;
          right: 0.75rem;
          bottom: 0.75rem;
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(26, 22, 18, 0.82);
          color: #f4ead9;
          font: inherit;
          font-size: 0.78rem;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(20, 12, 6, 0.32);
          backdrop-filter: blur(8px);
        }

        .terrain-eventhub__chip-icon { color: #f0c84f; }

        .terrain-eventhub__chip-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.35rem;
          border-radius: 999px;
          background: rgba(240, 200, 79, 0.22);
          color: #ffdf94;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .terrain-eventhub {
          position: absolute;
          right: 0.75rem;
          bottom: 0.75rem;
          pointer-events: auto;
          width: min(20rem, calc(100% - 1.5rem));
          padding: 0.7rem 0.75rem;
          border-radius: 0.7rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(24, 20, 17, 0.88);
          color: #f1e6d6;
          box-shadow: 0 16px 34px rgba(18, 11, 5, 0.4);
          backdrop-filter: blur(12px);
        }

        .terrain-eventhub__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .terrain-eventhub__header strong {
          font-size: 0.86rem;
          color: #fbf2e4;
        }

        .terrain-eventhub__header button {
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 0.4rem;
          background: rgba(255, 255, 255, 0.06);
          color: #f1e6d6;
          font: inherit;
          font-size: 0.76rem;
          line-height: 1;
          padding: 0.26rem 0.46rem;
          cursor: pointer;
        }

        .terrain-eventhub__list {
          display: grid;
          gap: 0.32rem;
          margin-top: 0.55rem;
          /* ~5 rows visible, the rest scrolls internally */
          max-height: 13.5rem;
          overflow-y: auto;
        }

        .terrain-eventhub__item {
          display: grid;
          grid-template-columns: 1.4rem minmax(0, 1fr);
          align-items: start;
          gap: 0.5rem;
          width: 100%;
          padding: 0.42rem 0.48rem;
          border: 1px solid transparent;
          border-radius: 0.45rem;
          background: rgba(255, 255, 255, 0.04);
          color: #ecdfcd;
          font: inherit;
          font-size: 0.78rem;
          line-height: 1.3;
          text-align: left;
          cursor: pointer;
        }

        .terrain-eventhub__item:hover { background: rgba(255, 255, 255, 0.09); }

        .terrain-eventhub__item.is-selected {
          border-color: color-mix(in srgb, var(--event-color, #f0c84f) 55%, transparent);
          background: rgba(255, 255, 255, 0.1);
        }

        .terrain-eventhub__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.4rem;
          height: 1.4rem;
          border-radius: 0.4rem;
          font-size: 0.82rem;
          background: color-mix(in srgb, var(--event-color, #f0c84f) 26%, transparent);
        }

        .terrain-eventhub__text { min-width: 0; }

        .terrain-eventhub__text small {
          display: block;
          color: #c6ab8c;
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .terrain-eventhub__empty {
          margin: 0.5rem 0 0;
          color: #c0a98d;
          font-size: 0.78rem;
        }

        /* ─── Discreet auto-dismiss toasts (bottom-center) ───────────────────── */
        .terrain-toasts {
          position: absolute;
          left: 50%;
          bottom: 0.85rem;
          transform: translateX(-50%);
          display: grid;
          gap: 0.4rem;
          width: max-content;
          max-width: min(24rem, calc(100% - 1.5rem));
          pointer-events: none;
          z-index: 3;
        }

        .terrain-toast {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(24, 18, 14, 0.9);
          color: #f4ead9;
          font-size: 0.8rem;
          box-shadow: 0 12px 28px rgba(16, 9, 4, 0.4);
          animation: terrain-toast-in 180ms ease;
        }

        .terrain-toast__icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.4rem;
          height: 1.4rem;
          border-radius: 50%;
          background: color-mix(in srgb, var(--event-color, #e24834) 32%, transparent);
        }

        @keyframes terrain-toast-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ─── Compact layer switcher (top-left) ──────────────────────────────── */
        .terrain-layers {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          pointer-events: auto;
          display: grid;
          gap: 0.5rem;
          z-index: 3;
        }

        .terrain-layers__button {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          width: max-content;
          padding: 0.5rem 0.72rem;
          border-radius: 0.55rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(26, 22, 18, 0.82);
          color: #f4ead9;
          font: inherit;
          font-size: 0.78rem;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(20, 12, 6, 0.3);
          backdrop-filter: blur(8px);
        }

        .terrain-layers.is-open .terrain-layers__button {
          border-color: rgba(240, 200, 79, 0.5);
        }

        .terrain-layers__button-icon { color: #f0c84f; }

        .terrain-layers__panel {
          width: 14rem;
          padding: 0.6rem 0.65rem;
          border-radius: 0.7rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(24, 20, 17, 0.92);
          color: #f1e6d6;
          box-shadow: 0 18px 36px rgba(16, 9, 4, 0.42);
          backdrop-filter: blur(12px);
        }

        .terrain-layers__presets {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.3rem;
          margin-bottom: 0.55rem;
        }

        .terrain-layers__preset--mode {
          font-size: 0.7rem;
          padding: 0.3rem 0;
        }

        .terrain-layers__summary {
          margin: 0 0 0.55rem;
          padding: 0.4rem 0.5rem;
          border-radius: 0.4rem;
          background: rgba(202, 164, 106, 0.16);
          color: #f0dcbd;
          font-size: 0.72rem;
          line-height: 1.35;
        }

        .terrain-layers__advanced-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-top: 0.5rem;
          padding: 0.34rem 0.3rem;
          border: 0;
          border-radius: 0.42rem;
          background: rgba(255, 255, 255, 0.05);
          color: #d9c7ad;
          font: inherit;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .terrain-layers__veg {
          display: grid;
          gap: 0.42rem;
          padding-bottom: 0.6rem;
          margin-bottom: 0.6rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .terrain-layers__veg > label {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #c6ab8c;
        }

        .terrain-layers__veg input[type="range"] {
          width: 100%;
          accent-color: #6f9e57;
        }

        .terrain-layers__veg-presets { display: flex; gap: 0.34rem; }

        .terrain-layers__preset {
          flex: 1;
          padding: 0.26rem 0;
          border-radius: 0.4rem;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.05);
          color: #ecdfcd;
          font: inherit;
          font-size: 0.72rem;
          cursor: pointer;
        }

        .terrain-layers__preset.is-active {
          border-color: rgba(111, 158, 87, 0.7);
          background: rgba(111, 158, 87, 0.26);
          color: #f4ffe9;
        }

        .terrain-layers__switches {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.12rem 0.3rem;
          margin-top: 0.4rem;
        }

        .terrain-layers__switch {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          width: 100%;
          padding: 0.34rem 0.3rem;
          border: 0;
          border-radius: 0.42rem;
          background: transparent;
          color: #ecdfcd;
          font: inherit;
          font-size: 0.8rem;
          text-align: left;
          cursor: pointer;
        }

        .terrain-layers__switch:hover { background: rgba(255, 255, 255, 0.06); }
        .terrain-layers__switch:disabled { opacity: 0.4; cursor: default; }

        .terrain-layers__switch-track {
          position: relative;
          flex: 0 0 auto;
          width: 2rem;
          height: 1.1rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          transition: background-color 150ms ease;
        }

        .terrain-layers__switch.is-active .terrain-layers__switch-track {
          background: rgba(111, 158, 87, 0.85);
        }

        .terrain-layers__switch-thumb {
          position: absolute;
          top: 0.13rem;
          left: 0.14rem;
          width: 0.84rem;
          height: 0.84rem;
          border-radius: 50%;
          background: #fdf6ea;
          transition: transform 150ms ease;
        }

        .terrain-layers__switch.is-active .terrain-layers__switch-thumb {
          transform: translateX(0.9rem);
        }

        .terrain-layers__switch-label { min-width: 0; }

        .terrain-layers__mode {
          margin: 0 0 0.5rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #f0c84f;
        }

        .terrain-layers__preset--mode.is-active {
          border-color: rgba(240, 200, 79, 0.7);
          background: rgba(240, 200, 79, 0.22);
          color: #ffe9a8;
        }

        /* ─── Animals present: chip (bottom-left) + dark filterable panel ─────── */
        .terrain-animals__chip {
          position: absolute;
          left: 0.75rem;
          bottom: 0.75rem;
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.5rem 0.7rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(26, 22, 18, 0.82);
          color: #f4ead9;
          font: inherit;
          font-size: 0.78rem;
          cursor: pointer;
          box-shadow: 0 10px 24px rgba(20, 12, 6, 0.32);
          backdrop-filter: blur(8px);
          z-index: 3;
        }

        .terrain-animals__chip-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.25rem;
          height: 1.25rem;
          padding: 0 0.35rem;
          border-radius: 999px;
          background: rgba(111, 158, 87, 0.28);
          color: #d7f1c5;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .terrain-animals {
          position: absolute;
          left: 0.75rem;
          bottom: 0.75rem;
          pointer-events: auto;
          width: min(21rem, calc(100% - 1.5rem));
          padding: 0.7rem 0.75rem;
          border-radius: 0.7rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(24, 20, 17, 0.9);
          color: #f1e6d6;
          box-shadow: 0 16px 34px rgba(18, 11, 5, 0.4);
          backdrop-filter: blur(12px);
          z-index: 3;
        }

        .terrain-animals__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .terrain-animals__header strong { font-size: 0.86rem; }

        .terrain-animals__header button {
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 0.4rem;
          background: rgba(255, 255, 255, 0.06);
          color: #f1e6d6;
          font: inherit;
          font-size: 0.76rem;
          padding: 0.24rem 0.44rem;
          cursor: pointer;
        }

        .terrain-animals__filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.26rem;
          margin: 0.55rem 0;
        }

        .terrain-animals__filter {
          padding: 0.24rem 0.5rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.05);
          color: #d9c7ad;
          font: inherit;
          font-size: 0.7rem;
          cursor: pointer;
        }

        .terrain-animals__filter.is-active {
          border-color: rgba(111, 158, 87, 0.7);
          background: rgba(111, 158, 87, 0.24);
          color: #f4ffe9;
        }

        .terrain-animals__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.26rem;
          max-height: 14rem;
          overflow-y: auto;
        }

        .terrain-animals__item {
          display: grid;
          grid-template-columns: 0.6rem minmax(0, 1fr);
          align-items: baseline;
          gap: 0.5rem;
          font-size: 0.78rem;
        }

        .terrain-animals__dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          background: var(--strategy-color, #d9c7ad);
        }

        .terrain-animals__name { font-weight: 600; color: #fbf2e4; }

        .terrain-animals__tags {
          grid-column: 2;
          color: #c0a98d;
          font-size: 0.7rem;
        }

        .terrain-animals__empty { margin: 0.3rem 0 0; color: #c0a98d; font-size: 0.78rem; }

        .ecosystem-report__animals {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.3rem;
          max-height: 16rem;
          overflow-y: auto;
        }

        .ecosystem-report__animals li {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          padding: 0.3rem 0.4rem;
          border-radius: 0.4rem;
          background: rgba(110, 75, 47, 0.06);
        }

        .ecosystem-report__animals strong { font-size: 0.88rem; }
        .ecosystem-report__animals span { font-size: 0.74rem; opacity: 0.75; }

        .terrain-stage__tooltip {
          display: grid;
          gap: 0.22rem;
          min-width: 11.25rem;
          max-width: min(15rem, 72vw);
          padding: 0.68rem 0.78rem;
          border-radius: 0.72rem;
          border: 1px solid rgba(113, 75, 47, 0.14);
          background: rgba(255, 249, 239, 0.94);
          color: #5e3d29;
          box-shadow: 0 16px 36px rgba(88, 55, 30, 0.18);
          backdrop-filter: blur(10px);
          white-space: normal;
        }

        .terrain-stage__tooltip strong {
          font-family: "Fraunces", serif;
          font-size: 1rem;
          font-weight: 600;
        }

        .terrain-stage__tooltip span {
          font-size: 0.72rem;
          line-height: 1.45;
        }

        .terrain-stage__fallback {
          display: grid;
          place-items: center;
          gap: 0.4rem;
          min-height: 32rem;
          padding: 1.5rem;
          color: #654430;
          text-align: center;
          background:
            linear-gradient(180deg, rgba(255, 246, 234, 0.98), rgba(244, 224, 198, 0.94));
        }

        .terrain-fauna-control {
          display: grid;
          gap: 0.6rem;
          padding: 0.85rem 0.95rem;
          border-radius: 1rem;
          border: 1px solid rgba(129, 91, 53, 0.14);
          background: rgba(255, 248, 237, 0.82);
        }

        .terrain-fauna-control__label {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #7a573c;
        }

        .terrain-fauna-control__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }

        .terrain-fauna-control__range {
          width: 100%;
          accent-color: #9c6f3d;
        }

        .terrain-fauna-control--status strong {
          font-size: 1.1rem;
          color: #50311d;
        }

        .terrain-fauna-control__meta {
          color: #7c5f4a;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .terrain-fauna-control__stack {
          display: grid;
          gap: 0.72rem;
        }

        .terrain-fauna-control__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          color: #6d4b35;
          font-size: 0.88rem;
        }

        .terrain-fauna-control__row strong {
          font-size: 1rem;
          color: #4f2f1c;
        }

        .terrain-fauna-control__subrow {
          display: grid;
          gap: 0.45rem;
        }

        .terrain-fauna-control__hint {
          display: inline-flex;
          align-items: center;
          gap: 0.42rem;
          color: #8b5a39;
          font-size: 0.8rem;
        }

        .terrain-fauna-control__toggle {
          position: relative;
          display: inline-flex;
          align-items: center;
          width: 3.1rem;
          height: 1.8rem;
          border: 0;
          padding: 0;
          border-radius: 999px;
          background: transparent;
          cursor: pointer;
        }

        .terrain-fauna-control__toggle:disabled {
          cursor: default;
          opacity: 0.6;
        }

        .terrain-fauna-control__toggle-track {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          border: 1px solid rgba(129, 91, 53, 0.2);
          background: rgba(162, 132, 100, 0.2);
          transition: background-color 160ms ease, border-color 160ms ease;
        }

        .terrain-fauna-control__toggle.is-active .terrain-fauna-control__toggle-track {
          background: rgba(156, 111, 61, 0.8);
          border-color: rgba(126, 82, 43, 0.78);
        }

        .terrain-fauna-control__toggle-thumb {
          position: absolute;
          top: 0.14rem;
          left: 0.16rem;
          width: 1.3rem;
          height: 1.3rem;
          border-radius: 50%;
          background: rgba(255, 248, 238, 0.96);
          box-shadow: 0 4px 12px rgba(92, 58, 33, 0.22);
          transition: transform 160ms ease;
        }

        .terrain-fauna-control__toggle.is-active .terrain-fauna-control__toggle-thumb {
          transform: translateX(1.28rem);
        }

        @media (min-width: 960px) {
          .terrain-stage__chrome {
            grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
          }

          .terrain-stage__legend {
            justify-content: flex-end;
            align-content: start;
          }
        }

        @media (max-width: 720px) {
          .terrain-stage__viewport {
            min-height: 25rem;
          }

          .terrain-inspector {
            left: 0.55rem;
            right: 0.55rem;
            width: auto;
            top: 0.55rem;
            max-height: 44%;
          }

          .terrain-eventhub {
            left: 0.55rem;
            right: 0.55rem;
            width: auto;
          }

          .terrain-layers__panel {
            width: min(15.5rem, calc(100vw - 1.6rem));
          }

          .terrain-stage__tooltip {
            min-width: 9.6rem;
            padding: 0.6rem 0.7rem;
          }

          .terrain-stage__legend-item {
            padding: 0.42rem 0.62rem;
          }
        }
      `}</style>

      <section className="signal-panel signal-panel--llm terrain-shell">
        <div className="signal-panel__header">
          <div>
            <h3>Simulacao 3D de ecossistemas</h3>
            <p>
              Gera um relevo low-poly com ciclo automatico de dia e noite, chuva dinamica,
              relampagos ocasionais, agua translucida e vegetacao instanciada por bioma.
              Arraste para orbitar; o giro inicial para sozinho apos 4 segundos ou no
              primeiro gesto.
            </p>
          </div>
        </div>

        <div className="terrain-ai-prompt">
          <div className="terrain-ai-prompt__row">
            <textarea
              className="ui-input terrain-ai-prompt__input"
              placeholder="Descreva o ecossistema: 'cerrado brasileiro', 'pantanal alagado', 'amazonia densa', 'deserto quente'..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void promptAndGenerate();
              }}
              rows={2}
              disabled={isAiLoading}
            />
            <Button
              variant="primary"
              onClick={() => void promptAndGenerate()}
              disabled={isAiLoading || !aiPrompt.trim()}
            >
              <Sparkle weight="duotone" />
              {isAiLoading ? "Interpretando..." : "Gerar via IA"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setAiPrompt(DEMO_PROMPT);
                void promptAndGenerate(DEMO_PROMPT);
              }}
              disabled={isAiLoading}
              title="Prompt fixo de demonstração"
            >
              Exemplo
            </Button>
          </div>

          {aiResult && !isAiLoading ? (
            <div className="terrain-ai-badge">
              <strong>{aiResult.biomeName}</strong>
              <span>{aiResult.interpretation}</span>
              <span className="terrain-ai-badge__meta">
                {aiResult.terrainParams.baseTemperatureC}°C · {aiResult.terrainParams.basePrecipitationMm}mm · {aiResult.terrainParams.baseHumidityPct}% humidade
              </span>
            </div>
          ) : null}

          {aiError ? (
            <p className="terrain-ai-error">{aiError}</p>
          ) : null}
        </div>

        <div className="ecology-form-grid">
          <div className="ui-input-field">
            <label className="ui-input-field__label">Largura (4-64)</label>
            <input type="number" className="ui-input" min={4} max={64} {...field("width")} />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Altura (4-48)</label>
            <input type="number" className="ui-input" min={4} max={48} {...field("height")} />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Seed</label>
            <input type="number" className="ui-input" {...field("seed")} />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Temperatura base (C)</label>
            <input
              type="number"
              className="ui-input"
              min={-30}
              max={40}
              {...field("baseTemperatureC")}
            />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Precipitacao base (mm/ano)</label>
            <input
              type="number"
              className="ui-input"
              min={0}
              max={8000}
              {...field("basePrecipitationMm")}
            />
          </div>
          <div className="ui-input-field">
            <label className="ui-input-field__label">Umidade base (%)</label>
            <input
              type="number"
              className="ui-input"
              min={0}
              max={100}
              {...field("baseHumidityPct")}
            />
          </div>
          <div className="terrain-fauna-control">
            <span className="terrain-fauna-control__label">Fauna animada</span>
            <div className="terrain-fauna-control__actions">
              <Button
                variant="ghost"
                onClick={() => setFaunaPaused((current) => !current)}
                disabled={!grid}
              >
                {faunaPaused ? "Play" : "Pause"}
              </Button>
            </div>
            <span className="terrain-fauna-control__meta">
              Camadas (vegetacao, rios, cavernas, relevo, fauna, eventos, raio-X) ficam no botao
              "Camadas" sobre o mapa 3D.
            </span>
          </div>
          <div className="terrain-fauna-control">
            <label className="terrain-fauna-control__label" htmlFor="terrain-fauna-speed">
              Velocidade {faunaSpeedMultiplier.toFixed(2)}x
            </label>
            <input
              id="terrain-fauna-speed"
              type="range"
              className="terrain-fauna-control__range"
              min={0.25}
              max={4}
              step={0.25}
              value={faunaSpeedMultiplier}
              onChange={(event) => setFaunaSpeedMultiplier(Number(event.target.value))}
              disabled={!grid}
            />
          </div>
          <div className="terrain-fauna-control terrain-fauna-control--status">
            <span className="terrain-fauna-control__label">Fauna viva</span>
            <strong>
              {isFaunaLoading
                ? "carregando..."
                : faunaSpecies.length > 0
                  ? `${faunaLiveCount} individuos`
                  : grid
                    ? "sem especies"
                    : "--"}
            </strong>
            <span className="terrain-fauna-control__meta">
              {faunaSpecies.length > 0
                ? `${faunaSpecies.length} especies do bioma`
                : grid && !isFaunaLoading
                  ? "aguardando especies compativeis"
                  : "gera o terreno para ativar"}
            </span>
          </div>
          <div
            className="terrain-fauna-control"
            data-testid="terrain-environment-panel"
          >
            <span className="terrain-fauna-control__label">Ambiente</span>
            <div className="terrain-fauna-control__stack">
              <div className="terrain-fauna-control__row">
                <span>Hora</span>
                <strong>{displayTime}</strong>
              </div>

              <div className="terrain-fauna-control__row">
                <span>Chuva</span>
                <button
                  type="button"
                  className={`terrain-fauna-control__toggle${rainEnabled ? " is-active" : ""}`}
                  onClick={() => setRainEnabled((current) => !current)}
                  aria-pressed={rainEnabled}
                  aria-label={rainEnabled ? "Desligar chuva" : "Ligar chuva"}
                >
                  <span className="terrain-fauna-control__toggle-track" aria-hidden="true" />
                  <span className="terrain-fauna-control__toggle-thumb" aria-hidden="true" />
                </button>
              </div>

              {rainEnabled ? (
                <div className="terrain-fauna-control__subrow">
                  <label className="terrain-fauna-control__label" htmlFor="terrain-rain-intensity">
                    Intensidade {rainIntensity}
                  </label>
                  <input
                    id="terrain-rain-intensity"
                    type="range"
                    className="terrain-fauna-control__range"
                    min={0}
                    max={100}
                    step={1}
                    value={rainIntensity}
                    onChange={(event) => setRainIntensity(Number(event.target.value))}
                  />
                </div>
              ) : null}

              {rainEnabled && rainIntensity >= 60 ? (
                <span className="terrain-fauna-control__hint">⚡ Relampagos ativos</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="form-actions">
          <Button
            variant="primary"
            onClick={() => void generate()}
            disabled={isLoading}
            data-testid="terrain-generate-btn"
          >
            <Mountains weight="duotone" />
            {isLoading ? "Gerando ecossistema..." : "Gerar ecossistema 3D"}
          </Button>
        </div>
      </section>

      {isLoading ? <LoadingBlock label="Gerando relevo, agua e biomas..." /> : null}

      {error && !isLoading ? (
        <ErrorState
          title="Erro na simulacao"
          message={error}
          onRetry={() => void generate()}
        />
      ) : null}

      {!grid && !error && !isLoading ? (
        <EmptyState
          icon={<Mountains weight="duotone" />}
          title="Nenhum ecossistema gerado"
          description="Defina os parametros e gere um grid para abrir o visualizador 3D."
          actionLabel="Gerar ecossistema 3D"
          onAction={() => void generate()}
        />
      ) : null}

      {grid && !isLoading ? (
        <section className="signal-panel terrain-shell">
          <TerrainView
            grid={grid}
            faunaSpecies={faunaSpecies}
            faunaPaused={faunaPaused}
            faunaSpeedMultiplier={faunaSpeedMultiplier}
            showFauna={showFauna}
            showObjects={showObjects}
            showCaves={showCaves}
            showRivers={showRivers}
            showRelief={showRelief}
            showCarcasses={showCarcasses}
            showEvents={showEvents}
            showCaveMarkers={showCaveMarkers}
            caveXRay={caveXRay}
            subsoil={subsoil}
            vegetationOpacity={vegetationOpacity}
            showPredationHighlights={showPredationHighlights}
            activePreset={activePreset}
            onToggleLayer={handleToggleLayer}
            onVegetationOpacityChange={setVegetationOpacity}
            onApplyPreset={handleApplyPreset}
            rainEnabled={rainEnabled}
            rainIntensity={rainIntensity}
            simulatedTimeRef={simulatedTimeRef}
            onLightningObserved={() => {
              if (window.__terrainDebug) {
                window.__terrainDebug.lightningObserved = true;
              }
            }}
            onFaunaCountUpdate={setFaunaLiveCount}
            inspected={inspected}
            setInspected={setInspected}
            faunaEvents={faunaEvents}
            setFaunaEvents={setFaunaEvents}
            selectedFaunaEventId={selectedFaunaEventId}
            setSelectedFaunaEventId={setSelectedFaunaEventId}
          />

          {faunaError ? (
            <div className="signal-message signal-message--warning" style={{ marginTop: "1rem" }}>
              <WarningCircle weight="duotone" />
              <div>
                <strong>Fauna indisponivel</strong>
                <span>{faunaError}</span>
              </div>
            </div>
          ) : null}

          {isFaunaLoading ? (
            <div className="signal-message signal-message--neutral" style={{ marginTop: "1rem" }}>
              <WarningCircle weight="duotone" />
              <div>
                <strong>Fauna em preparacao</strong>
                <span>Filtrando especies compativeis com os biomas do grid.</span>
              </div>
            </div>
          ) : null}

          <div className="signal-message signal-message--neutral" style={{ marginTop: "0.25rem" }}>
            <WarningCircle weight="duotone" />
            <div>
              <strong>Nota da simulacao</strong>
              <span>{grid.simulationNote}</span>
            </div>
          </div>
        </section>
      ) : null}

      {report && !isLoading ? (
        <section className="signal-panel ecosystem-report" data-testid="ecosystem-report-panel">
          <style>{`
            .ecosystem-report__grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
              gap: 0.75rem;
              margin-top: 0.5rem;
            }
            .ecosystem-report__card {
              border: 1px solid rgba(148, 163, 184, 0.25);
              border-radius: 0.6rem;
              padding: 0.8rem 0.9rem;
              background: rgba(148, 163, 184, 0.06);
            }
            .ecosystem-report__card h4 {
              margin: 0 0 0.5rem;
              font-size: 0.82rem;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              opacity: 0.75;
            }
            .ecosystem-report__card ul { margin: 0; padding-left: 1rem; }
            .ecosystem-report__card li { margin: 0.15rem 0; font-size: 0.9rem; }
            .ecosystem-report__facts { margin-top: 1rem; }
            .ecosystem-report__fact {
              border-left: 3px solid rgba(56, 189, 248, 0.6);
              padding: 0.2rem 0 0.2rem 0.7rem;
              margin: 0.5rem 0;
            }
            .ecosystem-report__fact strong { display: block; font-size: 0.9rem; }
            .ecosystem-report__fact span { font-size: 0.85rem; opacity: 0.85; }
            .ecosystem-report__fact small { opacity: 0.6; }
            .ecosystem-report__limitations li { margin: 0.2rem 0; font-size: 0.88rem; }
            .ecosystem-report__tag {
              display: inline-block;
              font-size: 0.72rem;
              padding: 0.1rem 0.5rem;
              border-radius: 999px;
              margin-left: 0.5rem;
            }
            .ecosystem-report__tag--ok { background: rgba(34, 197, 94, 0.18); }
            .ecosystem-report__tag--warn { background: rgba(234, 179, 8, 0.18); }

            .plausibility {
              border: 1px solid rgba(56, 189, 248, 0.3);
              border-radius: 0.6rem;
              padding: 0.85rem 0.95rem;
              margin: 0.5rem 0 0.25rem;
              background: rgba(56, 189, 248, 0.05);
            }
            .plausibility__head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.75rem;
              margin-bottom: 0.5rem;
            }
            .plausibility__head h4 { margin: 0; font-size: 0.95rem; }
            .plausibility__overall {
              font-size: 0.78rem;
              font-weight: 700;
              padding: 0.18rem 0.7rem;
              border-radius: 999px;
            }
            .plausibility__table { width: 100%; border-collapse: collapse; }
            .plausibility__table td {
              padding: 0.35rem 0.5rem;
              border-top: 1px solid rgba(148, 163, 184, 0.18);
              font-size: 0.88rem;
              vertical-align: top;
            }
            .plausibility__table td:first-child { font-weight: 600; white-space: nowrap; }
            .plausibility__detail { opacity: 0.8; }
            .plausibility__pill {
              display: inline-block;
              font-size: 0.74rem;
              font-weight: 700;
              padding: 0.1rem 0.6rem;
              border-radius: 999px;
              white-space: nowrap;
            }
            .plausibility__pill--alto, .plausibility__overall--alto { background: rgba(34, 197, 94, 0.22); color: #bbf7d0; }
            .plausibility__pill--medio, .plausibility__overall--medio { background: rgba(234, 179, 8, 0.22); color: #fde68a; }
            .plausibility__pill--baixo, .plausibility__overall--baixo { background: rgba(239, 68, 68, 0.22); color: #fecaca; }
            .plausibility__caveat { font-size: 0.78rem; opacity: 0.7; margin: 0.6rem 0 0; }
          `}</style>

          <div className="signal-panel__header">
            <div>
              <h3>Relatorio do ecossistema{aiResult ? `: ${aiResult.biomeName}` : ""}</h3>
              <p>
                Sintese estruturada do ambiente gerado a partir da descricao textual:
                clima, relevo, vegetacao, fauna, base de recurso, rede trofica, validacao
                deterministica e base cientifica.
              </p>
            </div>
          </div>

          <div className="plausibility" data-testid="plausibility-panel">
            <div className="plausibility__head">
              <h4>Plausibilidade ecologica</h4>
              <span className={`plausibility__overall plausibility__overall--${report.plausibility.overall}`}>
                {RATING_LABEL[report.plausibility.overall] ?? report.plausibility.overall}
              </span>
            </div>
            <table className="plausibility__table">
              <tbody>
                {report.plausibility.criteria.map((c) => (
                  <tr key={c.label}>
                    <td>{c.label}</td>
                    <td>
                      <span className={`plausibility__pill plausibility__pill--${c.rating}`}>
                        {RATING_LABEL[c.rating] ?? c.rating}
                      </span>
                    </td>
                    <td className="plausibility__detail">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="plausibility__caveat">{report.plausibility.caveat}</p>
          </div>

          {report.validation ? (
            <div className="plausibility" data-testid="validation-panel">
              <div className="plausibility__head">
                <h4>Validacao ecologica deterministica</h4>
                <span
                  className={`plausibility__overall plausibility__overall--${
                    report.validation.label === "alta"
                      ? "alto"
                      : report.validation.label === "moderada"
                        ? "medio"
                        : "baixo"
                  }`}
                >
                  {report.validation.score}/100 · {report.validation.label}
                </span>
              </div>
              <p className="plausibility__caveat" style={{ margin: "0 0 0.5rem" }}>
                Pontuacao calculada por servicos deterministicos (habitat, clima, cadeia trofica,
                recursos, riqueza e confianca dos dados) — nao pela IA. A IA apenas interpreta o texto
                e explica o resultado; a consistencia ecologica e imposta pelo backend.
              </p>
              <table className="plausibility__table">
                <tbody>
                  {report.validation.components.map((c) => {
                    const band = c.score >= 0.75 ? "alto" : c.score >= 0.5 ? "medio" : "baixo";
                    return (
                      <tr key={c.key}>
                        <td>{c.label}</td>
                        <td>
                          <span className={`plausibility__pill plausibility__pill--${band}`}>
                            {Math.round(c.score * 100)}%
                          </span>
                        </td>
                        <td className="plausibility__detail">{c.detail}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {report.validation.blockingContradictions.length > 0 ? (
                <ul className="ecosystem-report__limitations" style={{ marginTop: "0.5rem" }}>
                  {report.validation.blockingContradictions.map((b, i) => (
                    <li key={i}>Contradicao: {b}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="ecosystem-report__grid">
            <div className="ecosystem-report__card">
              <h4>Clima</h4>
              <ul>
                <li>
                  Base: {report.climate.baseTemperatureC}°C · {report.climate.basePrecipitationMm} mm/ano ·{" "}
                  {report.climate.baseHumidityPct}%
                </li>
                <li>
                  Temperatura: {report.climate.temperatureRangeC[0]}–{report.climate.temperatureRangeC[1]} °C
                </li>
                <li>
                  Precipitacao: {report.climate.precipitationRangeMm[0]}–{report.climate.precipitationRangeMm[1]} mm
                </li>
                <li>
                  Umidade: {report.climate.humidityRangePct[0]}–{report.climate.humidityRangePct[1]} %
                </li>
                <li>Koppen dominante: {report.climate.dominantClimateCode}</li>
              </ul>
            </div>

            <div className="ecosystem-report__card">
              <h4>Relevo</h4>
              <ul>
                <li>Elevacao: {report.relief.elevationMin}–{report.relief.elevationMax} (media {report.relief.elevationMean})</li>
                <li>Irregularidade: {report.relief.ruggedness}</li>
                <li>Cobertura de agua: {report.relief.waterCoveragePct}%</li>
                <li>Grid: {report.relief.width}×{report.relief.height} ({report.relief.cellCount} celulas)</li>
              </ul>
            </div>

            <div className="ecosystem-report__card">
              <h4>Formacoes do terreno</h4>
              <ul>
                <li>Sistemas de caverna: {reportFormations.caveSystems} ({reportFormations.caveCells} celulas)</li>
                <li>Entradas visiveis: {reportFormations.visibleEntrances} / celulas internas: {reportFormations.subterraneanCells}</li>
                <li>Camaras: {reportFormations.chamberCells} / tuneis: {reportFormations.tunnelCells} / conexoes: {reportFormations.connections}</li>
                <li>Maior sistema: {reportFormations.largestSystemCells} celulas{reportFormations.fallbackSingleCellSystems > 0 ? ` · ${reportFormations.fallbackSingleCellSystems} sistema(s) de celula unica (fallback)` : ""}</li>
                <li>Profundidade: max. {(reportFormations.maxCaveDepth * 100).toFixed(0)}% / media {(reportFormations.avgCaveDepth * 100).toFixed(0)}% · rasas {reportFormations.shallowCaveCount} / profundas {reportFormations.deepCaveCount}</li>
                <li>Tipos: {reportFormations.caveTypes.map((entry) => `${CAVE_TYPE_LABELS[entry.type] ?? entry.type} (${entry.count})`).join(", ") || "-"}</li>
                <li>Rios: {reportFormations.riverCells} celulas / fluxo max. {(reportFormations.maxWaterFlow * 100).toFixed(0)}% / quedas {reportFormations.waterfallCells}</li>
                <li>Relevo: montanha {reportFormations.mountainCoveragePct}% / penhasco {reportFormations.cliffCoveragePct}% / saliencias {reportFormations.ledgeCells}</li>
              </ul>
            </div>

            <div className="ecosystem-report__card">
              <h4>Vegetacao</h4>
              <ul>
                {report.vegetation.dominantBiomes.map((b) => (
                  <li key={b.biome}>{b.biome}: {b.pct}%</li>
                ))}
              </ul>
              <p style={{ fontSize: "0.85rem", opacity: 0.85, margin: "0.5rem 0 0" }}>
                {report.vegetation.description}
              </p>
            </div>

            <div className="ecosystem-report__card">
              <h4>Fauna ({report.fauna.totalSpecies} especies)</h4>
              <ul>
                {report.fauna.byFeedingStrategy.map((c) => (
                  <li key={c.feedingStrategy}>
                    {FEEDING_STRATEGY_LABELS[c.feedingStrategy] ?? c.feedingStrategy}: {c.count}
                  </li>
                ))}
                {report.fauna.byCategory.map((c) => (
                  <li key={c.category}>{FAUNA_CATEGORY_LABELS[c.category] ?? c.category}: {c.count}</li>
                ))}
              </ul>
            </div>

            <div className="ecosystem-report__card ecosystem-report__card--animals">
              <h4>Animais presentes ({report.fauna.species.length})</h4>
              {report.fauna.species.length > 0 ? (
                <ul className="ecosystem-report__animals">
                  {report.fauna.species.map((s) => (
                    <li key={s.scientificName}>
                      <strong>{s.commonName}</strong>
                      <span>
                        {FEEDING_STRATEGY_LABELS[s.feedingStrategy] ?? s.feedingStrategy}
                        {" · "}
                        {HABITAT_TAG[s.habitat]}
                        {s.isPredator ? " · predador" : ""}
                        {s.populationTarget ? ` · alvo ${s.populationTarget}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: 0 }}>
                  Nenhuma especie compativel com os biomas gerados.
                </p>
              )}
            </div>

            <div className="ecosystem-report__card">
              <h4>Fatores abioticos</h4>
              <ul>
                {report.abioticFactors.map((f) => (
                  <li key={f.label}>{f.label}: {f.value} {f.unit}</li>
                ))}
              </ul>
            </div>

            {report.resourceBase ? (
              <div className="ecosystem-report__card">
                <h4>Base de recurso</h4>
                {report.resourceBase.resourceBase.length > 0 ? (
                  <ul>
                    {report.resourceBase.resourceBase.map((r) => (
                      <li key={r.type}>{r.label}: {Math.round(r.availability * 100)}%</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: "0.85rem", opacity: 0.75, margin: 0 }}>
                    Sem base de recurso vegetal detectavel no grid.
                  </p>
                )}
                <p style={{ fontSize: "0.82rem", opacity: 0.8, margin: "0.4rem 0 0" }}>
                  Pressao herbivora: {report.resourceBase.herbivorePressure.level}
                </p>
                {report.resourceBase.unsupportedConsumers.length > 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#fca5a5", margin: "0.3rem 0 0" }}>
                    Sem suporte de recurso: {report.resourceBase.unsupportedConsumers.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}

            {report.trophicNetwork ? (
              <div className="ecosystem-report__card">
                <h4>Rede trofica</h4>
                <ul>
                  <li>Elos de predacao ativos: {report.trophicNetwork.links.length}</li>
                  <li>Elos podados (presa ausente): {report.trophicNetwork.prunedLinks.length}</li>
                  <li>
                    Piramide: {report.trophicNetwork.pyramidConsistent ? "consistente" : "desbalanceada"}
                  </li>
                  {report.trophicNetwork.unsupportedSpecies.length > 0 ? (
                    <li>Sem suporte: {report.trophicNetwork.unsupportedSpecies.join(", ")}</li>
                  ) : null}
                </ul>
                {report.trophicNetwork.warnings.length > 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#fcd34d", margin: "0.3rem 0 0" }}>
                    {report.trophicNetwork.warnings[0]}
                  </p>
                ) : null}
              </div>
            ) : null}

            {report.ecosystemProfile?.matched && report.ecosystemProfile.profile ? (
              <div className="ecosystem-report__card">
                <h4>Perfil de ecossistema</h4>
                <ul>
                  <li>
                    <strong>{report.ecosystemProfile.profile.displayName}</strong> · meio{" "}
                    {report.ecosystemProfile.profile.medium}
                  </li>
                  <li>
                    Clima esperado: {report.ecosystemProfile.profile.climate.temperatureRangeC[0]}–
                    {report.ecosystemProfile.profile.climate.temperatureRangeC[1]} °C,{" "}
                    {report.ecosystemProfile.profile.climate.rainfallMmYear[0]}–
                    {report.ecosystemProfile.profile.climate.rainfallMmYear[1]} mm/ano
                  </li>
                  <li>
                    Água: {report.ecosystemProfile.profile.water.presence} · coerência{" "}
                    {Math.round(report.ecosystemProfile.consistencyScore * 100)}%
                  </li>
                </ul>
                {report.ecosystemProfile.mismatches.length > 0 ? (
                  <p style={{ fontSize: "0.82rem", color: "#fcd34d", margin: "0.3rem 0 0" }}>
                    Divergências: {report.ecosystemProfile.mismatches.join(" ")}
                  </p>
                ) : (
                  <p style={{ fontSize: "0.82rem", opacity: 0.75, margin: "0.3rem 0 0" }}>
                    Condições geradas coerentes com o perfil curado.
                  </p>
                )}
                <p style={{ fontSize: "0.76rem", opacity: 0.6, margin: "0.3rem 0 0" }}>
                  {report.ecosystemProfile.profile.sourceNotes} (confiança{" "}
                  {report.ecosystemProfile.profile.confidence})
                </p>
              </div>
            ) : null}
          </div>

          <div className="ecosystem-report__facts">
            <h4 style={{ margin: "0 0 0.25rem" }}>
              Explicacao cientifica
              <span
                className={`ecosystem-report__tag ${
                  report.scientificExplanation.coverage === "sufficient"
                    ? "ecosystem-report__tag--ok"
                    : "ecosystem-report__tag--warn"
                }`}
              >
                {report.scientificExplanation.coverage === "sufficient"
                  ? "grounding suficiente"
                  : "grounding limitado"}
              </span>
            </h4>
            {report.scientificExplanation.facts.length > 0 ? (
              <>
                {report.scientificExplanation.facts.map((f, i) => (
                  <div key={`${f.title}-${i}`} className="ecosystem-report__fact">
                    <strong>{f.title}</strong>
                    <span>{f.text}</span>
                    {f.citationKey ? (
                      <small>
                        {" "}
                        ({f.citationKey}
                        {f.year ? `, ${f.year}` : ""})
                      </small>
                    ) : null}
                  </div>
                ))}
                {report.scientificExplanation.sources.length > 0 ? (
                  <p style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: "0.5rem" }}>
                    Fontes: {report.scientificExplanation.sources.join(", ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p style={{ fontSize: "0.88rem", opacity: 0.8 }}>
                Nenhum fato cientifico do banco cobre este bioma.
              </p>
            )}
          </div>

          {report.limitations.length > 0 ? (
            <div className="ecosystem-report__facts">
              <h4 style={{ margin: "0 0 0.25rem" }}>Limitacoes</h4>
              <ul className="ecosystem-report__limitations">
                {report.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export { EcologyTerrainSection };
export default EcologyTerrainSection;
