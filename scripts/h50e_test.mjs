// H50e: rozklad paměti Chrome po startu. Env Q = extra query (např. pool=8), Arg1 = čekání po UI v s (default 30).
// Výstup: JSON řádky ST (OS privátní paměť po typech procesů) a ROZKLAD (wasm heap, JS heap, workery, measureUserAgentSpecificMemory).
const { chromium } = await import(process.env.PW || "playwright");
const { execSync } = await import("node:child_process");
const secs = +(process.argv[2] || 30);
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const cdp = await browser.newBrowserCDPSession();
page.on("console", (m) => { if (/H50E_T/.test(m.text())) console.log("BENCH " + m.text()); });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
function ws(pids) {
  if (!pids.length) return {};
  const out = execSync(`powershell -NoProfile -Command "Get-Process -Id ${pids.join(",")} -ErrorAction SilentlyContinue | % { $_.Id.ToString() + ' ' + [int]($_.PrivateMemorySize64/1MB) + ' ' + [int]($_.WorkingSet64/1MB) }"`).toString();
  const r = {}; for (const l of out.split(/\r?\n/)) { const [id, priv, w] = l.trim().split(" "); if (id) r[id] = [+priv, +w]; } return r;
}
const snap = async (label) => {
  const info = (await cdp.send("SystemInfo.getProcessInfo")).processInfo; const m = ws(info.map(p => p.id));
  const sum = {}; for (const p of info) if (m[p.id]) { const s = sum[p.type] ||= { priv: 0, ws: 0, n: 0 }; s.priv += m[p.id][0]; s.ws += m[p.id][1]; s.n++; }
  console.log("ST " + label + " " + JSON.stringify(sum));
};
if (process.env.BARGS) await page.addInitScript((a) => { window.__BARGS = a; }, process.env.BARGS.split("|"));
await page.addInitScript(() => { const c = new BroadcastChannel("blender-perf"); c.onmessage = (e) => { if (e.data && e.data.heap_mb) window.__heap = e.data; }; });
const q = "?tel=1" + (process.env.Q ? "&" + process.env.Q : "");
await page.goto("http://localhost:5173/" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await snap("page_loaded");
await page.getByRole("button", { name: /Launch Blender/ }).click();
let up = false;
for (let i = 0; i < 200 && !up; i++) { await wait(3000); await snap("t+" + (i + 1) * 3 + "s"); up = !!(await page.evaluate(() => window.__BGUI__ || {})).window; }
await wait(secs * 1000); await snap("ui_up+" + secs + "s");
const targets = (await cdp.send("Target.getTargets")).targetInfos; const tc = {}; for (const t of targets) tc[t.type] = (tc[t.type] || 0) + 1;
const r = await page.evaluate(async () => {
  const M = window.Module || {}; const o = { perf: window.__heap || null, jsheap_mb: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null, coi: crossOriginIsolated };
  try { const u = await performance.measureUserAgentSpecificMemory(); o.uasm_mb = u.bytes / 1048576; const by = {}; for (const b of u.breakdown) { const k = (b.types || []).join("+") + "|" + ((b.attribution || []).map(a => a.scope).join(",") || "-"); by[k] = (by[k] || 0) + b.bytes / 1048576; } o.uasm = by; } catch (e) { o.uasm_err = String(e).slice(0, 120); }
  return o; });
console.log("ROZKLAD " + JSON.stringify({ targets: tc, ...r }));
await browser.close();
