import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const globalCss = readFileSync(join(srcDir, "styles", "main.css"), "utf-8");
const terrainSource = readFileSync(
  join(srcDir, "features", "ecology", "EcologyTerrainSection.tsx"),
  "utf-8",
);

describe("shared TerrainView styles", () => {
  it("keeps the reusable 3D viewport structure in the global stylesheet", () => {
    for (const selector of [
      ".terrain-stage__viewport",
      ".terrain-overlay",
      ".terrain-primary-controls",
      ".terrain-animals__chip",
      ".terrain-invasive",
    ]) {
      expect(globalCss, `missing shared selector ${selector}`).toContain(selector);
    }
  });

  it("gives the canvas a usable height outside the terrain page", () => {
    expect(globalCss).toMatch(/\.terrain-stage__viewport\s*\{[^}]*min-height:\s*32rem/s);
  });

  it("keeps the events button visible before the first fauna event", () => {
    expect(terrainSource).toContain("{showEvents ? (\n            <EventHub");
    expect(terrainSource).not.toContain("showEvents && faunaEventsState.length > 0");
  });
});
