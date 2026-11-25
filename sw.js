const cacheName = "english-vocab-app-v1";
const shell = ["./", "./index.html", "./style.css", "./app.js", "./study.js", "./words.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(shell)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name =>
    name.startsWith("english-vocab-app-") && name !== cacheName
  ).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith(caches.open(cacheName).then(async cache => {
    return (await cache.match(event.request, { ignoreSearch: true }))
      || (event.request.mode === "navigate" && await cache.match("./index.html"))
      || fetch(event.request);
  }));
});
