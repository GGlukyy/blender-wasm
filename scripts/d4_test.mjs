// D4a: Z-fighting na výchozí kostce v Material Preview? Screenshoty out/d4${q.includes("solid") ? "s" : ""}_*.png při různém zoomu/orbitu. Argument: URL query (default "mp=1").
const { chromium } = await import(process.env.PW || "playwright");
const q = process.argv[2] || "mp=1";
const P = q.includes("solid") ? "d4s" : "d4";
const expr = `import bpy
def mp():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = '${q.includes("solid") ? "SOLID" : "MATERIAL"}'
    return None
bpy.app.timers.register(mp, first_interval=6.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(10000); await page.keyboard.press("Escape");
const b = await page.locator("#canvas").boundingBox(); const cx = b.x + 570, cy = b.y + 395;
await page.mouse.move(cx, cy); await page.keyboard.press("Home"); await wait(25000);
await page.screenshot({ path: `out/${P}_0.png`, clip: { x: cx - 250, y: cy - 250, width: 500, height: 500 } });
for (let k = 1; k <= 3; k++) { for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -300); await wait(150); } await wait(8000); await page.screenshot({ path: `out/${P}_${k}.png`, clip: { x: cx - 250, y: cy - 250, width: 500, height: 500 } }); }
console.log("DONE d4 " + q); await browser.close();
