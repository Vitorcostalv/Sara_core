import { create } from "zustand";

interface UiState {
  apiBaseUrl: string;
  setApiBaseUrl: (value: string) => void;
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";
const storageKey = "sara-core.api-base-url";

function getInitialApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return defaultApiBaseUrl;
  }

  const saved = window.localStorage.getItem(storageKey);
  return saved && saved.trim().length > 0 ? saved : defaultApiBaseUrl;
}

export const useUiStore = create<UiState>((set) => ({
  apiBaseUrl: getInitialApiBaseUrl(),
  setApiBaseUrl: (value) => {
    const nextValue = value.trim() || defaultApiBaseUrl;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextValue);
    }

    set({ apiBaseUrl: nextValue });
  }
}));
