import { describe,expect,it } from "vitest";
import { createTerrainSurface } from "../features/ecology/terrain-surface";
import type { TerrainGrid } from "../services/api/ecology";

function grid() { return {width:3,height:3,cells:Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>({x,y,elevation:.2+x*.12+y*.08,isWater:false,waterFlow:0})))} as TerrainGrid; }
describe("continuous terrain surface",()=>{
  it("preserves cell-center heights used by generated objects",()=>{
    const map=grid(),surface=createTerrainSurface(map);
    for(const row of map.cells) for(const cell of row) expect(surface.heightAt(cell.x-1,cell.y-1)).toBeCloseTo(.72+cell.elevation*6.9);
  });
  it("has no vertical cracks when animals cross a cell boundary",()=>{
    const surface=createTerrainSurface(grid());
    for(const edge of [-.5,.5]) for(const v of [-.9,-.3,.1,.7]) {
      expect(surface.heightAt(edge-1e-7,v)).toBeCloseTo(surface.heightAt(edge+1e-7,v),5);
      expect(surface.heightAt(v,edge-1e-7)).toBeCloseTo(surface.heightAt(v,edge+1e-7),5);
    }
  });
  it("keeps channel corners down at the river bed instead of burying water under banks",()=>{
    const map=grid();map.cells[1]![1]!.elevation=.1;map.cells[1]![1]!.waterFlow=1;
    const surface=createTerrainSurface(map);
    expect(surface.corner(1,1)).toBeCloseTo(.72+.1*6.9);
    expect(surface.corner(2,2)).toBeCloseTo(.72+.1*6.9);
  });
  it("clamps edge samples and always returns finite terrain heights",()=>{
    const surface=createTerrainSurface(grid());
    for(const x of [-100,-1.5,0,1.5,100]) for(const z of [-100,0,100]) expect(Number.isFinite(surface.heightAt(x,z))).toBe(true);
  });
});
