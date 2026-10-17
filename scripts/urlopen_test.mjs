// wm.url_open (Help ▸ Manual…) musí na webu otevřít odkaz: stránka dostane WEB_OPEN_URL a zavolá window.open.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def _t():
    print('UO', bpy.ops.wm.url_open(url='https://docs.blender.org/manual/en/latest/')); sys.stdout.flush()
bpy.app.timers.register(_t, first_interval=8.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; window.__opens = []; const o = window.open; window.open = (...a) => { window.__opens.push(a[0]); return null; }; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 12000));
const o = await page.evaluate(() => window.__opens); console.log("window.open calls:", JSON.stringify(o));
console.log(o.some(u => u.startsWith("https://docs.blender.org/manual/en/latest/")) ? "PASS url_open" : "FAIL url_open");
await browser.close();
