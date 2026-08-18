export function registerSaraPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Os avisos de rede da UI valem em dev e em produção.
  window.addEventListener("online", () => window.dispatchEvent(new CustomEvent("sara:network-change")));
  window.addEventListener("offline", () => window.dispatchEvent(new CustomEvent("sara:network-change")));

  // Em dev o precache do sw.js serve bundle velho e mascara o hot-reload. Além de
  // não registrar, removemos worker/caches deixados por execuções anteriores.
  if (import.meta.env.DEV) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => {
        // Limpeza best-effort: o app funciona mesmo se o browser negar.
      });

    if ("caches" in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {
          // idem
        });
    }

    return;
  }

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
}
