export function registerSaraPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              window.dispatchEvent(new CustomEvent("sara:pwa-update-ready"));
            }
          });
        });
      })
      .catch(() => {
        // PWA registration is progressive enhancement; the app remains usable online.
      });
  });

  window.addEventListener("online", () => window.dispatchEvent(new CustomEvent("sara:network-change")));
  window.addEventListener("offline", () => window.dispatchEvent(new CustomEvent("sara:network-change")));
}
