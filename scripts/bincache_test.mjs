// R2a: vlastní cache wasm/assets bez service workeru. 1) online start naplní Cache API, 2) .zst vrací 404 (server "pryč") → start z cache,
// 3) totéž uvnitř iframe z jiného originu (jako itch). Env: Q = URL parametry navíc (např. webkit_sim=1), CHROME, PW.
const { chromium } = await import(process.env.PW || "playwright");
const base = "http://localhost:5173/", q = "sw=0&mp=0" + (process.env.Q ? "&" + process.env.Q : "");
const profile = process.argv[2] || "bincache_profile";
const ctx = await chromium.launchPersistentContext(profile, { headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"], viewport: { width: 1400, height: 850 } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fail = 0; const check = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) fail++; };
async function launch(frame, label) {
  const t0 = Date.now();
  await frame.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await frame.getByRole("button", { name: /Launch Blender/ }).click({ timeout: 120000 });
  let up = false;
  for (let i = 0; i < 300; i++) { if ((await frame.evaluate(() => window.__BGUI__ || {}).catch(() => ({}))).window) { up = true; break; } await wait(1000); }
  console.log(label, "up:", up, "s:", ((Date.now() - t0) / 1000).toFixed(1));
  return up;
}
// 1. online
let page = await ctx.newPage(); const logs = []; page.on("console", (m) => logs.push(m.text()));
const t1 = Date.now(); await page.goto(base + "?" + q, { waitUntil: "load" });
let ready1 = false; for (let i = 0; i < 300 && !ready1; i++) { ready1 = await page.getByRole("button", { name: /Launch Blender/ }).isEnabled().catch(() => false); if (!ready1) await wait(1000); }
const dt1 = (Date.now() - t1) / 1000;
const keys = await page.evaluate(async () => (await (await caches.open("blender-bin-v1")).keys()).map((r) => new URL(r.url).pathname));
check(ready1, `online: Launch připraven za ${dt1.toFixed(1)} s`);
check(keys.some((k) => /blender(-pc)?\.wasm\.zst$/.test(k)) && keys.some((k) => k.endsWith("assets.tar.zst")), "cache má wasm i assets: " + keys.join(","));
check(await launch(page, "online"), "online: Blender běží");
await page.close();
// 2. server "pryč": všechny .zst → 404 (HEAD i GET)
page = await ctx.newPage(); const logs2 = []; page.on("console", (m) => logs2.push(m.text()));
let zstReq = 0; await page.route("**/*.zst", (r) => { zstReq++; r.fulfill({ status: 404, body: "gone" }); });
const t2 = Date.now(); await page.goto(base + "?" + q, { waitUntil: "load" });
let ready2 = false; for (let i = 0; i < 120 && !ready2; i++) { ready2 = await page.getByRole("button", { name: /Launch Blender/ }).isEnabled().catch(() => false); if (!ready2) await wait(500); }
const dt2 = (Date.now() - t2) / 1000;
check(ready2, `404: Launch připraven z cache za ${dt2.toFixed(1)} s (síť by 404, požadavků ${zstReq})`);
check(logs2.filter((l) => l.startsWith("bin cache hit")).length === 2, "2× 'bin cache hit': " + logs2.filter((l) => l.startsWith("bin cache")).join(" ; "));
check(await launch(page, "404"), "404: Blender běží z cache");
await page.close();
// 3. iframe z jiného originu (127.0.0.1:5175 → localhost:5173), jako itch
const http = await import("node:http");
const srv = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" });
  res.end(`<body style="margin:0"><iframe id=f src="${base}?${q}" allow="cross-origin-isolated; fullscreen" style="width:100vw;height:100vh;border:0"></iframe>`); }).listen(5175, "127.0.0.1");
const parent = "http://127.0.0.1:5175/";
async function iframePhase(block) {
  const pg = await ctx.newPage(); let z = 0;
  if (block) await pg.route("**/*.zst", (r) => { z++; r.fulfill({ status: 404, body: "gone" }); });
  const t = Date.now(); await pg.goto(parent, { waitUntil: "domcontentloaded" });
  const fr = pg.frameLocator("#f"); let ready = false;
  for (let i = 0; i < 90 && !ready; i++) { ready = await fr.getByRole("button", { name: /Launch Blender/ }).isEnabled().catch(() => false); if (!ready) await wait(1000); }
  const frame = pg.frames().find((f) => f.url().startsWith(base));
  const n = frame ? await frame.evaluate(async () => (await (await caches.open("blender-bin-v1")).keys()).length).catch(() => -1) : -2;
  const iso = frame ? await frame.evaluate(() => crossOriginIsolated).catch(() => null) : null;
  console.log(`iframe block=${block}: ready=${ready} ${((Date.now() - t) / 1000).toFixed(1)} s, cache keys=${n}, isolated=${iso}, .zst requests=${z}`);
  await pg.close(); return { ready, n };
}
const a = await iframePhase(false); check(a.ready && a.n >= 2, "iframe (jiný origin): online start + zápis do Cache API");
const b = await iframePhase(true); check(b.ready && b.n >= 2, "iframe + .zst 404: start z cache");
srv.close(); await ctx.close();
console.log(fail ? "FAIL bincache" : "PASS bincache"); process.exit(fail ? 1 : 0);
