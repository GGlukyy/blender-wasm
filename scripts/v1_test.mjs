// V1: barva pozadí node editoru (Shading) na PC. node v1_test.mjs -> out/v1_shading.png + vzorek pixelu uprostřed node plochy
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def go():
    bpy.context.window.workspace = bpy.data.workspaces['Shading']; print('V1 SHADING'); sys.stdout.flush(); return None
bpy.app.timers.register(go, first_interval=12.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 30000));
await page.mouse.move(700, 450);
await page.screenshot({ path: "out/v1_shading.png" });
console.log("V1 done");
await browser.close();
