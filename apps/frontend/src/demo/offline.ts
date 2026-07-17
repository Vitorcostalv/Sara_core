import type { EcosystemReportResult, InvasiveScenarioResult } from "../services/api/ecology";
import type { DemoScenarioId } from "./catalog";
import {
  OFFLINE_ECOSYSTEM_SNAPSHOTS,
  OFFLINE_INVASIVE_SNAPSHOT,
  type OfflineEcosystemSnapshot,
  type OfflineInvasiveSnapshot,
} from "./snapshots";

const lastScenarioKey = "sara-core.last-scenario";
const appVersion = import.meta.env.VITE_APP_VERSION ?? "0.1.0";

export type DemoRunMode = "live" | "offline" | "auto";

export interface LastScenarioRecord {
  scenarioId: DemoScenarioId;
  mode: DemoRunMode;
  timestamp: string;
  appVersion: string;
  ecosystemResult?: EcosystemReportResult;
  invasiveResult?: InvasiveScenarioResult;
}

function hasGrid(value: unknown): value is { terrain: { width: number; height: number; cells: unknown[] } } {
  if (!value || typeof value !== "object") return false;
  const terrain = (value as { terrain?: unknown }).terrain;
  if (!terrain || typeof terrain !== "object") return false;
  const maybe = terrain as { width?: unknown; height?: unknown; cells?: unknown };
  return typeof maybe.width === "number" && typeof maybe.height === "number" && Array.isArray(maybe.cells);
}

export function validateEcosystemSnapshot(snapshot: OfflineEcosystemSnapshot): OfflineEcosystemSnapshot {
  if (!snapshot.meta.precomputed || snapshot.meta.snapshotVersion !== 1) {
    throw new Error("Snapshot offline de ecossistema invalido.");
  }
  if (!hasGrid(snapshot.result) || !snapshot.result.report?.validation || !Array.isArray(snapshot.result.species)) {
    throw new Error("Snapshot offline nao contem terreno, fauna e validacao.");
  }
  return snapshot;
}

export function validateInvasiveSnapshot(snapshot: OfflineInvasiveSnapshot): OfflineInvasiveSnapshot {
  if (!snapshot.meta.precomputed || snapshot.meta.snapshotVersion !== 1) {
    throw new Error("Snapshot offline de invasao invalido.");
  }
  if (!hasGrid(snapshot.result) || !snapshot.result.invader || !Array.isArray(snapshot.result.impactMechanisms)) {
    throw new Error("Snapshot offline de invasao nao contem invasor e mecanismos.");
  }
  return snapshot;
}

export function getOfflineEcosystemSnapshot(id: Exclude<DemoScenarioId, "invasao-javali-cerrado">) {
  return validateEcosystemSnapshot(OFFLINE_ECOSYSTEM_SNAPSHOTS[id]);
}

export function getOfflineInvasiveSnapshot() {
  return validateInvasiveSnapshot(OFFLINE_INVASIVE_SNAPSHOT);
}

export function saveLastScenario(record: Omit<LastScenarioRecord, "timestamp" | "appVersion">) {
  if (typeof window === "undefined") return;
  const next: LastScenarioRecord = {
    ...record,
    timestamp: new Date().toISOString(),
    appVersion,
  };
  window.localStorage.setItem(lastScenarioKey, JSON.stringify(next));
}

export function readLastScenario(): LastScenarioRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(lastScenarioKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LastScenarioRecord;
    if (!parsed.scenarioId || !parsed.mode || !parsed.timestamp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLocalDemoData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(lastScenarioKey);
}
