const CACHE_NAME = "staff-planner-v20261021-vm1";
const APP_FILES = ["./", "./index.html", "./dashboard.html", "./produktion.html", "./rast.html", "./personal.html", "./anvandare.html", "./testresultat.html", "./maskiner.html", "./bedomning.html", "./todo.html", "./add.html", "./installningar.html", "./hjalp.html", "./profil.html", "./style.css", "./theme.js", "./app.js", "./manifest.webmanifest", "./app-icon.svg"];
const APP_URLS = new Set(APP_FILES.map(path => new URL(path, self.registration.scope).pathname));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith("staff-planner-") && key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || !APP_URLS.has(url.pathname)) return;
  const network = fetch(event.request);
  event.waitUntil(network.then(async response => {
    if (!response.ok || response.type === "opaque") return;
    const copy = response.clone();
    const cache = await caches.open(CACHE_NAME);
    // A versioned asset (?v=) never changes, so it is written to the cache only once
    // instead of on every page change.
    if (url.searchParams.has("v") && await cache.match(event.request)) return;
    await cache.put(event.request, copy);
  }).catch(error => console.debug("Offline cache update skipped:", error)));
  event.respondWith(network.catch(async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    if (event.request.mode === "navigate") return (await cache.match("./index.html")) || Response.error();
    return Response.error();
  }));
});
