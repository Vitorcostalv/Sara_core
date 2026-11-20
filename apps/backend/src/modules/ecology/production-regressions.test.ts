import assert from "node:assert/strict";
import test from "node:test";
import { biomePresetService } from "./simulation/biome-preset.service";
import { ecologicalTerrainPromptService } from "./llm/ecological-terrain-prompt.service";
import { faunaDefinitionService } from "./simulation/fauna-definition.service";

test("Reported prompts preserve polar sea and cave identity across seeds and map sizes", async () => {
  assert.equal(biomePresetService.findByKeyword("Cerrado com muitas cavernas")?.slug, "cerrado");
  for (const [prompt, slug] of [["Oceano polar", "oceano-polar"], ["Caverna", "caverna"], ["Polar ocean", "oceano-polar"]]) {
    for (const seed of [1, 42, 123, 2026]) for (const [width, height] of [[20, 16], [48, 36]]) {
      const result = await ecologicalTerrainPromptService.generate({ prompt: prompt!, width, height, seed });
      assert.equal(result.biomeSlug, slug);
      const cells = result.terrain.cells.flat();
      if (slug === "oceano-polar") {
        assert.ok(cells.filter(c => c.isWater).length / cells.length > 0.5);
        assert.ok(cells.filter(c => c.isWater).every(c => c.biomeSuggestion === "oceano-polar" && c.temperatureC < 1 && c.salinityPsu >= 30));
        const fauna = faunaDefinitionService.resolve(result.terrain).species;
        assert.ok(!fauna.some(s => ["peixe-palhaco", "tilapia", "tambaqui"].includes(s.id)));
      } else {
        assert.ok(cells.some(c => c.cave && c.cave.type !== "none"));
        assert.ok(faunaDefinitionService.resolve(result.terrain).species.some(s => s.habitableBiomes.includes("caverna")));
      }
    }
  }
});

test("Wet presets produce actual water and compatible salinity before deriving terrain features", async () => {
  for (const [prompt, slug, minimum] of [["Floresta amazônica úmida", "amazonia", 8], ["Manguezal costeiro", "mangue", 25], ["Pantanal com áreas inundáveis", "pantanal", 15]] as const) {
    for (const seed of [1, 4, 41, 123, 2026]) {
      const result = await ecologicalTerrainPromptService.generate({ prompt, width: 32, height: 24, seed });
      assert.equal(result.biomeSlug, slug);
      const cells = result.terrain.cells.flat();
      const water = cells.filter(c => c.isWater);
      assert.ok(water.length / cells.length * 100 >= minimum);
      assert.ok(water.filter(c => c.elevation < 0.25).length / cells.length * 100 >= minimum);
      assert.ok(water.every(c => slug === "mangue" ? c.salinityPsu >= 5 && c.salinityPsu <= 30 : c.salinityPsu === 0));
      assert.deepEqual(result.terrain, (await ecologicalTerrainPromptService.generate({ prompt, width: 32, height: 24, seed })).terrain);
    }
  }
});
