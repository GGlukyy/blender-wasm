// T2 (start): paměť procesů Chrome (renderer/GPU/browser) v čase. Arg1 = solid|mp|mpslow, Arg2 = sekundy (default 120).
// Výstup: řádky PM t=.. renderer_mb gpu_mb browser_mb utility_mb jsheap_mb ... a souhrn (první/poslední/max).
const { chromium } = await import(process.env.PW || "playwright");
const { execSync } = await import("node:child_process");
const mode = process.argv[2] || "solid", secs = +(process.argv[3] || 120);
const expr = `import bpy
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object; bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('Metal'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Metallic'].default_value = 1.0; b.inputs['Roughness'].default_value = 0.25
ob.data.materials.append(m)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -1))
def shade(t):
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = t
    return None
${mode.startsWith("solid") ? "" : "bpy.app.timers.register(lambda: shade('MATERIAL'), first_interval=10.0)"}`;
const slow = mode.startsWith("mpslow");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const cdp = await browser.newBrowserCDPSession();
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
const bp = mode.endsWith("bp") ? "&bp=1" : "";
const q = (mode.startsWith("solid") ? "?perf=1&tel=1" : `?perf=1&tel=1&mp=1${slow ? "&dpr=3&mppx=1" : ""}`) + bp;
let bpn = 0; page.on("console", (m) => { if (/WGPU_BP/.test(m.text())) { bpn++; if (bpn < 4) console.log("CONSOLE " + m.text()); } });

const wait = (ms) => new Promise(r => setTimeout(r, ms));
function ws(pids) {
  if (!pids.length) return {};
  const out = execSync(`powershell -NoProfile -Command "Get-Process -Id ${pids.join(",")} -ErrorAction SilentlyContinue | % { $_.Id.ToString() + ' ' + [int]($_.PrivateMemorySize64/1MB) }"`).toString();
  const r = {}; for (const l of out.split(/\r?\n/)) { const [id, priv] = l.trim().split(" "); if (id) r[id] = +priv; } return r;
}
const snap = async (label) => {
  const info = (await cdp.send("SystemInfo.getProcessInfo")).processInfo; const m = ws(info.map(p => p.id));
  const sum = {}; for (const p of info) if (m[p.id] != null) sum[p.type] = (sum[p.type] || 0) + m[p.id];
  console.log("ST " + label + " " + JSON.stringify(sum));
};
await page.goto("http://localhost:5173/?tel=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await snap("page_loaded");
await page.getByRole("button", { name: /Launch Blender/ }).click();
let up = false;
for (let i = 0; i < 200 && !up; i++) { await wait(3000); await snap("t+" + (i + 1) * 3 + "s"); up = !!(await page.evaluate(() => window.__BGUI__ || {})).window; }
await wait(10000); await snap("ui_up+10s"); await wait(20000); await snap("ui_up+30s");
await browser.close();
