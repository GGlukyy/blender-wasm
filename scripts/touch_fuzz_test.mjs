// Dotykový fuzz: náhodné gesta (tap, tah, pinch, 2prstý pan, dlouhý stisk, přerušená gesta, touchCancel, lišta kláves).
// Pass = žádná chyba stránky / abort / ztráta GPU a Blender po všem odpoví (Python timer).
const { chromium } = await import(process.env.PW || "playwright");
const SEED = +(process.env.TF_SEED || 1), N = +(process.env.TF_N || 200);
let rs = SEED; const rnd = () => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a));
const expr = `import bpy, sys
n=[0]
def probe():
    n[0]+=1; a=bpy.context.view_layer.objects.active; print('TFPROBE %d %d %s' % (n[0], len(bpy.data.objects), a.mode if a else '-')); sys.stdout.flush(); return 1.0
bpy.app.timers.register(probe, first_interval=2.0)
def setmode():
    m = '${process.env.TF_MODE || ""}'
    if m:
        try: bpy.ops.object.mode_set(mode=m)
        except Exception as e: print('TFMODEERR', e)
    sh = '${process.env.TF_SHADING || ""}'
    if sh:
        for a in bpy.context.window_manager.windows[0].screen.areas:
            if a.type == 'VIEW_3D': a.spaces[0].shading.type = sh; print('TFSHADE ' + a.spaces[0].shading.type); sys.stdout.flush()
bpy.app.timers.register(setmode, first_interval=14.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
let probes = 0, bad = [], lastMode = '?';
page.on("pageerror", (e) => bad.push("pageerror " + String(e).slice(0, 200)));
page.on("console", (m) => { const t = m.text(); if (t.includes("TFSHADE")) console.log("shading=" + t.split("TFSHADE ").pop()); else if (t.includes("TFPROBE")) { probes++; lastMode = t.split(" ").pop(); } else if (/WEBGPU_LOST|abort\(|RuntimeError|memory access|Aborted/.test(t)) bad.push(t.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y, id = 0) => ({ x: box.x + x, y: box.y + y, id, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const X = () => ri(60, box.width - 60), Y = () => ri(80, box.height - 80);
const labels = ["Tab", "G", "R", "S", "A", "X", "Ctrl", "Shift", "Esc", "Enter", "Alt"];
const gestures = {
  async tap() { await touch("touchStart", [P(X(), Y())]); await wait(ri(20, 120)); await touch("touchEnd", []); },
  async drag() { let x = X(), y = Y(); await touch("touchStart", [P(x, y)]); for (let i = 0; i < ri(3, 25); i++) { x += ri(-30, 30); y += ri(-30, 30); await touch("touchMove", [P(Math.max(1, x), Math.max(1, y))]); await wait(8); } await touch("touchEnd", []); },
  async pinch() { const cx = X(), cy = Y(); let d = ri(30, 200); await touch("touchStart", [P(cx - d, cy, 1), P(cx + d, cy, 2)]); for (let i = 0; i < ri(3, 20); i++) { d = Math.max(5, d + ri(-15, 15)); await touch("touchMove", [P(cx - d, cy, 1), P(cx + d, cy, 2)]); await wait(8); } await touch("touchEnd", []); },
  async pan2() { let x = X(), y = Y(); await touch("touchStart", [P(x, y, 1), P(x + 50, y, 2)]); for (let i = 0; i < ri(3, 20); i++) { x += ri(-20, 20); y += ri(-20, 20); await touch("touchMove", [P(Math.max(1, x), Math.max(1, y), 1), P(Math.max(1, x) + 50, Math.max(1, y), 2)]); await wait(8); } await touch("touchEnd", []); },
  async longpress() { await touch("touchStart", [P(X(), Y())]); await wait(ri(400, 900)); await touch("touchEnd", []); },
  async cancel() { await touch("touchStart", [P(X(), Y())]); await touch("touchMove", [P(X(), Y())]); await touch("touchCancel", []); },
  async threefinger() { const x = X(), y = Y(); await touch("touchStart", [P(x, y, 1), P(x + 40, y, 2), P(x + 80, y, 3)]); await touch("touchMove", [P(x, y + 30, 1), P(x + 40, y + 30, 2), P(x + 80, y + 30, 3)]); await touch("touchEnd", []); },
  async bar() { const b = page.locator("#touchbar button", { hasText: new RegExp("^" + labels[ri(0, labels.length)] + "$") }); if (await b.count()) await b.first().click({ timeout: 1000 }).catch(() => {}); },
  async key() { await page.keyboard.press(["Home", "Tab", "a", "Escape", "Numpad1", "1", "3"][ri(0, 7)]); },
};
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
if (process.env.TF_EDIT) { await page.keyboard.press("Tab"); await wait(1000); await page.keyboard.press("3"); await wait(500); }
if (process.env.TF_PRE) for (const k of process.env.TF_PRE.split(",")) { await page.keyboard.press(k); await wait(900); }
await wait((process.env.TF_MODE || process.env.TF_SHADING) ? 14000 : 2500); console.log('start mode=' + lastMode);
const names = Object.keys(gestures);
for (let i = 0; i < N; i++) {
  const g = names[ri(0, names.length)];
  try { await gestures[g](); } catch (e) { bad.push(`gesto ${g}: ${String(e).slice(0, 120)}`); }
  if (bad.length) break;
  if (i % 20 == 0) await wait(300);
}
await page.keyboard.press("Escape"); await touch("touchEnd", []).catch(() => {}); await wait(500);
const p0 = probes; await wait(4000);
const alive = probes > p0;
await page.screenshot({ path: "out/touch_fuzz.png" });
console.log(`touch_fuzz seed=${SEED} gest=${N} errors=${bad.length} alive=${alive} mode=${lastMode}`); bad.slice(0, 5).forEach(b => console.log("BAD " + b));
console.log(bad.length === 0 && alive ? "PASS touch_fuzz" : "FAIL touch_fuzz");
await browser.close();
