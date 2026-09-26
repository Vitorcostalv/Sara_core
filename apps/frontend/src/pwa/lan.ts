// Injetado por scripts/serve-lan.mjs quando o app é servido na rede local.
// Fora desse modo (dev, build normal, Android) não existe e tudo segue como antes.
export interface SaraLanInfo {
  apiBaseUrl: string;
  url: string;
  urls: { name: string; url: string }[];
  qrSvg: string;
  /** Presente quando o PC criou a própria rede (Sara-Celular-Hotspot.bat). */
  wifi?: { ssid: string; passphrase: string; qrSvg: string } | null;
}

declare global {
  interface Window {
    __SARA_LAN__?: SaraLanInfo;
  }
}

export function getLanInfo(): SaraLanInfo | null {
  return typeof window !== "undefined" ? window.__SARA_LAN__ ?? null : null;
}
