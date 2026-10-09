/** Browser persistence is optional: blocked storage or quota must not break the app. */
export function readLocalValue(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocalValue(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    // Keep the current session usable even when settings cannot be persisted.
  }
}

export function removeLocalValue(key: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  } catch {
    // Storage may be blocked by the browser.
  }
}
