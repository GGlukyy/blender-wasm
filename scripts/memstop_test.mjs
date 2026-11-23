// H53: červený ukazatel RAM zastaví přehrávání animace. Env Q (membase=3500 → červená). PASS = přehrávání běželo a pak se zastavilo + hláška WEB_MEM_STOP.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    try:
        w = bpy.context.window_manager.windows[0]
        if st['n'] == 1:
            with bpy.context.temp_override(window=w, screen=w.screen): bpy.ops.screen.animation_play()
            print('MS playing', w.screen.is_animation_playing)
        if st['n'] in (3, 20): print('MS state', st['n'], w.screen.is_animation_playing)
    except Exception as e: print('MS ERR', e)
    sys.stdout.flush()
    return 1.0 if st['n'] < 21 else None
bpy.app.timers.register(_t, first_interval=3.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const ev = []; page.on("console", m => { const t = m.text(); if (/^MS |WEB_MEM_STOP/.test(t)) { ev.push(t); console.log(t.slice(0, 120)); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?autosave=600&" + (process.env.Q || ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 120 && !ev.some(t => /MS state 20/.test(t)); i++) await new Promise(r => setTimeout(r, 1000));
const exp = process.env.EXPECT === "keep";
const stopped = ev.some(t => /WEB_MEM_STOP/.test(t)), end = ev.find(t => /MS state 20 (\w+)/.test(t)) || "";
const ok = ev.some(t => /MS playing True/.test(t)) && (exp ? !stopped && /True/.test(end) : stopped && /False/.test(end));
console.log((ok ? "PASS" : "FAIL") + " memstop expect=" + (exp ? "keep" : "stop") + " stopped=" + stopped + " end='" + end + "'");
await browser.close(); process.exit(ok ? 0 : 1);
