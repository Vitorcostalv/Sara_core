import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { TerrainCell, TerrainGrid } from "../../services/api/ecology";
import { createTerrainSurface } from "./terrain-surface";

export function TerrainRelief({grid, colors, gradientMap, opacity, onInspect}: {
  grid: TerrainGrid; colors: Map<string, number>; gradientMap: THREE.DataTexture;
  opacity: number; onInspect: (cell: TerrainCell) => void;
}) {
  const geometry = useMemo(() => {
    const surface = createTerrainSurface(grid);
    const positions: number[] = [], vertexColors: number[] = [], sides: number[] = [];
    const halfW = (grid.width - 1) / 2, halfH = (grid.height - 1) / 2;
    const color = new THREE.Color();
    for (const row of grid.cells) for (const cell of row) {
      const x = cell.x - halfW, z = cell.y - halfH;
      const center = [x, surface.heightAt(x,z), z];
      const corners = [[x-.5, surface.corner(cell.x,cell.y), z-.5], [x+.5,surface.corner(cell.x+1,cell.y),z-.5], [x+.5,surface.corner(cell.x+1,cell.y+1),z+.5], [x-.5,surface.corner(cell.x,cell.y+1),z+.5]];
      color.setHex(colors.get(`${cell.x},${cell.y}`) ?? 0x5d8752);
      if (!cell.isWater && cell.elevation > .72) color.lerp(new THREE.Color(0x858579), Math.min(.25, Math.max(0, (cell.slope ?? 0) - .55) * .4));
      for (let side=0; side<4; side++) {
        const a = corners[side]!, b = corners[(side+1)%4]!;
        positions.push(...center,...b,...a);
        for (let v=0;v<3;v++) vertexColors.push(color.r,color.g,color.b);
        const boundary = side===0 && cell.y===0 || side===1 && cell.x===grid.width-1 || side===2 && cell.y===grid.height-1 || side===3 && cell.x===0;
        if (boundary) sides.push(...a,...b,b[0]!,0.1,b[2]!,...a,b[0]!,0.1,b[2]!,a[0]!,0.1,a[2]!);
      }
    }
    const land = new THREE.BufferGeometry();
    land.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    land.setAttribute("color",new THREE.Float32BufferAttribute(vertexColors,3));
    land.computeVertexNormals(); land.computeBoundingSphere();
    const skirt = new THREE.BufferGeometry(); skirt.setAttribute("position",new THREE.Float32BufferAttribute(sides,3)); skirt.computeVertexNormals();
    return {land,skirt};
  }, [grid,colors]);
  useEffect(() => () => {geometry.land.dispose();geometry.skirt.dispose();},[geometry]);
  return <group>
    <mesh geometry={geometry.land} receiveShadow castShadow onPointerDown={event => {
      event.stopPropagation();
      if (event.faceIndex == null) return;
      const index = Math.floor(event.faceIndex / 4);
      const cell = grid.cells[Math.floor(index / grid.width)]?.[index % grid.width];
      if (cell) onInspect(cell);
    }}>
      <meshToonMaterial gradientMap={gradientMap} vertexColors transparent={opacity < .99} opacity={opacity} />
    </mesh>
    <mesh geometry={geometry.skirt} receiveShadow>
      <meshToonMaterial color="#76583e" gradientMap={gradientMap} side={THREE.DoubleSide} transparent={opacity < .99} opacity={opacity} />
    </mesh>
  </group>;
}
