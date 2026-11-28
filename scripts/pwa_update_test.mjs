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
await page.goto(url + "?mp=0" + (process.env.Q ? "&" + process.env.Q : ""), { waitUntil: "load" });
if (phase === "first") {
  for (let i = 0; i < 60 && !(await page.evaluate(() => crossOriginIsolated && !!navigator.serviceWorker.controller).catch(() => false)); i++) await wait(500);
  let v = null; for (let i = 0; i < 40 && !(v = await cachedV().catch(() => null)); i++) await wait(500);
  const ver = await page.evaluate(() => document.getElementById("build-version").textContent);
  console.log("cached version:", v, "| splash:", ver);
  const ok = !!v && /build/.test(ver); console.log(ok ? "PASS first" : "FAIL first"); await ctx.close(); process.exit(ok ? 0 : 1);
}
const want = Number(process.env.WANT_V);
if (phase === "run1" || phase === "run2") {
  /* O1d: run1 = Blender běží se změněnou scénou (přidaná opice) a přehrává animaci; server pak dostane novou verzi (skript venku).
   * run2 (stejná karta nejde mezi běhy → tentýž profil): spustit, změnit scénu, přehrávat; nová verze → během přehrávání NESMÍ reload;
   * po zastavení přehrávání (2 s klid) → autosave + reload sám → obnovená scéna má opici, lišta „Aktualizováno“. */
  const PY = "import bpy\ndef _t():\n    bpy.ops.mesh.primitive_monkey_add(location=(3,0,0)); bpy.context.active_object.name='O1D_MONKEY'; bpy.ops.ed.undo_push(message='o1d')\n" +
    "    w = bpy.context.window_manager.windows[0]\n    with bpy.context.temp_override(window=w, screen=w.screen): bpy.ops.screen.animation_play()\n    print('O1D_READY dirty=%s n=%d' % (bpy.data.is_dirty, len(bpy.data.objects)), flush=True)\n" +
    "bpy.app.timers.register(_t, first_interval=8.0)\n" +
    "def _s():\n    import os\n    if os.path.exists('/tmp/o1d_stop.txt'):\n        os.remove('/tmp/o1d_stop.txt'); w = bpy.context.window_manager.windows[0]\n" +
    "        with bpy.context.temp_override(window=w, screen=w.screen): bpy.ops.screen.animation_cancel(restore_frame=False)\n        print('O1D_STOPPED', flush=True)\n    return 0.5\n" +
    "bpy.app.timers.register(_s, first_interval=9.0, persistent=True)\n";
  const log = []; const on = (p) => p.on("console", (m) => { const t = m.text(); if (/O1D|WEB_RESTORED|RESTORE_AUTO|update-available|AUTOSAVE/.test(t)) { log.push(t); console.log("  " + Math.round(performance.now() / 1000) + "s " + t); } });
  on(page);
  /* scénu měnit jen při prvním startu v kartě; po automatickém reloadu jen kontrola opice (sessionStorage přežije reload) */
  const CHK = "import bpy\ndef _m():\n    o = bpy.data.objects.get('O1D_MONKEY'); print('O1D_HAS_MONKEY', o is not None, bpy.data.filepath, flush=True)\n    return 3.0\nbpy.app.timers.register(_m, first_interval=10.0, persistent=True)";
  await page.addInitScript(([py, chk]) => { if (!sessionStorage.getItem("o1d_once")) { sessionStorage.setItem("o1d_once", "1"); window.__BARGS = ["--python-expr", py]; } else window.__BARGS = ["--python-expr", chk]; }, [PY, CHK]);
  /* restore=auto: s __BARGS by se jinak autosave jen nabídl (testový režim) */
  await page.goto(url + "?mp=0&updevery=5&restore=auto" + (process.env.Q ? "&" + process.env.Q : ""), { waitUntil: "load" });
  for (let i = 0; i < 60 && !(await page.evaluate(() => crossOriginIsolated).catch(() => false)); i++) await wait(500);
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click({ timeout: 120000 });
  for (let i = 0; i < 120 && !log.some((l) => /O1D_READY/.test(l)); i++) await wait(1000);
  if (phase === "run1") { console.log(log.some((l) => /O1D_READY/.test(l)) ? "PASS run1" : "FAIL run1"); await ctx.close(); process.exit(0); }
  /* run2: verzi B už server má (skript ji změnil před run2) → do ~10 s ji SW najde; během přehrávání nic */
  let navigated = false; page.on("framenavigated", (f) => { if (f === page.mainFrame()) navigated = true; });
  await wait(25000);
  const waited = log.some((l) => /update found while running/.test(l));
  const noReloadWhilePlaying = !navigated;
  console.log("found:", waited, "no reload while playing:", noReloadWhilePlaying);
  await page.evaluate(() => window.Module.FS.writeFile("/tmp/o1d_stop.txt", "1"));
  for (let i = 0; i < 60 && !navigated; i++) await wait(1000);
  /* po reloadu: obnova (R1) + lišta */
  let note = null, monkey = null;
  for (let i = 0; i < 120; i++) { await wait(1000);
    note = note || await page.evaluate(() => { const n = document.getElementById("upd-note"); return n ? n.textContent : null; }).catch(() => null);
    monkey = log.filter((l) => /O1D_HAS_MONKEY/.test(l)).pop() || null;
    if (log.some((l) => /WEB_RESTORED/.test(l)) && /True/.test(monkey || "") && note) break; }
  const v = await cachedV().catch(() => null);
  console.log("navigated:", navigated, "restored:", log.some((l) => /WEB_RESTORED/.test(l)), "monkey:", monkey, "note:", note, "cached v:", v, "want:", want);
  const started = await page.evaluate(() => !!window.__blenderStarted).catch(() => false);
  console.log("autostart after reload:", started);
  const ok = started && waited && noReloadWhilePlaying && navigated && log.some((l) => /WEB_RESTORED/.test(l)) && /True/.test(monkey || "") && !!note && v === want;
  console.log(ok ? "PASS run2" : "FAIL run2"); await ctx.close(); process.exit(ok ? 0 : 1);
}
for (let i = 0; i < 60 && !(await page.evaluate(() => crossOriginIsolated).catch(() => false)); i++) await wait(500);
/* aktualizace + reload proběhnou hned po načtení (před kliknutím); marker se proto nastaví až po ní: reload = auto_upd v sessionStorage */
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click({ timeout: 60000 }).catch(() => {});
let v = null, reloaded = false;
for (let i = 0; i < 60; i++) { await wait(500);
  try { reloaded = reloaded || (await page.evaluate(() => !!sessionStorage.getItem("auto_upd"))); v = await cachedV(); } catch { reloaded = true; }
  if (reloaded && v === want) break; }
await wait(1500);
const banner = await page.evaluate(() => !!document.getElementById("sw-update")).catch(() => false);
const auto = await page.evaluate(() => sessionStorage.getItem("auto_upd")).catch(() => null);
console.log("reloaded:", reloaded, "cached v:", v, "want:", want, "banner:", banner, "auto_upd:", auto);
const ok = reloaded && v === want && !banner;
console.log(ok ? "PASS second" : "FAIL second"); await ctx.close(); process.exit(ok ? 0 : 1);
