// P0.3: EXR čtení + zápis s vypnutým OpenEXR poolem (iPad -t 4). Řádky EXRT.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise(r => setTimeout(r, ms)); let done = false;
page.on("console", (m) => { const t = m.text(); if (/EXRT/.test(t)) { console.log(t); if (/EXRT (done|ERR)/.test(t)) done = true; } });
const PY = `import bpy
def t():
    try:
        im = bpy.data.images.load('/assets/5.3/datafiles/studiolights/world/forest.exr'); px = list(im.pixels[:4]); w, h = im.size
        print('EXRT read %dx%d px0=%.3f,%.3f,%.3f' % (w, h, px[0], px[1], px[2]), flush=True)
        im.filepath_raw = '/tmp/p0.exr'; im.file_format = 'OPEN_EXR'; im.save()
        im2 = bpy.data.images.load('/tmp/p0.exr'); px2 = list(im2.pixels[:4])
        print('EXRT write+read %dx%d same=%s' % (im2.size[0], im2.size[1], all(abs(a - b) < 1e-3 for a, b in zip(px, px2))), flush=True)
        im3 = bpy.data.images.load('/tmp/p0.exr'); im3.reload(); print('EXRT reload %d' % len(im3.pixels), flush=True)
    except Exception as e: print('EXRT ERR', repr(e), flush=True)
    print('EXRT done', flush=True)
bpy.app.timers.register(t, first_interval=6.0)`;
await page.addInitScript((a) => { window.__BARGS = a; }, ["--python-expr", PY]);
await page.goto("http://localhost:5173/?tel=1" + (process.env.Q ? "&" + process.env.Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
const L = page.getByRole("button", { name: /Launch Blender/ });
for (let i = 0; i < 120 && !(await L.isEnabled().catch(() => false)); i++) await wait(1000);
await L.click(); for (let i = 0; i < 200 && !done; i++) await wait(1000);
console.log(done ? "EXRT RESULT finished" : "EXRT RESULT timeout"); await browser.close();
