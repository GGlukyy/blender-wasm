// Vertex paint tah myší na kostce (subdivided) → barevný atribut se změní. node vpaint_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    ob = bpy.context.view_layer.objects.active
    print('VPC', 'alive', st['n'], len(ob.material_slots) if ob else -1, 0, 'min', 0, 'max', 0, 'sum', 0); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null;
let dbg = true; page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0,300))); page.on("crash", () => console.log("PAGECRASH"));
page.on("console", (m) => { const t = m.text(); if (dbg && !/WGPU|VPC|PASSLOG/.test(t)) console.log("DBG", t.slice(0, 220)); const i = t.indexOf("VPC "); if (i >= 0) { if (/ERR|SAVED/.test(t)) console.log("RAW", t.slice(0, 300)); last = t.slice(i + 4).trim().split(/\s+/); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
const exported = new Map();
if (process.env.SEEDOUT) await page.addInitScript(() => { window.__CAPENV = { WGPU_WGSL_EXPORT: "1" }; });
page.on("console", (m) => { const t = m.text(); if (t.startsWith("WGSL_EXPORT ")) { const [k, v] = JSON.parse(t.slice(12)); exported.set(k, v); } });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(14000);
dbg = true; await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 576, y: box.y + 396 };
await page.keyboard.press("Escape"); await wait(500);
console.log("BEFORE", last && last.join(" "));
// záložka Material v Properties (ikona dole v sloupci záložek)
const t0 = Date.now(); const n0 = last ? +last[1] : 0;
await page.mouse.click(box.x + 1167, box.y + 610);
let miss = 0; page.on("console", m => { if (m.text().includes("WGSL_MISS")) miss++; });
let resumed = 0;
for (let i = 0; i < 240; i++) { await wait(500); const n = last ? +last[1] : 0; if (n > n0 + 2 && i > 4) { resumed = Date.now() - t0; break; } }
console.log(`BLOCK_MS ${resumed || "NEVER"} WGSL_MISS ${miss}`);
await page.screenshot({ path: "out/mattab.png" });
console.log(resumed && resumed < 4500 ? "PASS: Material záložka neblokuje" : "FAIL: Material záložka blokuje UI " + resumed + " ms (překlad shaderů mimo seed)");
if (process.env.SEEDOUT) { const { writeFileSync } = await import("node:fs"); writeFileSync("out/mattab_seed.json", JSON.stringify([...exported.entries()])); console.log("EXPORTED " + exported.size); }
await browser.close();
