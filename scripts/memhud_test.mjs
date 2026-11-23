// M2: ukazatel RAM. Env Q = query (membase=…), EXPECT = green|yellow|red. Červená → /opfs/home/_autosave.blend musí vzniknout bez periodického autosave (?autosave=600).
const { chromium } = await import(process.env.PW || "playwright");
const expect = process.env.EXPECT || "green";
const expr = `import bpy, os, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    try:
        if st['n'] == 1:
            bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.ops.ed.undo_push(message='x')
        if st['n'] == 45:
            print('AST autosave_exists', os.path.exists('/opfs/home/_autosave.blend'))
    except Exception as e: print('AST ERR', e)
    sys.stdout.flush()
    return 1.0 if st['n'] < 46 else None
bpy.app.timers.register(_t, first_interval=8.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let exists = null; page.on("console", m => { const t = m.text(); const r = /AST autosave_exists (\w+)/.exec(t); if (r) exists = r[1] === "True"; });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?autosave=600&" + (process.env.Q || ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 150 && exists === null; i++) await new Promise(r => setTimeout(r, 1000));
const h = await page.evaluate(() => ({ m: window.__MEMHUD__ || null, txt: document.getElementById("mem-hud")?.textContent || null, warn: !!document.getElementById("mem-hud-warn"), asreq: window.__MEMHUD_AS__ || 0, uasm: window.__UASM_MB__ || null }));
console.log("MEMHUD " + JSON.stringify(h) + " autosave_exists=" + exists);
const lv = h.m ? ["green", "yellow", "red"][h.m.level] : "none";
let ok = lv === expect && (expect === "red" ? (exists === true && h.warn) : (exists === false && !h.warn));
console.log((ok ? "PASS" : "FAIL") + " memhud expect=" + expect + " got=" + lv);
await browser.close();
process.exit(ok ? 0 : 1);
