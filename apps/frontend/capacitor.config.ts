import type { CapacitorConfig } from "@capacitor/cli";

// Sara Core Android wrapper.
//
// The app bundles the local production frontend build (webDir: "dist") — it is NOT a remote
// website wrapper. `server.url` is intentionally left unset so the APK ships the offline demo
// scenarios, Presentation Mode and Modo leve without needing a network. Online ("Ao vivo") mode
// still works: it talks to the configurable remote backend via the in-app API base URL setting
// (VITE_API_BASE_URL / the "Configuracoes avancadas" field), never a hard-coded server.
const config: CapacitorConfig = {
  appId: "com.saracore.app",
  appName: "Sara Core",
  webDir: "dist",
  android: {
    // Cleartext stays off: production backends are expected over HTTPS. Local dev against an
    // http:// backend should use the in-app base URL field on an emulator/device that allows it.
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
};

export default config;
