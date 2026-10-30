// D1: heartbeat render vlákna. Python timer uspí render vlákno na 8 s; telemetrie (hlavní vlákno)
// musí během toho hlásit rt_frame beze změny a rt_phase_ms >= 6000. Po probuzení se rt_frame zase zvedá.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, time
def freeze():
    time.sleep(8); return None
bpy.app.timers.register(freeze, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
const rows = [];
page.on("request", (r) => {
  if (!/__telemetry/.test(r.url())) return;
  for (const l of (r.postData() || "").split("\n")) {
    try { const o = JSON.parse(l); if (o.kind === "sample" && o.rt_phase !== undefined) rows.push({ t: o.t, f: o.rt_frame, p: o.rt_phase, ms: o.rt_phase_ms, m: o.rt_malloc_mb, h: o.main_heap_mb }); } catch (e) {}
  }
});
await page.goto("http://localhost:5173/?tel=1&perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 30000));
for (const r of rows) console.log("HB " + JSON.stringify(r));
const maxms = Math.max(0, ...rows.map(r => r.ms)), frames = new Set(rows.map(r => r.f));
const ok = rows.length > 5 && maxms >= 6000 && frames.size > 1 && rows.some(r => r.m > 0);
console.log(`${ok ? "PASS" : "FAIL"} hb samples=${rows.length} max_phase_ms=${maxms} distinct_frames=${frames.size} malloc_mb=${rows.at(-1)?.m}`);
await browser.close();
process.exit(ok ? 0 : 1);
