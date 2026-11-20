import { buildApiUrl } from "./client";

export const KEEP_ALIVE_INTERVAL_MS = 5 * 60 * 1000;

/** One loop per mounted application; resolves the configured API on every request. */
export function startApiKeepAlive(): () => void {
  let pending: AbortController | undefined;
  let stopped = false;

  const ping = async () => {
    if (stopped || pending || !navigator.onLine) return;
    const controller = new AbortController();
    pending = controller;
    const timeout = window.setTimeout(() => controller.abort(), 60_000);
    try {
      await fetch(buildApiUrl("/health/ping"), {
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      // Network failure is retried on the next tick or connectivity event.
    } finally {
      window.clearTimeout(timeout);
      if (pending === controller) pending = undefined;
    }
  };

  const onVisible = () => { if (document.visibilityState === "visible") void ping(); };
  const onOnline = () => { void ping(); };
  const interval = window.setInterval(() => { void ping(); }, KEEP_ALIVE_INTERVAL_MS);
  window.addEventListener("online", onOnline);
  document.addEventListener("visibilitychange", onVisible);
  void ping();

  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener("online", onOnline);
    document.removeEventListener("visibilitychange", onVisible);
    pending?.abort();
  };
}
