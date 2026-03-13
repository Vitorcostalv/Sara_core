import { create } from "zustand";
const defaultApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";
export const useUiStore = create((set) => ({
    apiBaseUrl: defaultApiBaseUrl,
    setApiBaseUrl: (value) => set({ apiBaseUrl: value })
}));
