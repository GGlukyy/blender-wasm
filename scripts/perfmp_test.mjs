// Backlog záložní fronta 5: výkon Solid a MP při otáčení na PC. Q = dotaz (např. ipad=1). Výstup: dt, draws, pipelines z kanálu blender-perf.
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, "");
const expr = `import bpy, sys, os, mathutils
def _cmd():
    if os.path.exists('/tmp/pf_cmd'):
        s = open('/tmp/pf_cmd').read(); os.remove('/tmp/pf_cmd'); exec(s, globals()); print('PFOK'); sys.stdout.flush()
    return 0.05
_st = {'on': False}
def _spin():
    if _st['on']:
        for a in bpy.context.window_manager.windows[0].screen.areas:
            if a.type == 'VIEW_3D': r = a.spaces[0].region_3d; r.view_rotation = mathutils.Euler((0, 0, 0.03)).to_quaternion() @ r.view_rotation
    return 0.0
bpy.app.timers.register(_cmd, first_interval=0.5, persistent=True); bpy.app.timers.register(_spin, first_interval=1.0, persistent=True); print('PFREADY'); sys.stdout.flush()`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let ready = false, ok = false; page.on("console", (m) => { const t = m.text(); if (t.includes("PFREADY")) ready = true; if (t.includes("PFOK")) ok = true; if (/RuntimeError|abort\(/.test(t)) console.log("ERR " + t.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; window.__PF = []; new BroadcastChannel("blender-perf").onmessage = (ev) => window.__PF.push(ev.data); }, expr);
await page.goto("http://localhost:5173/?perf=1" + (Q ? "&" + Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300 && !ready; i++) await wait(500);
await wait(6000); await page.keyboard.press("Escape"); await wait(800);
const py = async (c) => { ok = false; await page.evaluate((c) => Module.FS.writeFile("/tmp/pf_cmd", c), c); for (let i = 0; i < 1200 && !ok; i++) await wait(100); };
const flags = await page.evaluate(() => 1);
for (const [name, t] of [["SOLID", "SOLID"], ["MATERIAL", "MATERIAL"]]) {
  await py(`[a.spaces[0].shading.__setattr__('type','${t}') for a in bpy.context.window_manager.windows[0].screen.areas if a.type=='VIEW_3D']`);
  await wait(t === "MATERIAL" ? 25000 : 4000);
  await py("_st['on']=True"); await wait(1000); await page.evaluate(() => { window.__PF = []; }); await wait(12000); await py("_st['on']=False");
  const s = await page.evaluate(() => window.__PF);
  const avg = (k) => { const v = s.map((x) => x[k]).filter((x) => typeof x === "number"); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
  const keys = s.length ? Object.keys(s[s.length - 1]).filter((k) => typeof s[s.length - 1][k] === "number") : [];
  console.log(`${name} vzorků ${s.length} ` + JSON.stringify(Object.fromEntries(keys.map((k) => [k, avg(k)]))));
  await wait(1000);
}
await browser.close();
