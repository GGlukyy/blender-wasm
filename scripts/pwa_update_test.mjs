// O1c: automatická aktualizace PWA před startem. node pwa_update_test.mjs first|second <url> <profileDir>
// first: 1. návštěva (SW + version.json do cache). second: server už servíruje JINÝ version.json → po načtení stránky (bez kliknutí na Launch lištu)
// se cache smaže a stránka sama reloadne; musí se objevit nová verze v cache a žádná oranžová lišta; splash ukazuje build.
const { chromium } = await import(process.env.PW || "playwright");
const [phase, url, profile] = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext(profile, { headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1200,800"], viewport: { width: 1100, height: 700 } });
const page = ctx.pages()[0] || await ctx.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cachedV = () => page.evaluate(async () => { try { const c = await caches.open("blender-web-offline"); const r = await c.match("version.json"); return r ? (await r.json()).v : null; } catch { return null; } });
await page.goto(url + "?mp=0", { waitUntil: "load" });
if (phase === "first") {
  for (let i = 0; i < 60 && !(await page.evaluate(() => crossOriginIsolated && !!navigator.serviceWorker.controller).catch(() => false)); i++) await wait(500);
  let v = null; for (let i = 0; i < 40 && !(v = await cachedV().catch(() => null)); i++) await wait(500);
  const ver = await page.evaluate(() => document.getElementById("build-version").textContent);
  console.log("cached version:", v, "| splash:", ver);
  const ok = !!v && /build/.test(ver); console.log(ok ? "PASS first" : "FAIL first"); await ctx.close(); process.exit(ok ? 0 : 1);
}
const want = Number(process.env.WANT_V);
for (let i = 0; i < 60 && !(await page.evaluate(() => crossOriginIsolated).catch(() => false)); i++) await wait(500);
/* aktualizace + reload proběhnou hned po načtení (před kliknutím); marker se proto nastaví až po ní: reload = auto_upd v sessionStorage */
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click({ timeout: 60000 }).catch(() => {});
let v = null, reloaded = false;
for (let i = 0; i < 60; i++) { await wait(500);
  try { reloaded = reloaded || (await page.evaluate(() => sessionStorage.getItem("auto_upd") === "1")); v = await cachedV(); } catch { reloaded = true; }
  if (reloaded && v === want) break; }
await wait(1500);
const banner = await page.evaluate(() => !!document.getElementById("sw-update")).catch(() => false);
const auto = await page.evaluate(() => sessionStorage.getItem("auto_upd")).catch(() => null);
console.log("reloaded:", reloaded, "cached v:", v, "want:", want, "banner:", banner, "auto_upd:", auto);
const ok = reloaded && v === want && !banner;
console.log(ok ? "PASS second" : "FAIL second"); await ctx.close(); process.exit(ok ? 0 : 1);
