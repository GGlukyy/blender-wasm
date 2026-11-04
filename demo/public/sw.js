/* O1a: offline PWA service worker.
 * - Same-origin GETs are cached (Cache Storage) as they are fetched; once cached they are served from cache, so the app
 *   starts without network (iPad: "Add to Home Screen", airplane mode).
 * - Every response gets COOP/COEP/CORP headers (the page needs crossOriginIsolated for threads; cached/static hosts
 *   may not send them). Pattern: coi-serviceworker (MIT, gzuidhof).
 * - version.json (written by the build) is checked on each navigation; when it differs from the cached copy the page
 *   is told (message {type:"update-available"}) and the user decides ({type:"update"} wipes the cache, then reload).
 * - The page posts {type:"precache", urls} with the resources it already loaded before the SW took control. */
const CACHE = "blender-web-offline";
const SKIP = /\/(ask\.txt|__telemetry|sw\.js)(\?|$)|^\/@|^\/node_modules\//;

const withIso = (res) => {
  if (!res || res.type === "opaque" || res.status === 0 || res.status === 206) return res;
  const h = new Headers(res.headers);
  h.set("Cross-Origin-Embedder-Policy", "require-corp");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "cross-origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
};
const key = (req) => { const u = new URL(req.url); u.search = ""; u.hash = ""; return u.toString(); };

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

const notify = async (msg) => { for (const c of await self.clients.matchAll()) c.postMessage(msg); };

async function checkVersion() {
  try {
    const cache = await caches.open(CACHE);
    const net = await fetch("version.json", { cache: "no-store" });
    if (!net.ok) return;
    const fresh = await net.clone().text();
    const old = await cache.match("version.json");
    if (!old) { await cache.put("version.json", net); return; }
    if ((await old.text()) !== fresh) await notify({ type: "update-available" });
  } catch { /* offline: nothing to check */ }
}

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || SKIP.test(url.pathname) || req.headers.has("range")) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key(req));
    if (req.mode === "navigate") e.waitUntil(checkVersion());
    if (hit) return withIso(hit);
    try {
      const net = await fetch(req);
      if (net.ok && net.status === 200) e.waitUntil(cache.put(key(req), net.clone()));
      return withIso(net);
    } catch (err) {
      if (req.mode === "navigate") { const idx = await cache.match(key(new Request(new URL("./", self.registration.scope)))); if (idx) return withIso(idx); }
      throw err;
    }
  })());
});

self.addEventListener("message", (e) => {
  const m = e.data || {};
  if (m.type === "precache") {
    e.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      for (const u of m.urls || []) {
        try { const url = new URL(u, self.location.href); if (url.origin !== self.location.origin || SKIP.test(url.pathname)) continue;
          if (!(await cache.match(key(new Request(url))))) { const r = await fetch(url); if (r.ok && r.status === 200) await cache.put(key(new Request(url)), r); } } catch { /* ignore */ }
      }
      await checkVersion();
    })());
  } else if (m.type === "update") {
    e.waitUntil(caches.delete(CACHE).then(() => notify({ type: "updated" })));
  }
});
