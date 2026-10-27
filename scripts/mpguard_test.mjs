// H7c: s MPIFRAME=1 běží demo v cross-origin iframe (jako itch.io) s Mac UA + dotykem BEZ query parametrů.
// H7: ochrana Material Preview. MPQ='?ipad=1' → po přepnutí na MATERIAL se vrátí SOLID + pruh #mp-note; MPQ='?ipad=1&mp=1' nebo '' → zůstane MATERIAL.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object; bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('Metal'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.25
b.inputs['Base Color'].default_value = (0.9, 0.35, 0.1, 1.0); ob.data.materials.append(m)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -1))
def shade(t):
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = t
    print('SHADE ' + t); sys.stdout.flush(); return None
def report():
    print('SHADING_NOW ' + ','.join(sp.shading.type for a in bpy.context.window_manager.windows[0].screen.areas if a.type=='VIEW_3D' for sp in a.spaces if sp.type=='VIEW_3D')); sys.stdout.flush(); return None
bpy.app.timers.register(lambda: shade('MATERIAL'), first_interval=10.0)
bpy.app.timers.register(report, first_interval=20.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let errors = 0;
let now = "";
page.on("console", (m) => { const t = m.text(); const mm = /SHADING_NOW (\S+)/.exec(t); if (mm) now = mm[1]; if (/RuntimeError|abort\(|unreachable|memory access|tint-ICE|shaderc FAIL/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
const IFR = process.env.MPIFRAME === "1";
if (IFR) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "maxTouchPoints", { get: () => 5 });
    Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Safari/605.1.15" });
  });
  const http = await import("node:http");
  const srv = http.createServer((q, r) => { r.writeHead(200, { "content-type": "text/html", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" });
    r.end('<iframe src="http://localhost:5173/" style="width:1400px;height:840px;border:0" allow="cross-origin-isolated; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"></iframe>'); }).listen(5199, "127.0.0.1");
  await page.goto("http://127.0.0.1:5199/", { waitUntil: "domcontentloaded" });
} else {
  await page.goto("http://localhost:5173/" + ((process.argv[2] || "").replace(/"/g, "")), { waitUntil: "load" });
}
const F = () => (IFR ? page.frames().find((f) => f !== page.mainFrame()) : page);
if (IFR) await wait0(3000);
function wait0(ms) { return new Promise(r => setTimeout(r, ms)); }
await F().locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await F().getByRole("button", { name: /Launch Blender/ }).click().catch(async (e) => { await page.screenshot({ path: "out/mpguard_fail.png" }); throw e; });
for (let i = 0; i < 300; i++) { if ((await F().evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const box = await F().locator("#canvas").boundingBox();
await page.mouse.move(box.x + 570, box.y + 395); await page.keyboard.press("Home"); await wait(1500);
await wait(16000);
const note = await F().evaluate(() => { const n = document.getElementById("mp-note"); return !!n; });
await page.screenshot({ path: "out/mpguard_" + (process.env.MPTAG || "x") + ".png" });
console.log("MPGUARD shading=" + now + " note=" + note + " expect_blocked=" + process.env.MPEXPECT);
const ok = process.env.MPEXPECT === "1" ? (now === "SOLID" && note) : (now === "MATERIAL" && !note);
console.log((ok ? "PASS" : "FAIL") + " mpguard " + process.argv[2]);
await browser.close();
