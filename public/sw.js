// Shift Master service worker. Deliberately small: every page shows data that
// belongs to the signed-in member and changes daily, so nothing from the app is
// cached. The only thing kept is the offline notice shown when a page cannot be
// loaded at all. Bump VERSION when offline.html changes.
const VERSION = "v1";
const CACHE = `shiftmaster-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Only full page loads; data requests, Server Actions and assets go straight to the network.
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});
