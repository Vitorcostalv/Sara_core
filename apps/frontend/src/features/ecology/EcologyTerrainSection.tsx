import React, {
  Suspense,
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
  Environment,
  Html,
  OrbitControls,
  Sky,
} from "@react-three/drei";
import { Mountains, WarningCircle } from "@phosphor-icons/react";
import { Button, EmptyState, ErrorState, LoadingBlock } from "../../components/ui";
import { getApiErrorMessage } from "../../services/api/client";
import { ecologyApi } from "../../services/api/ecology";
import type { SpeciesDefinition, TerrainCell, TerrainGrid } from "../../services/api/ecology";
import { FaunaLayer } from "./FaunaLayer";

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
  lago: 0x6cb6d7,
  "recife-de-coral": 0xdb9b7b,
  chaparral: 0x9d7a4d,
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
  lago: "lago",
  "recife-de-coral": "recife de coral",
  chaparral: "chaparral",
};

const CELL_SIZE = 1;
const LAND_SIZE = 0.94;
const WATER_SIZE = 0.98;
const WATER_HEIGHT = 0.26;
const LAND_MIN_HEIGHT = 0.72;
const HEIGHT_SCALE = 6.9;
const HOVER_COLOR = 0xf4dc8c;
const FALLBACK_COLOR = 0x7b6a5b;
const WATER_COLORS = {
  lake: 0x7fc1d7,
  ocean: 0x5f9fc6,
};

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

interface SceneData {
  land: HoverableInstance[];
  water: HoverableInstance[];
  legend: LegendEntry[];
  vegetation: VegetationBatches;
  worldRadius: number;
  fogDensity: number;
}

interface HoverState {
  cell: TerrainCell;
  position: [number, number, number];
  biomeLabel: string;
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
  for (const row of grid.cells) {
    for (const cell of row) {
      biomes.add(cell.biomeSuggestion);
    }
  }
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
  const legend = new Map<string, string>();

  for (const row of grid.cells) {
    for (const cell of row) {
      const x = (cell.x - halfWidth) * CELL_SIZE;
      const z = (cell.y - halfHeight) * CELL_SIZE;
      const baseColor = BIOME_COLORS[cell.biomeSuggestion] ?? FALLBACK_COLOR;

      if (cell.isWater) {
        const waterColor =
          cell.biomeSuggestion === "oceano-pelagico" ? WATER_COLORS.ocean : WATER_COLORS.lake;
        water.push({
          cell,
          x,
          y: WATER_HEIGHT / 2 + 0.06,
          z,
          sx: WATER_SIZE,
          sy: WATER_HEIGHT,
          sz: WATER_SIZE,
          color: waterColor,
          tooltipY: WATER_HEIGHT + 1.02,
        });
        legend.set(biomeLabel(cell.biomeSuggestion), colorHex(waterColor));
        continue;
      }

      const height = LAND_MIN_HEIGHT + cell.elevation * HEIGHT_SCALE;
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
      const mountainBiome =
        cell.biomeSuggestion === "tundra" ||
        cell.biomeSuggestion === "deserto-frio" ||
        cell.elevation > 0.84;

      if (cell.biomeSuggestion === "taiga") {
        const seedRoll = hashUnit(cell.x, cell.y, grid.seed + 71);
        const count = seedRoll < 0.38 ? 2 : seedRoll < 0.78 ? 1 : 0;

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
        const count = Math.floor(forestDensity * hashUnit(cell.x, cell.y, grid.seed + 103));

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
        const count = seedRoll < 0.34 ? 2 : seedRoll < 0.7 ? 1 : 0;

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
        if (hashUnit(cell.x, cell.y, grid.seed + 151) < 0.22) {
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

      if (mountainBiome && hashUnit(cell.x, cell.y, grid.seed + 181) < 0.42) {
        const count = hashUnit(cell.x, cell.y, grid.seed + 191) < 0.24 ? 2 : 1;

        for (let slot = 0; slot < count; slot += 1) {
          const placement = scatter(cell, grid.seed + 197, slot);
          rocks.push({
            x: x + placement.x,
            y: height + 0.16 * placement.scale,
            z: z + placement.z,
            sx: 0.18 * placement.scale,
            sy: 0.18 * placement.scale,
            sz: 0.18 * placement.scale,
            ry: placement.rotation,
            color: cell.biomeSuggestion === "tundra" ? 0xaeb8bc : 0x8f867d,
          });
        }
      }
    }
  }

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
    worldRadius,
    fogDensity: 0.006 / Math.max(0.85, Math.sqrt(worldRadius / 18)),
  };
}

function TerrainColumns({
  sceneData,
  gradientMap,
  setHovered,
}: {
  sceneData: SceneData;
  gradientMap: THREE.DataTexture;
  setHovered: React.Dispatch<React.SetStateAction<HoverState | null>>;
}) {
  const landRef = useRef<THREE.InstancedMesh>(null!);
  const waterRef = useRef<THREE.InstancedMesh>(null!);
  const hoverRef = useRef<{ kind: "land" | "water" | null; index: number }>({
    kind: null,
    index: -1,
  });
  const tempColor = useMemo(() => new THREE.Color(), []);

  usePopulateInstancedMesh(landRef, sceneData.land);
  usePopulateInstancedMesh(waterRef, sceneData.water);

  function updateHover(kind: "land" | "water", index: number) {
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
      setHovered(null);
      return;
    }

    mesh.setColorAt(index, tempColor.setHex(HOVER_COLOR));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    hoverRef.current = { kind, index };
    setHovered({
      cell: hoveredInstance.cell,
      position: [hoveredInstance.x, hoveredInstance.tooltipY, hoveredInstance.z],
      biomeLabel: biomeLabel(hoveredInstance.cell.biomeSuggestion),
    });
  }

