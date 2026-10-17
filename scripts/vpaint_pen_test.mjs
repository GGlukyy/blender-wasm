// Vertex paint tah PENCILEM (CDP pointerType pen) na kostce → barevný atribut se změní. node vpaint_pen_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, bmesh, sys
st = {'n': 0}
def _t():
    try:
        ob = bpy.context.view_layer.objects.active
        st['n'] += 1
        if st['n'] == 1:
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=6); bpy.ops.object.mode_set(mode='OBJECT')
            bpy.ops.object.mode_set(mode='VERTEX_PAINT')
            bpy.context.tool_settings.vertex_paint.unified_paint_settings.use_unified_color = True
            bpy.context.tool_settings.vertex_paint.unified_paint_settings.color = (1, 0, 0)
            bpy.context.tool_settings.vertex_paint.unified_paint_settings.size = 80
        if st['n'] == 14:
            bpy.ops.object.mode_set(mode='OBJECT')
        ca = ob.data.color_attributes
        if len(ca):
            a = ca.active_color or ca[0]
            import array
            d = [0.0] * (len(a.data) * 4); a.data.foreach_get('color', d)
            red = sum(1 for i in range(0, len(d), 4) if d[i] > 0.5 and d[i+1] < 0.5)
            print('VPC', ob.mode, len(ca), len(a.data), red, 'min', min(d), 'max', max(d), 'sum', sum(d))
        else:
            print('VPC', ob.mode, 0, 0, 0)
        sys.stdout.flush()
    except Exception as e: print('VPC ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } }); const page = await ctx.newPage();
let last = null;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("VPC "); if (i >= 0) { last = t.slice(i + 4).trim().split(/\s+/); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(14000);
await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 576, y: box.y + 396 };
console.log("BEFORE", last && last.join(" "));
const cdp = await ctx.newCDPSession(page);
const pen = (type, x, y, buttons) => cdp.send("Input.dispatchMouseEvent", { type, x, y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, pointerType: "pen", clickCount: type === "mouseMoved" ? 0 : 1, force: 0.6 });
await pen("mouseMoved", c.x - 50, c.y, 0); await pen("mousePressed", c.x - 50, c.y, 1);
for (let i = 0; i <= 20; i++) { await pen("mouseMoved", c.x - 50 + i * 5, c.y + 10 * Math.sin(i / 3), 1); await wait(30); }
await pen("mouseReleased", c.x + 50, c.y, 0); await wait(2500);
console.log("AFTER", last && last.join(" "));
await page.locator("#canvas").screenshot({ path: "out/vpaint_pen.png" });
await wait(12000); console.log("AFTER_EXIT", last && last.join(" "));
const red = last ? +last[3] : 0;
console.log(red > 20 ? "PASS: vertex paint Pencilem zbarvil " + red + " bodů" : "FAIL: red=" + red);
await browser.close();
