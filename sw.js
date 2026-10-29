// Ecotalk Wild concept demo: offline cache.
// After the first online visit, the app and every asset it has loaded keep working with no signal.
const CACHE = "ecotalk-wild-v3";
const CORE = [
  "./", "./index.html", "./app.html", "./business.html", "./manifest.json",
  "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png"
];
const OPTIONAL = [
  "assets/BornaMedium.otf", "assets/logo.png", "assets/logo_white.png", "assets/uk_map.png",
  "assets/beaver_swim.jpg", "assets/beaver_close.jpg", "assets/beaver_water.jpg",
  "assets/downicary_aerial.jpg", "assets/bowyers_wood.jpg", "assets/packham.jpg",
  "assets/dale.jpg", "assets/owl.jpg", "assets/hedgehog.jpg", "assets/otter.jpg",
  "assets/beaver_loop.mp4"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(CORE);
    // optional files: cache the ones that exist, ignore the rest
    await Promise.all(OPTIONAL.map(u => fetch(u).then(r => r.ok && c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // never cache YouTube embeds or video range requests
  if (url.hostname.includes("youtube") || req.headers.has("range")) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    // the page itself: always try the network first so updates show straight away
    if (req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/")) {
      try { const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }
      catch (err) { return (await c.match(req, { ignoreSearch: true })) || (await c.match("./index.html")) || Response.error(); }
    }
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) { fetch(req).then(r => r.ok && c.put(req, r.clone())).catch(() => {}); return hit; }
    try {
      const r = await fetch(req);
      if (r.ok || r.type === "opaque") c.put(req, r.clone());
      return r;
    } catch (err) {
      if (req.mode === "navigate") return (await c.match("./index.html")) || Response.error();
      return Response.error();
    }
  })());
});
