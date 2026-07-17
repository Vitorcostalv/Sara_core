import { create } from "zustand";

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

function getInitialApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return defaultApiBaseUrl;
  }

  const saved = window.localStorage.getItem(storageKey);
  return saved && saved.trim().length > 0 ? saved : defaultApiBaseUrl;
}

export const useUiStore = create<UiState>((set) => ({
  apiBaseUrl: getInitialApiBaseUrl(),
  presentationMode:
    typeof window !== "undefined" ? window.localStorage.getItem(presentationKey) === "true" : false,
  demoFlowDismissed:
    typeof window !== "undefined" ? window.localStorage.getItem(demoFlowKey) === "true" : false,
  performanceProfile:
    typeof window !== "undefined" &&
    ["high", "balanced", "light"].includes(window.localStorage.getItem(performanceKey) ?? "")
      ? (window.localStorage.getItem(performanceKey) as UiState["performanceProfile"])
      : "balanced",
  setApiBaseUrl: (value) => {
    const nextValue = value.trim() || defaultApiBaseUrl;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextValue);
    }

    set({ apiBaseUrl: nextValue });
  },
  setPresentationMode: (value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(presentationKey, String(value));
    }
    set({ presentationMode: value });
  },
  setDemoFlowDismissed: (value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(demoFlowKey, String(value));
    }
    set({ demoFlowDismissed: value });
  },
  setPerformanceProfile: (value) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(performanceKey, value);
    }
    set({ performanceProfile: value });
  },
}));
