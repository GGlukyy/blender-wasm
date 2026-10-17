// Výkonový panel: boot s ?perf=1, orbit myší (MMB), přečti window.__PERF__ + screenshot panelu.
//   scripts/perf_panel_win.sh
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const texlog = [];
if (process.env.TEXLOG) { await page.addInitScript(() => { window.__CAPENV = { WGPU_LOG_TEXCREATE: "1" }; }); page.on("console", (m) => { const t = m.text(); const i = t.indexOf("WGPU_TEXCREATE"); if (i >= 0) texlog.push(t.slice(i)); }); }
const POOL = (process.env.POOL || "").replace(/%.*/, "");
const PYX = (process.env.PYX || '').replace(/%.*/, '');
const SH = (process.env.SHADING || "").replace(/%.*/, "");
if (SH) await page.addInitScript(([m, pool, PYX]) => { window.__BARGS = ["--python-expr", `import bpy
${pool ? "bpy.context.scene.eevee.shadow_pool_size = '" + pool + "'" : ''}
${PYX}
def f():
    for a in bpy.context.window.screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = '${m}'
    return None
bpy.app.timers.register(f, first_interval=4.0)`]; }, [SH, POOL, PYX]);
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(SH ? 30000 : 6000);
await page.keyboard.press("Escape"); await wait(1500);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 600, y: box.y + 400 };
await page.mouse.move(c.x, c.y);
await page.mouse.down({ button: "middle" });
for (let i = 0; i < 120; i++) { await page.mouse.move(c.x + 100 * Math.sin(i / 10), c.y + 40 * Math.cos(i / 10)); await wait(16); }
await page.mouse.up({ button: "middle" });
await wait(1500);
const perf = await page.evaluate(() => window.__PERF__ || null);
const text = await page.evaluate(() => [...document.querySelectorAll("div")].map(d => d.textContent).find(t => t && t.includes("FPS")) || "");
await page.screenshot({ path: SH ? `out/perf_panel_${SH}.png` : "out/perf_panel.png" });
// nepřerušovaný redraw bez vstupních událostí: přehrávání animace (mezerník) -> dt = skutečná cena snímku
await page.keyboard.press("Space"); await wait(4000);
const play = await page.evaluate(() => window.__PERF__ || null);
await page.keyboard.press("Space"); await wait(500);
console.log("PLAY " + JSON.stringify(play));
// klid: bez vstupu a bez přehrávání by se neměly kreslit žádné snímky
const f0 = (await page.evaluate(() => window.__PERF__ || {})).frame || 0;
await wait(4000);
const f1 = (await page.evaluate(() => window.__PERF__ || {})).frame || 0;
console.log(`IDLE frames in 4 s: ${f1 - f0}`);
console.log("PERF " + JSON.stringify(perf));
if (texlog.length) { const bpp = { 18: 4, 22: 4, 24: 8, 25: 16, 26: 4, 27: 4, 28: 4, 29: 4, 30: 4, 31: 8, 32: 8, 33: 16, 34: 16, 35: 4 }; const rows = texlog.map(l => { const m = l.match(/'(.*)' (\d+)x(\d+)x(\d+) fmt=(\d+) usage=0x[0-9a-f]+ mips=(\d+)/); return m ? { name: m[1], w: +m[2], h: +m[3], d: +m[4], fmt: +m[5], mips: +m[6] } : null; }).filter(Boolean); rows.forEach(r => r.mb = r.w * r.h * r.d * (bpp[r.fmt] || 4) * (r.mips > 1 ? 1.33 : 1) / 1048576); rows.sort((a, b) => b.mb - a.mb); console.log("TEXTOP " + rows.length + " created"); rows.slice(0, Number(process.env.TOPN) || 12).forEach(r => console.log(`TEXTOP ${r.mb.toFixed(1)} MB ${r.name} ${r.w}x${r.h}x${r.d} fmt=${r.fmt} mips=${r.mips}`)); }
console.log(perf && text.includes("FPS") ? "PASS: panel zobrazuje FPS" : "FAIL: panel bez dat");
await browser.close();
