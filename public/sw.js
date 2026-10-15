/* מטמון פשוט: הדף תמיד מהרשת כשאפשר, קבצי בנייה, אייקונים ותמונות הארכיון מהמטמון */
const CACHE = "musa-v6";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        (await caches.open(CACHE)).put("/", res.clone());
        return res;
      } catch {
        return (await caches.match("/")) || Response.error();
      }
    })());
    return;
  }

  const ownAsset = url.origin === location.origin && /^\/(assets|icons)\/|^\/logo\.png$/.test(url.pathname);
  const archiveImage = url.pathname.includes("/storage/v1/object/public/musa-media/");
  if (ownAsset || archiveImage) {
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === "opaque") (await caches.open(CACHE)).put(req, res.clone());
      return res;
    })());
  }
});
