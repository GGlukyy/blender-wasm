// H8-0 sculpt+paměť: 2 min tahů, každých 10 s řádek SMEM heap_used/tex_mb/buf_mb/bg_new. Původně: Sculpt: ico sphere, SCULPT mode, tah myší přes kouli -> geometrie se musí změnit (max poloměr / součet z).
const { chromium } = await import(process.env.PW || "playwright");
const SUB = Number((process.env.ICO || "").replace(/%.*/, "")) || 5;
const expr = `import bpy, sys, math
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=${SUB}, radius=1.0)
def probe():
    ob = bpy.context.view_layer.objects.active
    if ob and ob.type == 'MESH':
        vs = ob.data.vertices
        r = max(v.co.length for v in vs); sz = sum(v.co.z for v in vs)
        print('SPROBE mode=%s verts=%d maxr=%.4f sumz=%.3f' % (ob.mode, len(vs), r, sz)); sys.stdout.flush()
    return 0.5 if len(bpy.context.view_layer.objects.active.data.vertices) < 50000 else 3.0
bpy.app.timers.register(probe, first_interval=5.0)
def to_sculpt():
    bpy.ops.object.mode_set(mode='SCULPT'); return None
bpy.app.timers.register(to_sculpt, first_interval=12.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = "", errors = 0;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("SPROBE"); if (i >= 0) last = t.slice(i + 7); else if (/WGPU_BGWHY2/.test(t)) { console.log("BGW2 " + t.slice(0, 160)); } else if (/WGPU_BGWHY/.test(t)) { console.log("BGW " + t.slice(0, 120)); } else if (/WGPU_FREEDBG|^\s+ctx 0x/.test(t)) { if (process.env.FREEDBG) console.log("FD " + t.slice(0, 160)); } else if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((w) => { window.__BGWHY = w; }, !!process.env.BGWHY);
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; if (window.__BGWHY) window.__CAPENV = { WGPU_BG_WHY: "1" }; }, expr);
await page.goto("http://localhost:5173/?perf=1&tel=1" + (process.env.QS || ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 570, y: box.y + 395 };
await page.mouse.move(c.x, c.y); await page.keyboard.press("Home"); await wait(1500);
for (let i = 0; i < 20 && !last.includes("mode=SCULPT"); i++) await wait(1000);
const DUR = (Number(process.env.DUR) || 120) * 1000, t0 = Date.now(); let k = 0, lastRow = 0, maxUsed = 0; const rows = [];
while (Date.now() - t0 < DUR) {
  const yy = ((k++ % 7) - 3) * 18;
  await page.mouse.move(c.x - 70, c.y + yy); await page.mouse.down();
  await page.mouse.move(c.x + 70, c.y + yy, { steps: 20 }); await page.mouse.up();
  if (Date.now() - lastRow > 10000) {
    lastRow = Date.now();
    const [p, g] = await page.evaluate(() => [window.__PERF__ || {}, window.__GPUMEM__ || {}]);
    maxUsed = Math.max(maxUsed, p.heap_used_mb || 0);
    const row = `SMEM t=${Math.round((Date.now() - t0) / 1000)}s heap_res=${Math.round(p.heap_mb)} heap_used=${Math.round(p.heap_used_mb)} tex_mb=${g.tex_mb} buf_mb=${g.buf_mb} buf_new=${g.buf_new} bg_new=${g.bg_new} tex_new=${g.tex_new}`;
    console.log(row); rows.push(row);
  }
}
const g2 = await page.evaluate(() => window.__GPUMEM__ || {});
console.log("GHIST " + JSON.stringify({buf:g2.buf,destroyed:g2.buf_destroyed,gc:g2.buf_gc,hist:g2.hist,hbytes:g2.hbytes}).slice(0, 900));
console.log("THIST " + JSON.stringify(Object.fromEntries(Object.entries(g2.thist || {}).sort((a, b) => b[1] - a[1]).slice(0, 8))));
console.log(rows.length >= 3 && errors === 0 && maxUsed > 0 ? `PASS: sculpt+paměť, max heap_used=${Math.round(maxUsed)} MB` : `FAIL: rows=${rows.length} errors=${errors} maxUsed=${maxUsed}`);
await page.screenshot({ path: "out/sculptmem.png" });
await browser.close();
