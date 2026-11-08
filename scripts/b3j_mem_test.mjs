// B3j: rozpad paměti renderer procesu Chrome po startu (co je mimo acct_mb).
// env B3J_Q = query, env B3J_JSF = extra --js-flags; Arg1 = sekundy klidu po startu (default 30).
// Výstup: řádek MEM {...}: renderer/gpu private MB, wasm heap, measureUserAgentSpecificMemory po druzích, acct_mb.
const { chromium } = await import(process.env.PW || "playwright");
const { execSync } = await import("node:child_process");
const q = (process.env.B3J_Q || "").trim(), jsf = (process.env.B3J_JSF || "").trim(), secs = +(process.argv[2] || 30);
const args = ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950", "--enable-blink-features=ForceEagerMeasureMemory"];
if (jsf) args.push("--js-flags=" + jsf);
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const cdp = await browser.newBrowserCDPSession();
await page.goto("http://localhost:5173/?tel=0&perf=1" + (q ? "&" + q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(secs * 1000);
function procs() {
  return cdp.send("SystemInfo.getProcessInfo").then(({ processInfo }) => {
    const ids = processInfo.map(p => p.id);
    const out = execSync(`powershell -NoProfile -Command "Get-Process -Id ${ids.join(",")} -ErrorAction SilentlyContinue | % { $_.Id.ToString() + ' ' + [int]($_.PrivateMemorySize64/1MB) + ' ' + [int]($_.WorkingSet64/1MB) }"`).toString();
    const m = {}; for (const l of out.split(/\r?\n/)) { const [id, p, w] = l.trim().split(" "); if (id) m[id] = [+p, +w]; }
    const s = {}; for (const p of processInfo) { const v = m[p.id]; if (v) { s[p.type] = s[p.type] || [0, 0]; s[p.type][0] += v[0]; s[p.type][1] += v[1]; } }
    return s;
  });
}
const js0 = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
const pcdp = await page.context().newCDPSession(page); await pcdp.send("HeapProfiler.enable"); await pcdp.send("HeapProfiler.collectGarbage"); await wait(2000);
const js1 = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
console.log("JSGC before=" + js0 + " after=" + js1);
const pr = await procs();
const ua = await page.evaluate(async () => {
  if (!performance.measureUserAgentSpecificMemory) return { err: "no api", coi: self.crossOriginIsolated };
  const r = await performance.measureUserAgentSpecificMemory();
  const by = {};
  for (const b of r.breakdown) { const k = (b.types || []).join("+") + "|" + (b.attribution || []).map(a => a.scope + ":" + String(a.url || "").split("/").pop().slice(0, 30)).join("+"); by[k] = (by[k] || 0) + Math.round(b.bytes / 1048576); }
  return { total_mb: Math.round(r.bytes / 1048576), by };
}).catch(e => ({ err: String(e) }));
const pf = await page.evaluate(() => { const p = window.__PERF__ || {}, g = window.__GPUMEM__ || {};
  return { js_used_mb: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, js_total_mb: performance.memory ? Math.round(performance.memory.totalJSHeapSize / 1048576) : null, heap_mb: p.heap_mb, heap_used_mb: p.heap_used_mb, acct_mb: p.acct_mb, gtex_mb: g.tex_mb, gbuf_mb: g.buf_mb, wgpu_live: g.wgpu_live, pipes: g.pipelines_created,
    wmem_mb: (window.Module && Module.HEAPU8) ? Math.round(Module.HEAPU8.buffer.byteLength / 1048576) : null }; }).catch(() => ({}));
console.log("MEM " + JSON.stringify({ q, jsf, renderer_priv: pr.renderer?.[0], renderer_ws: pr.renderer?.[1], gpu_priv: pr.GPU?.[0], browser_priv: pr.browser?.[0], ...pf, ua }));
await page.screenshot({ path: "out/b3j_mem.png" });
await browser.close();
