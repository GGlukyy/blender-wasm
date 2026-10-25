// Varování před limitem paměti: velká operace zvedne haldu přes ?memwarn=N → objeví se pruh #mem-warn.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy
def _go():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=64)
    m = bpy.context.object.modifiers.new('S', 'SUBSURF'); m.levels = 3
    bpy.ops.object.modifier_apply(modifier='S'); print('MWDONE', len(bpy.context.object.data.vertices), flush=True)
bpy.app.timers.register(_go, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let done = false; page.on("console", m => { if (/MWDONE/.test(m.text())) { done = true; console.log(m.text().slice(0, 100)); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?tel=0&memwarn=900", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 200 && !done; i++) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 5000));
const r = await page.evaluate(() => ({ heap: window.__HEAP_MB__, txt: (document.getElementById("mem-warn") || {}).textContent || null, shown: (document.getElementById("mem-warn") || { style: {} }).style.display }));
console.log("memwarn", JSON.stringify(r));
console.log(r.txt && r.shown === "block" ? "PASS memwarn" : "FAIL memwarn");
await browser.close();
