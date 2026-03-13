import { create } from "zustand";

interface UiState {
  apiBaseUrl: string;
  setApiBaseUrl: (value: string) => void;
}

const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";

export const useUiStore = create<UiState>((set) => ({
  apiBaseUrl: defaultApiBaseUrl,
  setApiBaseUrl: (value) => set({ apiBaseUrl: value })
}));
