// Checklist 21: Tab → A → U → Smart UV Project přes skutečné klávesy/menu → UV mapa vznikne a pokrývá <0,1>. node uikey_test.mjs
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
let last = null;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("UK "); if (i >= 0) last = t.slice(i + 3).trim().split(/\s+/); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 450); await wait(300);
await page.keyboard.press("Tab"); await wait(600); await page.keyboard.press("a"); await wait(400);
await page.keyboard.press("u"); await wait(700);
await page.locator("#canvas").screenshot({ path: "out/uikey_1_menu.png" });
await page.keyboard.press("s"); await wait(1200);   // Smart UV Project (podtržené S)
await page.locator("#canvas").screenshot({ path: "out/uikey_2_dialog.png" });
await page.keyboard.press("Enter"); await wait(2500);
await page.locator("#canvas").screenshot({ path: "out/uikey_3_done.png" });
await wait(1500);
console.log("UK final", last && last.join(" "));
const ok = last && last[0] === "EDIT" && +last[1] >= 1 && +last[2] >= -0.001 && +last[3] <= 1.001 && +last[3] > 0.5;
console.log(ok ? "PASS: uikey smart uv" : "FAIL: uikey smart uv");
await browser.close();
