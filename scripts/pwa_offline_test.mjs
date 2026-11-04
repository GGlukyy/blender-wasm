// O1a/O1c: offline start. node pwa_offline_test.mjs online|offline <url> <profileDir>
// online: první návštěva (SW se zaregistruje, Launch, vše se uloží do Cache Storage). offline: server je vypnutý, stránka se musí spustit z cache.
const { chromium } = await import(process.env.PW || "playwright");
const [phase, url, profile] = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext(profile, { headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"], viewport: { width: 1400, height: 850 } });
const page = ctx.pages()[0] || await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message.slice(0, 150)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto(url + "?mp=0", { waitUntil: "load" });
if (phase === "online") {
  for (let i = 0; i < 60; i++) { if (await page.evaluate(() => !!navigator.serviceWorker.controller)) break; await wait(500); if (i === 10) await page.reload({ waitUntil: "load" }); }
  console.log("sw controller:", await page.evaluate(() => !!navigator.serviceWorker.controller));
}
console.log("crossOriginIsolated:", await page.evaluate(() => crossOriginIsolated));
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click({ timeout: 60000 });
let up = false;
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) { up = true; break; } await wait(1000); }
await wait(5000);
const info = await page.evaluate(async () => {
  const c = await caches.open("blender-web-offline"); const ks = (await c.keys()).map((r) => new URL(r.url).pathname);
  const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : {};
  return { cached: ks.length, hasWasm: ks.some((k) => k.endsWith("blender.wasm.zst")), hasAssets: ks.some((k) => k.endsWith("assets.tar.zst")), hasIndex: ks.some((k) => k.endsWith("/")), usageMB: Math.round((est.usage || 0) / 1048576), quotaMB: Math.round((est.quota || 0) / 1048576) };
});
console.log(phase, "blender up:", up, JSON.stringify(info), "pageerrors:", errs.length, errs[0] || "");
await page.screenshot({ path: `out/pwa_${phase}.png` });
const ok = up && info.hasWasm && info.hasAssets && info.hasIndex && errs.length === 0;
console.log(ok ? `PASS ${phase}` : `FAIL ${phase}`);
await ctx.close(); process.exit(ok ? 0 : 1);
