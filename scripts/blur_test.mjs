// Zaseknutý modifikátor: Shift držený při ztrátě fokusu (přepnutí aplikace) se musí uvolnit. Blender musí dostat keyup.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
st = {'n': 0}
def _t():
    st['n'] += 1
    return 1.0
bpy.app.timers.register(_t, first_interval=5.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const lines = []; page.on("console", m => { const t = m.text(); if (/KEYS_RELEASED|KDBG/.test(t)) lines.push(t.slice(0, 120)); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 6000));
// keyup, který dorazí do okna po blur (zachytí to, co by dostal Blender/emscripten)
await page.evaluate(() => { window.__ups = []; window.addEventListener("keyup", e => window.__ups.push(e.code + (e.isTrusted ? "" : "*")), true); });
await page.mouse.move(700, 400);
await page.keyboard.down("Shift"); await page.keyboard.down("Control");
await page.evaluate(() => window.dispatchEvent(new Event("blur")));
await new Promise(r => setTimeout(r, 500));
const ups = await page.evaluate(() => window.__ups);
console.log("UPS", JSON.stringify(ups), JSON.stringify(lines));
const ok = ups.includes("ShiftLeft*") && ups.includes("ControlLeft*");
console.log(ok ? "PASS blur uvolní držené klávesy" : "FAIL: klávesy zůstaly držené");
await page.keyboard.up("Shift"); await page.keyboard.up("Control");
await browser.close();
