// H22a: s ?ipad=1 přepnutí na Material Preview dá Solid + Texture/Studio (MP Lite), ne šedý model. Screenshot out/mp_lite.png.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def go():
    w = bpy.context.window_manager.windows[0]
    ar = [a for a in w.screen.areas if a.type == 'VIEW_3D'][0]
    with bpy.context.temp_override(window=w, area=ar, region=[r for r in ar.regions if r.type == 'WINDOW'][0]):
        print('IMGOPEN', bpy.ops.image.open('INVOKE_DEFAULT')); sys.stdout.flush()
    return None
def dump():
    for w in bpy.context.window_manager.windows:
        for a in w.screen.areas:
            print('IMGOPEN area', a.type, [(sp.type, sp.active_operator.bl_idname if getattr(sp, 'active_operator', None) else None) for sp in a.spaces]); sys.stdout.flush()
    print('IMGOPEN timers', bpy.app.timers.is_registered(_import_assist) if '_import_assist' in dir() else 'nodef'); sys.stdout.flush()
    return None
bpy.app.timers.register(go, first_interval=10.0)
bpy.app.timers.register(dump, first_interval=13.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0, lite = ""; const imp = [];
page.on("console", (m) => { const t = m.text(); if (t.startsWith("MPLITE")) lite = t; if (t.includes("IMPORT") || t.includes("IMGOPEN")) { imp.push(t); console.log("LOG " + t); }
  if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL|WGPU_RW_STORAGE_BAD/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?ipad=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(16000);
const bar = await page.evaluate(() => { const n = document.getElementById("import-bar"); return !!n && n.style.display !== "none"; });
await page.setInputFiles("#import-input", { name: "t.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
await wait(4000);
await page.screenshot({ path: "out/image_open.png" });
const ok = imp.some(t => t.includes("WEB_FILE_IMPORT image.open")) && bar && imp.some(t => t.includes("WEB_FILE_IMPORT_PICKED /uploads/"));
console.log((ok ? "PASS" : "FAIL") + " image_open bar=" + bar + " logs=" + imp.length);
await browser.close();
process.exit(ok ? 0 : 1);