  function clearHover() {
    if (!hoverRef.current.kind) {
      setHovered(null);
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
    setHovered(null);
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
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>

      <WaterLayer
        sceneData={sceneData}
        waterRef={waterRef}
        updateHover={updateHover}
        clearHover={clearHover}
      />
    </>
  );
}

function WaterLayer({
  sceneData,
  waterRef,
  updateHover,
  clearHover,
}: {
  sceneData: SceneData;
  waterRef: React.RefObject<THREE.InstancedMesh>;
  updateHover: (kind: "land" | "water", index: number) => void;
  clearHover: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={waterRef}
        args={instancedArgs(sceneData.water.length)}
        castShadow
        receiveShadow
        onPointerMove={(event) => {
          event.stopPropagation();
          if (typeof event.instanceId === "number") updateHover("water", event.instanceId);
        }}
        onPointerOut={clearHover}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial
          vertexColors
          transparent
          opacity={0.74}
          roughness={0.16}
          metalness={0}
          transmission={0.72}
          thickness={1.2}
          ior={1.16}
          reflectivity={0.55}
          clearcoat={1}
          clearcoatRoughness={0.14}
          envMapIntensity={0.8}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

function VegetationField({
  sceneData,
  gradientMap,
}: {
  sceneData: SceneData;
  gradientMap: THREE.DataTexture;
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

  return (
    <>
      <instancedMesh
        ref={pineTrunksRef}
        args={instancedArgs(sceneData.vegetation.pineTrunks.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={pineCanopiesRef}
        args={instancedArgs(sceneData.vegetation.pineCanopies.length)}
        castShadow
      >
        <coneGeometry args={[1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafTrunksRef}
        args={instancedArgs(sceneData.vegetation.broadleafTrunks.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={broadleafCanopiesRef}
        args={instancedArgs(sceneData.vegetation.broadleafCanopies.length)}
        castShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={shrubsRef}
        args={instancedArgs(sceneData.vegetation.shrubs.length)}
        castShadow
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={cactusBodiesRef}
        args={instancedArgs(sceneData.vegetation.cactusBodies.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={cactusArmsLeftRef}
        args={instancedArgs(sceneData.vegetation.cactusArmsLeft.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={cactusArmsRightRef}
        args={instancedArgs(sceneData.vegetation.cactusArmsRight.length)}
        castShadow
      >
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
      <instancedMesh
        ref={rocksRef}
        args={instancedArgs(sceneData.vegetation.rocks.length)}
        castShadow
      >
        <dodecahedronGeometry args={[1, 0]} />
        <meshToonMaterial gradientMap={gradientMap} />
      </instancedMesh>
    </>
  );
}

function HoverBadge({ hovered }: { hovered: HoverState | null }) {
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
      </div>
    </Html>
  );
}

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
  onFaunaCountUpdate,
}: {
  sceneData: SceneData;
  grid: TerrainGrid;
  faunaSpecies: SpeciesDefinition[];
  faunaPaused: boolean;
  faunaSpeedMultiplier: number;
  showFauna: boolean;
  onFaunaCountUpdate: (count: number) => void;
}) {
  const [hovered, setHovered] = useState<HoverState | null>(null);
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
      <color attach="background" args={["#f4d8b6"]} />
      <fogExp2 attach="fog" args={["#f4d8b6", sceneData.fogDensity]} />
      <Sky
        distance={450000}
        sunPosition={[80, 55, 40]}
        turbidity={4}
        rayleigh={0.9}
        mieCoefficient={0.002}
        mieDirectionalG={0.62}
      />
      <Environment preset="dawn" background={false} environmentIntensity={0.6} />
      <ambientLight color="#ffe1b8" intensity={0.78} />
      <directionalLight
        color="#ffcf9a"
        intensity={2.6}
        position={[sceneData.worldRadius * 0.5, sceneData.worldRadius * 1.1, sceneData.worldRadius * 0.4]}
      />
      <directionalLight
        color="#90b8ff"
        intensity={0.34}
        position={[-sceneData.worldRadius * 0.8, sceneData.worldRadius * 0.52, -sceneData.worldRadius * 0.74]}
      />

      <TerrainColumns
        sceneData={sceneData}
        gradientMap={gradientMap}
        setHovered={setHovered}
      />
      <VegetationField sceneData={sceneData} gradientMap={gradientMap} />
      <FaunaLayer
        grid={grid}
        species={faunaSpecies}
        gradientMap={gradientMap}
        paused={faunaPaused}
        speedMultiplier={faunaSpeedMultiplier}
        visible={showFauna}
        onCountUpdate={onFaunaCountUpdate}
      />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.3}
        scale={sceneData.worldRadius * 1.5}
        blur={2.5}
        far={10}
      />
      <HoverBadge hovered={hovered} />
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

function TerrainView({
  grid,
  faunaSpecies,
  faunaPaused,
  faunaSpeedMultiplier,
  showFauna,
  onFaunaCountUpdate,
}: {
  grid: TerrainGrid;
  faunaSpecies: SpeciesDefinition[];
  faunaPaused: boolean;
  faunaSpeedMultiplier: number;
  showFauna: boolean;
  onFaunaCountUpdate: (count: number) => void;
}) {
  const sceneData = useMemo(() => buildSceneData(grid), [grid]);
  const cameraPosition = useMemo(() => {
    const span = sceneData.worldRadius;
    return [span * 0.58, span * 0.92, span * 1.16] as [number, number, number];
  }, [sceneData.worldRadius]);

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
              <span className="terrain-stage__legend-swatch" style={{ backgroundColor: color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="terrain-stage__viewport">
        <div className="terrain-stage__vignette" aria-hidden="true" />
        <CanvasErrorBoundary>
          <Canvas
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
                onFaunaCountUpdate={onFaunaCountUpdate}
              />
            </Suspense>
          </Canvas>
        </CanvasErrorBoundary>
      </div>
    </div>
  );
}

const INITIAL_FORM = {
  width: "48",
  height: "36",
  seed: "42",
  baseTemperatureC: "22",
  basePrecipitationMm: "1200",
  baseHumidityPct: "65",
} satisfies TerrainForm;

function EcologyTerrainSection() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [grid, setGrid] = useState<TerrainGrid | null>(null);
  const [faunaSpecies, setFaunaSpecies] = useState<SpeciesDefinition[]>([]);
  const [faunaPaused, setFaunaPaused] = useState(false);
  const [faunaSpeedMultiplier, setFaunaSpeedMultiplier] = useState(1);
  const [showFauna, setShowFauna] = useState(true);
  const [faunaLiveCount, setFaunaLiveCount] = useState(0);
  const [isFaunaLoading, setIsFaunaLoading] = useState(false);
  const [faunaError, setFaunaError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setFaunaSpecies([]);
    setFaunaLiveCount(0);
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
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
          flex: 0 0 auto;
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
              Gera um relevo low-poly com atmosfera de golden hour, agua translucida e
              vegetacao instanciada por bioma. Arraste para orbitar; o giro inicial para
              sozinho apos 4 segundos ou no primeiro gesto.
            </p>
          </div>
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
              <Button
                variant="ghost"
                onClick={() => setShowFauna((current) => !current)}
                disabled={!grid}
              >
                {showFauna ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
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
        </div>

        <div className="form-actions">
          <Button variant="primary" onClick={() => void generate()} disabled={isLoading}>
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
            onFaunaCountUpdate={setFaunaLiveCount}
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
    </div>
  );
}

export { EcologyTerrainSection };
export default EcologyTerrainSection;
