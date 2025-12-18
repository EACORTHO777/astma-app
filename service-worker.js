const CACHE_NAME = "astma-app-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "/config.json",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});