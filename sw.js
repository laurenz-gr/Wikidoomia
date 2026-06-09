/* Wikidoomia service worker — app-shell offline + font caching.
   Note: Wikipedia content is fetched via JSONP (unique callback per request),
   so it is intentionally never cached; offline shows the in-app retry state. */
const VERSION = "wikifeed-v3";
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Wikipedia API (JSONP) — always network, never cache.
  if (url.hostname.endsWith("wikipedia.org")) return;

  // Google Fonts — stale-while-revalidate so the display font works offline.
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const cached = await c.match(req);
      const net = fetch(req).then((r) => { c.put(req, r.clone()); return r; }).catch(() => cached);
      return cached || net;
    }));
    return;
  }

  // Same-origin: network-first for the HTML document (so updates always arrive when
  // online), cache-first for other static assets, with an offline fallback to the shell.
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || req.destination === "document") {
      e.respondWith(
        fetch(req)
          .then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put("index.html", cp)); return r; })
          .catch(() => caches.match(req).then((c) => c || caches.match("index.html")))
      );
      return;
    }
    e.respondWith(caches.match(req).then((c) => c || fetch(req)));
  }
});
