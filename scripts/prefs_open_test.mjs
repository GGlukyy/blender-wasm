// H27: Edit ▸ Preferences (skutečné menu myší) -> screenshoty out/prefs_menu.png, out/prefs_win.png
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto("http://localhost:5173/?mp=0", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(75, 13); await page.mouse.click(75, 13); await wait(1000);
await page.screenshot({ path: "out/prefs_menu.png" });
// položka Preferences je v menu Edit zhruba na y=~340 (zjistit z prefs_menu.png); argv[2],argv[3] = x,y
const [x, y] = [+process.argv[2] || 100, +process.argv[3] || 340];
await page.mouse.move(x, y); await wait(300); await page.mouse.click(x, y); await wait(3000);
await page.screenshot({ path: "out/prefs_win.png" });
await page.mouse.move(40, 246); await wait(300); await page.mouse.click(40, 246); await wait(2500);
await page.screenshot({ path: "out/prefs_addons.png" });
await page.mouse.move(55, 213); await wait(300); await page.mouse.click(55, 213); await wait(2500);
await page.screenshot({ path: "out/prefs_ext.png" });
await browser.close();
