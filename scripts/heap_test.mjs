// Únik wasm heapu: 14× vytvořit/smazat ico sphere 655k + subsurf; heap_mb z ?perf=1 se nesmí zvětšovat. node heap_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, sys
st = {'i': 0}
def go():
    st['i'] += 1
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=8)
    bpy.ops.object.shade_smooth()
    bpy.ops.outliner.orphans_purge(do_recursive=True)
    print('HV', st['i']); sys.stdout.flush()
    return 3.0 if st['i'] < 14 else None
bpy.app.timers.register(go, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("TL "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/).map(Number); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
let hv = 0; page.on("console", (m) => { const t = m.text(); if (t.includes("HV ")) hv++; else if (/Traceback|Error|error:/.test(t) && !/WGPU/.test(t)) console.log("LOG", t.slice(0, 200)); });
const heap = async () => { await page.mouse.move(600, 450); await page.mouse.move(612, 456); await wait(1500); const p = await page.evaluate(() => window.__PERF__ || {}); return p.heap_mb; };
const samples = [];
for (let i = 0; i < 80 && hv < 14 && i < 79; i++) { await wait(3000); if (i % 5 === 0) { const h = await heap(); samples.push([hv, h]); console.log(`HEAP iter=${hv} heap_mb=${h}`); } }
const h0 = samples.find(s => s[0] >= 3)?.[1], h1 = samples[samples.length - 1][1];
console.log(`HEAP done iter=${hv} start=${h0} end=${h1}`);
console.log(errs === 0 && hv >= 13 && h1 <= (h0 || 0) * 1.5 ? "PASS: heap" : "FAIL: heap");
await browser.close();
