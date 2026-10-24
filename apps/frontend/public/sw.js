const CACHE_VERSION = "sara-core-pwa-v8";
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

async function precacheApp() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(APP_SHELL);
  // On the first visit the bundle loads before the worker controls the page.
  // Precache entry scripts/styles explicitly so that the very next reload works offline.
  const shell = await cache.match("/ecology");
  if (!shell) throw new Error("App shell is missing from the precache");
  const html = await shell.text();
  const buildAssets = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+|\/runtime-config\.js)["']/g)].map((match) => match[1]);
  await cache.addAll([...new Set(buildAssets)]);
  await self.skipWaiting();
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheApp());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("sara-core-pwa-") && key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Cache writes are awaited so worker termination cannot interrupt persistence.
async function storeResponse(request, response) {
  try {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response);
  } catch {
    // A full or unavailable cache must not discard a successful network response.
  }
}

async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_VERSION);
    // Module requests carry Origin while install-time precache requests may not.
    // Public static assets are identical for both; Vary: Origin must not hide them offline.
    const cached = await cache.match(request, { ignoreVary: true });
    if (cached) return cached;
  } catch {
    // Try the network even if browser cache access is unavailable.
  }
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await storeResponse(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
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
        .then(async (response) => {
          if (response.ok) await storeResponse("/ecology", response.clone());
          return response;
        })
        .catch(async () => {
          try {
            const cache = await caches.open(CACHE_VERSION);
            return (await cache.match("/ecology")) || (await cache.match("/")) || Response.error();
          } catch {
            return Response.error();
          }
        })
    );
    return;
  }

  // Hashed build assets (JS/CSS/etc.), fauna sprites, and textures: cache-first + store.
  // Without this the app shell HTML would reload offline but its scripts/styles would 404,
  // leaving a blank screen. Hashed filenames make cache-first safe across releases.
  event.respondWith(cacheFirst(request));
});
