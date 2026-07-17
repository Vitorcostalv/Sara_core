import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_SCENARIOS, type DemoScenarioId } from "../demo/catalog";
import {
  getOfflineEcosystemSnapshot,
  getOfflineInvasiveSnapshot,
  validateEcosystemSnapshot,
  validateInvasiveSnapshot,
} from "../demo/offline";
import { OFFLINE_ECOSYSTEM_SNAPSHOTS, OFFLINE_INVASIVE_SNAPSHOT } from "../demo/snapshots";
import { getSpeciesRenderProfile } from "../features/ecology/faunaRenderProfiles";
import type { SpeciesDefinition } from "../services/api/ecology";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "public");

const ECOSYSTEM_IDS = Object.keys(OFFLINE_ECOSYSTEM_SNAPSHOTS) as Array<
  Exclude<DemoScenarioId, "invasao-javali-cerrado">
>;

// Report sections the terrain viewer + defensive report cards rely on. If a snapshot drops one,
// the demo cards silently render empty — so pin them here.
const REQUIRED_REPORT_SECTIONS = [
  "climate",
  "relief",
  "vegetation",
  "formations",
  "fauna",
  "resourceBase",
  "trophicNetwork",
  "validation",
  "plausibility",
  "scientificExplanation",
  "limitations",
] as const;

describe("offline scenario contract", () => {
  it("exposes exactly the four demo scenarios wired in the catalog", () => {
    expect(DEMO_SCENARIOS).toHaveLength(4);
    const ids = DEMO_SCENARIOS.map((s) => s.id).sort();
    expect(ids).toEqual(
      ["amazonia-coerente", "cerrado-predador-presa", "invasao-javali-cerrado", "manguezal-incoerente"].sort(),
    );
  });

  it("every ecosystem snapshot is valid and precomputed", () => {
    for (const id of ECOSYSTEM_IDS) {
      const snapshot = getOfflineEcosystemSnapshot(id);
      expect(() => validateEcosystemSnapshot(snapshot)).not.toThrow();
      expect(snapshot.meta.precomputed).toBe(true);
      expect(snapshot.meta.snapshotVersion).toBe(1);
      expect(snapshot.meta.disclosure.length).toBeGreaterThan(0);
      expect(snapshot.result.terrain.cells.length).toBeGreaterThan(0);
      expect(snapshot.result.species.length).toBeGreaterThan(0);
    }
  });

  it("every ecosystem snapshot carries all required report sections", () => {
    for (const id of ECOSYSTEM_IDS) {
      const report = getOfflineEcosystemSnapshot(id).result.report as Record<string, unknown>;
      for (const section of REQUIRED_REPORT_SECTIONS) {
        expect(report[section], `${id} is missing report.${section}`).toBeDefined();
      }
      expect((report.validation as { score: number }).score).toBeGreaterThanOrEqual(0);
      expect((report.validation as { score: number }).score).toBeLessThanOrEqual(100);
    }
  });

  it("the intentionally incoherent mangrove keeps blocking contradictions and a low score", () => {
    const report = getOfflineEcosystemSnapshot("manguezal-incoerente").result.report;
    expect(report.validation.blockingContradictions.length).toBeGreaterThan(0);
    expect(report.validation.score).toBeLessThan(60);
  });

  it("every registered fauna sprite referenced by a snapshot exists on disk", () => {
    const allSpecies: SpeciesDefinition[] = [
      ...ECOSYSTEM_IDS.flatMap((id) => getOfflineEcosystemSnapshot(id).result.species),
      getOfflineInvasiveSnapshot().result.invader,
    ];
    let checked = 0;
    for (const species of allSpecies) {
      const profile = getSpeciesRenderProfile(species);
      if (!profile.assetPath) continue; // unregistered -> polygon fallback, no request
      checked += 1;
      const rel = profile.assetPath.replace(/^\//, "");
      expect(existsSync(join(publicDir, rel)), `missing sprite for ${species.id}: ${profile.assetPath}`).toBe(true);
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("invasive snapshot is valid and references a real terrain scenario", () => {
    const snapshot = getOfflineInvasiveSnapshot();
    expect(() => validateInvasiveSnapshot(snapshot)).not.toThrow();
    const terrainRef = OFFLINE_INVASIVE_SNAPSHOT.meta.terrainSnapshotId;
    expect(ECOSYSTEM_IDS).toContain(terrainRef);
    // the invasive scene reuses the referenced terrain snapshot's grid
    expect(snapshot.result.terrain).toBe(OFFLINE_ECOSYSTEM_SNAPSHOTS[terrainRef].result.terrain);
    expect(snapshot.result.impactMechanisms.length).toBeGreaterThan(0);
    expect(snapshot.result.invader.id).toBeTruthy();
  });

  it("invasive native impacts reference species present in the referenced terrain snapshot", () => {
    const terrainRef = OFFLINE_INVASIVE_SNAPSHOT.meta.terrainSnapshotId;
    const nativeIds = new Set(OFFLINE_ECOSYSTEM_SNAPSHOTS[terrainRef].result.species.map((s) => s.id));
    for (const impact of OFFLINE_INVASIVE_SNAPSHOT.result.nativeImpacts) {
      expect(nativeIds.has(impact.speciesId), `impact on unknown native ${impact.speciesId}`).toBe(true);
    }
  });
});
