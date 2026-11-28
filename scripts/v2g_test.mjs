// V2g: F12 do formátu, který web nezapíše (AVIF) → červená lišta #write-bad; PNG potom lištu neukáže. Řádky V2G.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise(r => setTimeout(r, ms)); const log = [];
page.on("console", (m) => { const t = m.text(); if (/V2G|deferred write/.test(t)) { log.push(t); console.log(t); } });
const PY = `import bpy, os
st = {'i': 0}
def t():
    sc = bpy.context.scene; sc.render.resolution_x = 64; sc.render.resolution_y = 48; sc.render.resolution_percentage = 100
    sc.render.engine = 'BLENDER_WORKBENCH'
    f = ['AVIF', 'PNG'][st['i']]; sc.render.image_settings.file_format = f; sc.render.filepath = '/tmp/v2g_' + f
    bpy.ops.render.render(write_still=True); print('V2G rendered', f, flush=True); st['i'] += 1
    return 20.0 if st['i'] < 2 else None
bpy.app.timers.register(t, first_interval=8.0)`;
await page.addInitScript((a) => { window.__BARGS = a; }, ["--python-expr", PY]);
await page.goto("http://localhost:5173/?tel=1" + (process.env.Q ? "&" + process.env.Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
const L = page.getByRole("button", { name: /Launch Blender/ });
for (let i = 0; i < 120 && !(await L.isEnabled().catch(() => false)); i++) await wait(1000);
await L.click();
for (let i = 0; i < 120 && !log.some(l => /V2G rendered AVIF/.test(l)); i++) await wait(1000);
await wait(6000); const bad = await page.evaluate(() => { const n = document.getElementById("write-bad"); return n ? n.textContent : null; });
console.log("V2G avif banner:", bad);
await page.evaluate(() => document.getElementById("write-bad")?.remove());
for (let i = 0; i < 60 && !log.some(l => /V2G rendered PNG/.test(l)); i++) await wait(1000);
await wait(6000); const bad2 = await page.evaluate(() => !!document.getElementById("write-bad"));
const pngOk = log.some(l => /v2g_PNG.*ok=1/.test(l));
console.log("V2G png banner:", bad2, "png ok:", pngOk);
console.log(bad && /AVIF/.test(bad) && !bad2 && pngOk ? "PASS v2g" : "FAIL v2g"); await browser.close();
