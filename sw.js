// SAK26 service worker — konservatiivne: network-first, vahemälu ainult offline varuks.
// Kaardiplaadid, NOTAM live-andmed, PRIA WFS ja telemeetria jäävad alati võrgust.
const CACHE = "sak26-shell-v1";
const CDN = ["unpkg.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"];
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isCdn = CDN.includes(url.hostname);
  if (!sameOrigin && !isCdn) return;                       // WMS, WFS, utm.eans.ee, receiverid
  if (sameOrigin && /notam_geo\.geojson$/.test(url.pathname)) return; // alati värske
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(m => m || (req.mode === "navigate" ? caches.match("./") : Response.error())))
  );
});
