import { useUiStore } from "../../state/ui.store";

const fallbackApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3333/api/v1";

export function resolveApiBaseUrl() {
  const configuredApiBaseUrl = useUiStore.getState().apiBaseUrl.trim();
  const baseUrl = configuredApiBaseUrl.length > 0 ? configuredApiBaseUrl : fallbackApiBaseUrl;

  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

export function buildApiUrl(endpoint: string) {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return `${resolveApiBaseUrl()}${normalizedEndpoint}`;
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(buildApiUrl(endpoint));

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
