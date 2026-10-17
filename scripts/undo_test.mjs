// Undo/redo klávesami: Tab, A, E (extrude), Enter, Ctrl+Z, Ctrl+Shift+Z. Python timer vypisuje počty vrcholů.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, bmesh, sys
def probe():
    ob = bpy.context.view_layer.objects.active
    if ob and ob.type == 'MESH':
        n = len(bmesh.from_edit_mesh(ob.data).verts) if ob.mode == 'EDIT' else len(ob.data.vertices)
        print('UNDO_PROBE mode=%s verts=%d' % (ob.mode, n)); sys.stdout.flush()
    return 0.5
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = "";
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("UNDO_PROBE"); if (i >= 0) last = t.slice(i + 11); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000);
await page.keyboard.press("Escape"); await wait(1000);
const box = await page.locator("#canvas").boundingBox();
await page.mouse.move(box.x + 500, box.y + 400); await wait(500);
const log = [];
const snap = async (label) => { await wait(1500); log.push(`${label}: ${last}`); console.log(`${label}: ${last}`); };
await snap("start");
await page.keyboard.press("Tab"); await snap("edit mode");
await page.keyboard.press("a"); await wait(500);
await page.keyboard.press("e"); await wait(500); await page.mouse.move(box.x + 560, box.y + 380, { steps: 5 }); await page.keyboard.press("Enter"); await snap("after extrude");
await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control"); await snap("after ctrl+z");
await page.keyboard.down("Control"); await page.keyboard.down("Shift"); await page.keyboard.press("z"); await page.keyboard.up("Shift"); await page.keyboard.up("Control"); await snap("after ctrl+shift+z");
const v = (s) => Number((s.match(/verts=(\d+)/) || [])[1]);
const [s0, s1, s2, s3, s4] = log.map(v);
const ok = s1 === 8 && s2 > 8 && s3 === 8 && s4 === s2;
console.log(ok ? "PASS: undo/redo vrací počty (8 -> %d -> 8 -> %d)".replace("%d", s2).replace("%d", s4) : `FAIL: ${[s0, s1, s2, s3, s4]}`);
await browser.close();
