import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const invasiveSource = readFileSync(
  join(srcDir, "features", "ecology", "EcologyInvasiveSection.tsx"),
  "utf-8",
);
const terrainSource = readFileSync(join(srcDir, "features", "ecology", "EcologyTerrainSection.tsx"), "utf-8");
const animalSource = readFileSync(join(srcDir, "features", "ecology", "AnimalEntity.tsx"), "utf-8");

describe("invasive scenario coherence", () => {
  it("resolves native fauna from the complete terrain grid", () => {
    expect(invasiveSource).toContain("ecologyApi.fauna({ grid: buildCompactFaunaGrid(data.terrain) })");
    expect(invasiveSource).not.toContain("ecologyApi.fauna({ biomes: data.resolvedBiomes })");
  });

  it("does not render an invader alone when native fauna fails", () => {
    expect(invasiveSource).toContain("A invasora não será exibida sozinha");
    expect(invasiveSource).not.toContain("catch {\n        natives = [];");
  });

  it("shows the invader and selectable phases in the population timeline", () => {
    expect(invasiveSource).toContain('className="invasive-phase-tabs"');
    expect(invasiveSource).toContain("{result.invaderProfile.displayName}");
    expect(invasiveSource).toContain("{phase.invaderPop}");
  });

  it("keeps invasion details compact until the user requests them", () => {
    expect(terrainSource).toContain('className="terrain-invasive__chip"');
    expect(terrainSource).toContain("invasivePanelExpanded");
  });

  it("marks invasive animals above their 3D models", () => {
    expect(animalSource).toContain("function InvasiveMarker");
    expect(animalSource).toContain("<InvasiveMarker positionY=");
  });
});
