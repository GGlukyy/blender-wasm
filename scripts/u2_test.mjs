// U2: credit v Blenderu místo plovoucího odznaku. Stavová lišta, Help menu, odkazy, nic nepřekrývá canvas.
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, "");
const expr = `import bpy, sys, json, os
_pr = lambda v: (print('U2R ' + json.dumps(v)), sys.stdout.flush())
def _tick():
    if os.path.exists('/tmp/u2_cmd'):
        s = open('/tmp/u2_cmd').read(); os.remove('/tmp/u2_cmd')
        try: _pr(eval(s, globals()))
        except Exception as e: _pr({'err': repr(e)})
    return 0.05
def _reg(t):
    w = bpy.context.window_manager.windows[0]
    for a in w.screen.areas:
        if a.type == t: r = [r for r in a.regions if r.type == 'HEADER' or r.type == 'WINDOW'][0]; return [r.x, w.height - r.y - r.height, r.width, r.height]
bpy.app.timers.register(_tick, first_interval=0.5, persistent=True); print('U2READY'); sys.stdout.flush()`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let reply = null, ready = false, errors = 0, fail = 0;
const check = (ok, msg) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${msg}`); };
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("U2R ")) >= 0) reply = JSON.parse(t.slice(i + 4));
  if (t.includes("U2READY")) ready = true;
  if (/Traceback|RuntimeError|abort\(|unreachable|memory access/i.test(t) && !/bl_pkg/.test(t)) { errors++; console.log("ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
const py = async (c) => { reply = null; await page.evaluate((c) => { try { Module.FS.unlink("/tmp/u2_cmd"); } catch {} Module.FS.writeFile("/tmp/u2_cmd", c); }, c); for (let i = 0; i < 200 && reply === null; i++) await wait(50); return reply; };
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; window.open = () => null; }, expr);
await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
check(await page.locator(".credit-badge").count() === 0, "plovoucí odznak není ani na úvodní stránce");
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300 && !ready; i++) await wait(1000);
await wait(6000); await page.keyboard.press("Escape"); await wait(800);
check(await page.locator(".credit-badge").count() === 0, "odznak není ani nad běžícím Blenderem");
const box = await page.locator("#canvas").boundingBox();
await page.screenshot({ path: "out/u2_status.png", clip: { x: box.x + box.width - 500, y: box.y + box.height - 30, width: 500, height: 30 } });
/* stavová lišta: tlačítko je úplně vpravo */
await page.mouse.move(box.x + box.width - 60, box.y + box.height - 10, { steps: 4 }); await wait(500);
await page.evaluate(() => { window.__LAST_OPEN_URL__ = ""; });
await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(1200);
let u = await page.evaluate(() => window.__LAST_OPEN_URL__);
check(u === "https://github.com/GGlukyy/blender-wasm", `klik ve stavové liště otevře ${u}`);
/* Help menu: skutečný klik, obsah = screenshot; každý odkaz přes operátor */
const links = (await py("[list(x) for f in bpy.types.TOPBAR_MT_help._dyn_ui_initialize() if f.__name__ == '_web_help' for x in f.__globals__['_WEB_LINKS']]")) ?? [];
check(links.length === 5, `Help má ${links.length} odkazů`);
for (const [t, url] of links) {
  await page.evaluate(() => { window.__LAST_OPEN_URL__ = ""; });
  await py(`bpy.ops.wm.url_open(url='${url}') and 1`); await wait(400);
  u = await page.evaluate(() => window.__LAST_OPEN_URL__); check(u === url, `${t} -> ${u}`);
}
const X = process.env.HELPX ? +process.env.HELPX : 222;
await page.mouse.move(box.x + X, box.y + 12, { steps: 3 }); await wait(400); await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(1200);
await page.screenshot({ path: "out/u2_help.png" });
await page.evaluate(() => { window.__LAST_OPEN_URL__ = ""; });
await page.mouse.move(box.x + 275, box.y + 230, { steps: 3 }); await wait(500); await page.mouse.down(); await wait(80); await page.mouse.up(); await wait(1200);
u = await page.evaluate(() => window.__LAST_OPEN_URL__); check(u === links[2][1], `skutečný klik v Help na itch.io otevře ${u}`);
console.log(`RESULT fail=${fail} errors=${errors}`);
await browser.close(); process.exit(fail || errors ? 1 : 0);
