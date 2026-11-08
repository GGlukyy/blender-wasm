// B3l: živé textury (tlive) po krocích: start, MP, Solid, MP+Rendered, Wireframe. Kdo drží atlas sond / stínové textury.
const { chromium } = await import(process.env.PW || "playwright");
const q = process.env.Q || "webkit_sim=1&ipad=1&pool=4";
const expr = `import bpy
seq = [(6, 'MATERIAL'), (16, 'SOLID'), (26, 'RENDERED'), (36, 'WIREFRAME'), (46, 'MATERIAL')]
def mk(t):
    def f():
        for a in bpy.context.window.screen.areas:
            if a.type == 'VIEW_3D': a.spaces[0].shading.type = t
        print('PB shade ' + t, flush=True); return None
    return f
for s, t in seq: bpy.app.timers.register(mk(t), first_interval=float(s), persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let t0 = 0;
page.on("console", (m) => { const t = m.text(); if (/^PB /.test(t)) console.log(((Date.now() - t0) / 1000).toFixed(0) + "s " + t); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?tel=1&perf=1&" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
t0 = Date.now();
for (let i = 0; i < 12; i++) {
  await new Promise(r => setTimeout(r, 5000));
  const g = await page.evaluate(() => window.__GPUMEM__ || {});
  const tl = Object.entries(g.tlive || {}).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => v + ":" + k).join(" ");
  console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s tex_mb=${g.tex_mb} n=${g.tex} ${tl}`);
}
await browser.close();
