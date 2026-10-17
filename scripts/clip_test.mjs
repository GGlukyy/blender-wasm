// Schránka: (1) Python wm.clipboard set/get uvnitř Blenderu, (2) text z vnějšku přes `paste` event dorazí do Blenderu,
// (3) Blender -> navigator.clipboard (best effort, v Chromiu potřebuje oprávnění → jen informativně).
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    wm = bpy.context.window_manager
    if st['n'] == 1:
        wm.clipboard = 'from-blender-42'
    print('CLIP', st['n'], repr(wm.clipboard)); sys.stdout.flush()
    return 1.0
bpy.app.timers.register(_t, first_interval=3.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:5173" });
const page = await ctx.newPage();
let last = ""; page.on("console", m => { const t = m.text(); const i = t.indexOf("CLIP "); if (i >= 0) last = t.slice(i); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(7000);
let fail = 0;
const internal = last.includes("from-blender-42"); console.log("internal:", last, internal ? "ok" : "BAD"); if (!internal) fail++;
const sys_clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => "ERR " + e)); console.log("navigator.clipboard after Blender copy:", JSON.stringify(sys_clip));
if (sys_clip !== "from-blender-42") fail++;
await page.mouse.move(700, 400);
await page.evaluate(() => { const dt = new DataTransfer(); dt.setData("text/plain", "pasted-from-outside"); window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true })); });
await wait(2500);
const pasted = last.includes("pasted-from-outside"); console.log("paste event:", last, pasted ? "ok" : "BAD"); if (!pasted) fail++;
// skutečné Ctrl+V: do systémové schránky, pak klávesa
await page.evaluate(() => navigator.clipboard.writeText("real-ctrl-v")); await page.mouse.click(700, 400); await page.keyboard.press("Control+v"); await wait(2500);
const real = last.includes("real-ctrl-v"); console.log("Ctrl+V:", last, real ? "ok" : "BAD"); if (!real) fail++;
console.log(fail ? "FAIL clipboard" : "PASS clipboard");
await browser.close();
