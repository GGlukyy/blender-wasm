// Každý typ editoru v hlavní oblasti: nesmí spadnout ani hlásit GPU chyby. node editors_test.mjs
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out/edt", { recursive: true });
const expr = `import bpy, sys
def P(*a):
    print(*a); sys.stdout.flush()
TYPES = ['IMAGE_EDITOR','UV','SEQUENCE_EDITOR','NODE_EDITOR','TEXT_EDITOR','SPREADSHEET','OUTLINER','FILE_BROWSER','ASSET_SHELF' if False else 'INFO','CLIP_EDITOR','DOPESHEET_EDITOR','GRAPH_EDITOR','NLA_EDITOR','CONSOLE','PROPERTIES','PREFERENCES','DRIVERS' if False else 'VIEW_3D']
st = {'i': -1}
def area():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type not in ('PROPERTIES', 'OUTLINER', 'TIMELINE') or st['i'] < 0:
            if a.width > 600: return a
    return bpy.context.window_manager.windows[0].screen.areas[0]
def tick():
    if st['i'] >= len(TYPES):
        P('OVL_DONE'); return None
    if st['i'] >= 0:
        t = TYPES[st['i']]
        try:
            a = area()
            if t == 'UV': a.type = 'IMAGE_EDITOR'; a.ui_type = 'UV'
            elif t == 'DRIVERS': a.type = 'GRAPH_EDITOR'; a.ui_type = 'DRIVERS'
            else: a.type = t
            if t == 'NODE_EDITOR':
                for ui in ('ShaderNodeTree', 'CompositorNodeTree', 'GeometryNodeTree', 'TextureNodeTree'):
                    try: a.ui_type = ui; P('OVLNODE', ui)
                    except Exception as e: P('OVLERR', ui, str(e)[:80])
            P('OVLSET', st['i'], t, 'ok')
        except Exception as e:
            P('OVLERR', st['i'], t, str(e)[:100])
    st['i'] += 1
    return 3.0
bpy.app.timers.register(tick, first_interval=10.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const BAD = /ABORT|GPUValidationError|Invalid CommandBuffer|RuntimeError|unreachable|WGPU_FATAL|Aborted/;
let logs = [], errs = 0, done = false; const marks = []; let tb = 0, tbl = [];
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); if (tb > 0) { tbl.push(t); tb--; if (tb === 0 && !tbl.some((x) => /bl_pkg|addon_utils/.test(x))) logs.push("Traceback: " + tbl.slice(0, 3).join(" | ").slice(0, 200)); } if (/Traceback/.test(t)) { tb = 8; tbl = []; } if (BAD.test(t) && !/_multiprocessing|bl_pkg|addon_utils|\\^\\^|~~~/.test(t)) logs.push(t.slice(0, 160));
  const i = t.indexOf("OVLSET"); if (i >= 0) marks.push(t.slice(i + 7).trim());
  if (t.includes("OVLERR")) console.log(t.slice(t.indexOf("OVLERR")));
  if (t.includes("OVL_DONE")) done = true; });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(3000); await page.keyboard.press("Escape"); await page.mouse.move(700, 450);
const region = { x: 150, y: 100, width: 800, height: 560 };
const hashOf = async (buf) => page.evaluate(async (b64) => { const im = new Image(); im.src = "data:image/png;base64," + b64; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0, nz = 0; for (let i = 0; i < d.length; i += 4) { s = (s * 31 + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) >>> 0; if (d[i] + d[i + 1] + d[i + 2] > 60) nz++; } return { s, nz }; }, buf.toString("base64"));
const shot = async (n) => { const b = await page.locator("#canvas").screenshot({ clip: region }).catch(() => page.screenshot({ clip: region })); const h = await hashOf(b); return { h, b }; };
let seen = 0, prev = (await shot("base")).h, results = [], blank = 0;
const t0 = Date.now();
while (!done && Date.now() - t0 < 600000) {
  if (marks.length > seen) {
    const m = marks[seen++]; await wait(1200);
    const { h, b } = await shot(m);
    const changed = h.s !== prev.s; prev = h;
    if (h.nz < 50) blank++;
    results.push({ m, changed, nz: h.nz });
    console.log("EDT", changed ? "changed" : "SAME   ", String(h.nz).padStart(6), m);
    if (/./.test(m)) { const fs = await import("node:fs"); fs.writeFileSync(`out/edt/${seen}_${m.replace(/\W+/g, "_")}.png`, b); }
  } else await wait(300);
}
console.log("bad logs:", logs.length, logs.slice(0, 5)); console.log("blank frames:", blank, "errors", errs);
console.log(done && logs.length === 0 && errs === 0 && blank === 0 ? "PASS: editors" : "FAIL: editors");
await browser.close();
