import { create } from "zustand";
import { getLanInfo } from "../pwa/lan";
import { readLocalValue, writeLocalValue } from "./storage";
import { getRuntimeApiBaseUrl } from "../services/api/runtime";

interface UiState {
  apiBaseUrl: string;
  presentationMode: boolean;
  demoFlowDismissed: boolean;
  performanceProfile: "high" | "balanced" | "light";
  setApiBaseUrl: (value: string) => void;
  setPresentationMode: (value: boolean) => void;
  setDemoFlowDismissed: (value: boolean) => void;
  setPerformanceProfile: (value: UiState["performanceProfile"]) => void;
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";
const storageKey = "sara-core.api-base-url";
const presentationKey = "sara-core.presentation-mode";
const demoFlowKey = "sara-core.demo-flow-dismissed";
const performanceKey = "sara-core.performance-profile";

const apiPathPrefix = "/api/v1";

// Todos os endpoints vivem sob /api/v1. Se alguém salvar só a origem
// (http://localhost:3333), completamos o prefixo em vez de bater 404 em /health.
export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (trimmed.length === 0) {
    return defaultApiBaseUrl;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.pathname === "/" ? `${parsed.origin}${apiPathPrefix}` : trimmed;
  } catch {
    return trimmed;
  }
}

function getInitialApiBaseUrl(): string {
  const runtime = getRuntimeApiBaseUrl();
  if (runtime) return runtime;
  if (typeof window === "undefined") {
    return defaultApiBaseUrl;
  }

  // Servido pela rede local: a API está na mesma origem, e "localhost" no celular
  // apontaria para o próprio celular. Vence qualquer endereço salvo.
  const lan = getLanInfo();
  if (lan) {
    return lan.apiBaseUrl;
  }

  const saved = readLocalValue(storageKey);
  return saved && saved.trim().length > 0 ? normalizeApiBaseUrl(saved) : defaultApiBaseUrl;
}

export const useUiStore = create<UiState>((set) => ({
  apiBaseUrl: getInitialApiBaseUrl(),
  presentationMode:
    readLocalValue(presentationKey) === "true",
  // Roteiro começa recolhido: a abertura precisa mostrar o ecossistema, não instruções.
  // O modo apresentação continua exibindo-o, e quem reabre grava "false".
  demoFlowDismissed:
    readLocalValue(demoFlowKey) !== "false",
  performanceProfile:
    typeof window !== "undefined" &&
    ["high", "balanced", "light"].includes(readLocalValue(performanceKey) ?? "")
      ? (readLocalValue(performanceKey) as UiState["performanceProfile"])
      : "balanced",
  setApiBaseUrl: (value) => {
    const nextValue = normalizeApiBaseUrl(value);

    if (typeof window !== "undefined") {
      writeLocalValue(storageKey, nextValue);
    }

    set({ apiBaseUrl: nextValue });
  },
  setPresentationMode: (value) => {
    if (typeof window !== "undefined") {
      writeLocalValue(presentationKey, String(value));
    }
    set({ presentationMode: value });
  },
  setDemoFlowDismissed: (value) => {
    if (typeof window !== "undefined") {
      writeLocalValue(demoFlowKey, String(value));
    }
    set({ demoFlowDismissed: value });
  },
  setPerformanceProfile: (value) => {
    if (typeof window !== "undefined") {
      writeLocalValue(performanceKey, value);
    }
    set({ performanceProfile: value });
  },
}));
