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

const CACHE_NAME = "brainbox-offline-v2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  // PM round 13, item 13 -- pages that mostly work without a connection
  // (they only need the shared scripts + local question data; progress
  // saves when you're back online).
  "./gamekit.js", "./skin.js", "./juice.js", "./radio.js", "./player.js", "./firebase.js", "./leaderboard.js", "./question-pools.js",
  "./mathville/generators.js", "./azkacraft/questions.json", "./azkauniverse/questions.json",
  "./zen-mode/", "./zen-mode/script.js", "./times-rhythm/", "./times-rhythm/script.js",
  "./fractions-kitchen/", "./fractions-kitchen/script.js", "./pattern-puzzles/", "./pattern-puzzles/script.js",
  "./bo-class/", "./bo-class/script.js", "./settings/", "./settings/script.js", "./help/", "./help/script.js", "./search/", "./search/script.js"
];
// Firebase's own scripts live on gstatic.com. They are cached too (stale
// copy used only when the network fails), otherwise every page that needs
// `firebase` would break offline before its own code even runs.
const CACHEABLE_CROSS_ORIGIN = ["https://www.gstatic.com/firebasejs/"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Add one by one: a single missing file must not abort the whole precache.
      .then(cache => Promise.all(APP_SHELL.map(u => cache.add(u).catch(() => {}))))
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
  if (url.origin !== self.location.origin) {
    if (!CACHEABLE_CROSS_ORIGIN.some(p => event.request.url.startsWith(p))) return;
    event.respondWith(
      fetch(event.request)
        .then(response => { if (response.ok || response.type === "opaque") { const copy = response.clone(); caches.open(CACHE_NAME).then(c => c.put(event.request, copy)); } return response; })
        .catch(() => caches.match(event.request))
    );
    return;
  }

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
