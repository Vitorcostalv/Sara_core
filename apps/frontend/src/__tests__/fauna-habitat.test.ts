import { expect, it } from "vitest";
import { isHabitableCell } from "../features/ecology/faunaHabitat";
import { getSpeciesRenderProfile } from "../features/ecology/faunaRenderProfiles";
import { getOfflineEcosystemSnapshot } from "../demo/offline";
import type { SpeciesDefinition, TerrainCell } from "../services/api/ecology";
import { ADDITIONAL_SPECIES } from "../../../backend/src/modules/ecology/simulation/fauna-catalog-expansion";

const baseline = getOfflineEcosystemSnapshot("amazonia-coerente").result.species[0]!;
const cell: TerrainCell = {
  x: 0, y: 0, elevation: 0.5, temperatureC: 25, humidityPct: 70,
  precipitationMmYear: 1500, salinityPsu: 0, climateCode: "Af",
  biomeSuggestion: "floresta-tropical-umida", isWater: false,
};

it("all 70 new species have a polygon fallback without requesting missing assets", () => {
  for (const raw of ADDITIONAL_SPECIES) {
    const species: SpeciesDefinition = { ...baseline, ...raw, habitatProfile: baseline.habitatProfile, behaviorProfile: baseline.behaviorProfile };
    const profile = getSpeciesRenderProfile(species);
    expect(profile.assetPath, raw.id).toBeNull();
    expect(["box", "cone", "octahedron", "dodecahedron"]).toContain(profile.fallbackShape);
  }
});

it("freshwater fish stay in compatible water cells, never land, sea or another biome", () => {
  const fish: SpeciesDefinition = { ...baseline, id: "tambaqui", category: "fish", habitableBiomes: ["floresta-tropical-umida"] };
  expect(isHabitableCell(fish, cell)).toBe(false);
  expect(isHabitableCell(fish, { ...cell, isWater: true })).toBe(true);
  expect(isHabitableCell(fish, { ...cell, isWater: true, salinityPsu: 35 })).toBe(false);
  expect(isHabitableCell(fish, { ...cell, isWater: true, biomeSuggestion: "lago" })).toBe(false);
});

it("terrestrial and endemic species cannot use water or an incompatible biome", () => {
  const tamarin: SpeciesDefinition = { ...baseline, id: "mico-leao-dourado", category: "herbivore-small", habitableBiomes: ["mata-atlantica"] };
  expect(isHabitableCell(tamarin, cell)).toBe(false);
  expect(isHabitableCell(tamarin, { ...cell, biomeSuggestion: "mata-atlantica" })).toBe(true);
  expect(isHabitableCell(tamarin, { ...cell, biomeSuggestion: "mata-atlantica", isWater: true })).toBe(false);
});
