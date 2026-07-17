// Bumped from v1 -> v2 so an old cached release is fully replaced after an update.
const CACHE_VERSION = "sara-core-pwa-v2";
const APP_SHELL = [
  "/",
  "/ecology",
  "/manifest.webmanifest",
  "/sara_core.png",
  "/textures/waternormals.jpg",
  "/fauna/capivara.png",
  "/fauna/onca-pintada.png",
  "/fauna/invasor-javali.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cache-first with background store: return cache if present, otherwise fetch and
// persist the response for offline use. Only same-origin, non-opaque, OK responses.
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request)
      .then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => cached);
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Never intercept API traffic: online/offline modes must stay explicit and truthful.
  if (url.pathname.startsWith("/api/")) return;

  // Only handle same-origin requests; let the network handle cross-origin (CDN, provider).
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first, fall back to the cached app shell so an offline
  // reload still boots the SPA (client-side router then handles the route).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put("/ecology", copy));
          return response;
        })
        .catch(() => caches.match("/ecology").then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Hashed build assets (JS/CSS/etc.), fauna sprites, and textures: cache-first + store.
  // Without this the app shell HTML would reload offline but its scripts/styles would 404,
  // leaving a blank screen. Hashed filenames make cache-first safe across releases.
  event.respondWith(cacheFirst(request));
});
