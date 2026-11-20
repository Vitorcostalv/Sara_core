import type { SpeciesDefinition, TerrainCell } from "../../services/api/ecology";

export function isHabitableCell(species: SpeciesDefinition, cell: TerrainCell): boolean {
  if (species.habitableBiomes.includes("caverna")) {
    if (!cell.cave || cell.cave.type === "none") return false;
    if (species.category === "fish") {
      return cell.cave.type === "river-cave" || (cell.riverDistance ?? 99) <= 1 || cell.cave.humidity >= 0.85;
    }
    return species.category === "bird" || !cell.isWater;
  }
  if (!species.habitableBiomes.includes(cell.biomeSuggestion)) return false;
  if (species.id === "soldadinho-do-araripe") {
    return !cell.isWater && cell.humidityPct >= 70 && (cell.riverDistance ?? 99) <= 1;
  }
  if (species.category === "fish") {
    const freshwater = !species.habitableBiomes.some((b) =>
      ["oceano-pelagico", "oceano-polar", "manguezal"].includes(b));
    return cell.isWater && (!freshwater || cell.salinityPsu <= 5);
  }
  return species.category === "bird" || !cell.isWater;
}
