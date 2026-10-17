// Node editory: Shading (shader editor) a Geometry Nodes workspace, vizuálně. node nodes_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, bmesh, sys
def _t():
    try:
        ob = bpy.context.view_layer.objects.active
        info = (ob.mode, len(ob.data.uv_layers))
        s = 0.0; mn = 9.0; mx = -9.0
        if ob.mode == 'EDIT' and ob.data.uv_layers:
            bm = bmesh.from_edit_mesh(ob.data); l = bm.loops.layers.uv.active
            us = [lp[l].uv for f in bm.faces for lp in f.loops]
            mn = min(min(u.x, u.y) for u in us); mx = max(max(u.x, u.y) for u in us)
        print('UK', ob.mode, len(ob.data.uv_layers), round(mn, 3), round(mx, 3)); sys.stdout.flush()
    except Exception as e: print('UK ERR', e); sys.stdout.flush()
    return 0.7
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null; let errs = 0;
page.on('pageerror', (e) => { errs++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("UK "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 450); await wait(300);
for (const [name, x] of [["shading", 655], ["geonodes", 983]]) {
  await page.mouse.click(x, 13); await wait(9000);
  await page.mouse.move(600, 450); await wait(1000);
  await page.locator("#canvas").screenshot({ path: `out/nodes_${name}.png` });
}
await wait(1000);
console.log("errors", errs);
console.log(errs === 0 ? "PASS: nodes alive (zkontroluj snímky)" : "FAIL: nodes");
await browser.close();
