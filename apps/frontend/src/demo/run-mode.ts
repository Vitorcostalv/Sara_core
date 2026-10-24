import type { DemoRunMode } from "./offline";

/** A hosted app with a same-origin API must not be mistaken for a static demo. */
export function chooseDefaultRunMode(host: string, apiBaseUrl: string): DemoRunMode {
  const local = host === "localhost" || host === "127.0.0.1" || host === "" ||
    host.startsWith("192.168.") || host.startsWith("10.") || host.endsWith(".local");
  if (local) return "auto";
  const api = apiBaseUrl.trim();
  if (api.startsWith("/") && !api.startsWith("//")) return "auto";
  try {
    const url = new URL(api);
    return url.protocol === "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1"
      ? "auto" : "offline";
  } catch {
    return "offline";
  }
}
