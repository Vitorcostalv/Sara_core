declare global {
  interface Window {
    __SARA_RUNTIME__?: { apiBaseUrl: string };
  }
}

/** Supplied by the local launcher; contains the public API path, never credentials. */
export function getRuntimeApiBaseUrl(): string | null {
  if (typeof window === "undefined") return null;
  return window.__SARA_RUNTIME__?.apiBaseUrl === "/api/v1" ? "/api/v1" : null;
}
