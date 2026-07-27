// BrainBox offline support — network-first runtime caching.
//
// Always tries the network first so online users (browser or the
// Capacitor Android app) keep getting the newest content exactly like
// before this file existed -- nothing here masks a fresh deploy. Only
// when a request fails outright (no connectivity) does it fall back to
// whatever was cached the last time that URL loaded successfully.
//
// Cross-origin requests (Firebase, Google Fonts, gstatic, etc.) are left
// alone entirely -- this only caches same-origin hub/game assets.

const CACHE_NAME = "brainbox-offline-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {}) // best-effort precache; runtime caching covers the rest
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Range-requested audio/video comes back as 206 Partial Content,
        // which the Cache API can't store (throws on .put()) -- only cache
        // full, cacheable (200) responses.
        if (response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => cached || caches.match("./index.html"))
      )
  );
});
