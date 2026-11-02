/* Callio PWA service worker — offline shell + incoming call notifications. */
const CACHE_NAME = "callio-shell-v6";
const APP_SHELL = ["/", "/manifest.webmanifest", "/callio-icon.svg", "/callio-icon-192.png", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("callio-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Keep navigations fresh, but fall back to the cached app shell when offline.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put("/", response.clone());
        }
        return response;
      } catch {
        return (await caches.match("/")) || (await caches.match("/offline.html"));
      }
    })());
    return;
  }

  // Cache immutable Next build assets and public app assets after first use.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/callio-") || url.pathname.startsWith("/sounds/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return cached || Response.error();
      }
    })());
  }
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { body: event.data?.text() || "Someone is calling you on Callio." }; }
  const data = payload.data || {};
  const callId = data.callId || payload.callId || "";
  const title = payload.title || data.title || payload.notification?.title || "Incoming Call — Callio";
  const options = {
    body: payload.body || data.body || payload.notification?.body || "Your friend is calling you.",
    icon: "/callio-icon-192.png",
    badge: "/callio-icon-192.png",
    tag: callId ? `callio-call-${callId}` : "callio-incoming-call",
    renotify: true,
    requireInteraction: true,
    timestamp: Date.now(),
    data: { callId, url: payload.url || data.url || (callId ? `/?call=${encodeURIComponent(callId)}` : "/") },
    vibrate: [300, 120, 300, 120, 500],
    actions: [
      { action: "answer", title: "Open to answer" },
      { action: "reject", title: "Decline" }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const notification = event.notification;
  const callId = notification.data?.callId || "";
  const action = event.action === "reject" ? "reject" : "answer";
  notification.close();
  const url = new URL(notification.data?.url || "/", self.location.origin);
  if (callId) {
    url.searchParams.set("call", callId);
    url.searchParams.set("action", action);
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const appWindow = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (appWindow) {
      await appWindow.focus();
      if ("navigate" in appWindow) await appWindow.navigate(url.href);
      return;
    }
    await self.clients.openWindow(url.href);
  })());
});

self.addEventListener("notificationclose", () => {
  // Intentionally no call-state mutation: dismissing an alert is not rejecting a call.
});
