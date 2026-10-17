// Checklist 22: materiál s červenou barvou je vidět ve viewportu v Material Preview i Rendered (EEVEE) → červené pixely.
import { mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, sys
ob = bpy.context.view_layer.objects.active
m = bpy.data.materials.new('Red'); m.use_nodes = True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (1, 0, 0, 1)
ob.data.materials.clear(); ob.data.materials.append(m)
def shade(mode):
    def f():
        for a in bpy.context.window.screen.areas:
            if a.type == 'VIEW_3D': a.spaces[0].shading.type = mode
        print('MC shading', mode, [x.name for x in bpy.data.objects], [len(o.data.materials) for o in bpy.data.objects if o.type=='MESH'], [a.spaces[0].shading.type for a in bpy.context.window.screen.areas if a.type=='VIEW_3D']); sys.stdout.flush(); return None
    return f
bpy.app.timers.register(shade('SOLID'), first_interval=3.0)
bpy.app.timers.register(shade('MATERIAL'), first_interval=20.0)
bpy.app.timers.register(shade('RENDERED'), first_interval=50.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const seen = new Set();
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("MC shading "); if (i >= 0) { console.log(t.slice(i)); seen.add(t.slice(i + 11).trim().split(" ")[0]); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const until = async (m) => { for (let i = 0; i < 240 && !seen.has(m); i++) await wait(1000); await wait(m === "SOLID" ? 2500 : 12000); };
const red = async (name) => {
  const p = `out/matcolor_${name}.png`;
  await page.locator("#canvas").screenshot({ path: p });
  return await page.evaluate(async (path) => 0, p); };
// počítání červených pixelů přímo v prohlížeči z canvasu screenshotu
const countRed = async (name) => {
  const buf = await page.locator("#canvas").screenshot({ path: `out/matcolor_${name}.png` });
  return await page.evaluate(async (b64) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] > 120 && d[i] > d[i + 1] * 1.8 && d[i] > d[i + 2] * 1.8) n++;
    return n; }, buf.toString("base64"));
};
await until("SOLID"); await page.keyboard.press("Escape"); await wait(800); await page.mouse.move(700, 500); const rs = await countRed("solid");
await until("MATERIAL"); const rm = await countRed("material");
await until("RENDERED"); const rr = await countRed("rendered");
console.log(`MATCOLOR red px: solid=${rs} material=${rm} rendered=${rr}`);
const ok = rm > 5 * rs && rr > 5 * rs;  // solid = jen oranžový obrys + červená osa X
console.log(ok ? "PASS: matcolor" : "FAIL: matcolor");
await browser.close();
