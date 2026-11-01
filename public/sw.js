const CACHE_NAME = "callio-shell-v4";
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(["/", "/manifest.webmanifest", "/callio-icon.svg"])));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  ]));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
  }
});
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "Someone is calling you on Callio." }; }
  const data = payload.data || {};
  const title = payload.title || data.title || payload.notification?.title || "Incoming Call — Callio";
  const options = {
    body: payload.body || data.body || payload.notification?.body || "Open Callio to answer your call.",
    icon: "/callio-icon.svg",
    badge: "/callio-icon.svg",
    tag: payload.tag || "callio-incoming-call",
    renotify: true,
    requireInteraction: true,
    data: { url: payload.url || data.url || (data.callId ? `/?call=${encodeURIComponent(data.callId)}` : "/"), callId: data.callId || payload.callId || "" },
    vibrate: [250, 150, 250, 150, 400]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.location.origin));
    if (existing) { await existing.focus(); if ("navigate" in existing) return existing.navigate(target); return existing; }
    return self.clients.openWindow(target);
  }));
});
