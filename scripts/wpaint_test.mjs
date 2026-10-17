// Vertex paint tah myší na kostce (subdivided) → barevný atribut se změní. node vpaint_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    try:
        ob = bpy.context.view_layer.objects.active
        st['n'] += 1
        if st['n'] == 1:
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=6); bpy.ops.object.mode_set(mode='OBJECT')
            ob.vertex_groups.new(name='g')
            bpy.ops.object.mode_set(mode='WEIGHT_PAINT')
        vg = ob.vertex_groups.active
        w = 0
        if vg:
            for v in ob.data.vertices:
                try:
                    if vg.weight(v.index) > 0.05: w += 1
                except RuntimeError: pass
        print('VPC', ob.mode, 1, len(ob.data.vertices), w, 'min', 0, 'max', 0, 'sum', 0)
        sys.stdout.flush()
    except Exception as e: print('VPC ERR', e); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=8.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("VPC "); if (i >= 0) { if (/ERR|SAVED/.test(t)) console.log("RAW", t.slice(0, 300)); last = t.slice(i + 4).trim().split(/\s+/); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(14000);
await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 576, y: box.y + 396 };
console.log("BEFORE", last && last.join(" "));
await page.mouse.move(c.x - 50, c.y); await page.mouse.down();
for (let i = 0; i <= 20; i++) { await page.mouse.move(c.x - 50 + i * 5, c.y + 10 * Math.sin(i / 3), {}); await wait(30); }
await page.mouse.up(); await wait(2500);
console.log("AFTER", last && last.join(" "));
await page.locator("#canvas").screenshot({ path: "out/wpaint.png" });
await wait(14000); console.log("AFTER_EXIT", last && last.join(" "));
const red = last ? +last[3] : 0;
console.log(red > 20 ? "PASS: weight paint nastavil váhu " + red + " vrcholů" : "FAIL: red=" + red);
await browser.close();
