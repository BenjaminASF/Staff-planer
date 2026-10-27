const CACHE_NAME = "staff-planner-v20261027-push1";
const APP_FILES = ["./", "./index.html", "./dashboard.html", "./produktion.html", "./rast.html", "./personal.html", "./anvandare.html", "./testresultat.html", "./maskiner.html", "./maskinhantering.html", "./bedomning.html", "./anteckningar.html", "./add.html", "./installningar.html", "./hjalp.html", "./profil.html", "./style.css", "./theme.js", "./app.js", "./manifest.webmanifest", "./app-icon.svg", "./app-icon-192.png"];
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

// Push notifications. The server sends only a short text without names; the page the
// notice opens shows the details after sign-in.
self.addEventListener("push", event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  event.waitUntil(self.registration.showNotification(data.title || "Staff Planner", {
    body: data.body || "Det finns något nytt i Staff Planner.",
    tag: data.tag || "staff-planner",
    renotify: Boolean(data.tag),
    icon: "./app-icon-192.png",
    badge: "./app-badge.png",
    lang: "sv",
    data: { url: data.url || "index.html" }
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "index.html", self.registration.scope);
  // Only pages of this app are opened.
  if (target.origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (open) {
      await open.focus();
      return open.navigate(target.href).catch(() => self.clients.openWindow(target.href));
    }
    return self.clients.openWindow(target.href);
  })());
});

// The browser renewed the subscription: the server is told about the new one.
self.addEventListener("pushsubscriptionchange", event => {
  const old = event.oldSubscription;
  const applicationServerKey = old?.options?.applicationServerKey;
  if (!applicationServerKey) return;
  event.waitUntil((async () => {
    const subscription = event.newSubscription || await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
    await fetch("./api/push/subscriptions", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "StaffPlanner" },
      body: JSON.stringify({ ...subscription.toJSON(), replaces: old.endpoint })
    });
  })().catch(error => console.warn("Push subscription could not be renewed:", error)));
});
