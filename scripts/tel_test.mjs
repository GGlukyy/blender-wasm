// M0: telemetrie. Spustí Blender, počká na vzorky, simuluje ztrátu GPU a zkontroluje out/ipad/tel_*.jsonl.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.goto("http://localhost:5173/?tel=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await page.mouse.move(700, 400); await page.mouse.down(); await page.mouse.up();
for (let i = 0; i < 30; i++) { await page.mouse.move(700, 400); await page.mouse.wheel(0, i % 2 ? 120 : -120); await new Promise(r => setTimeout(r, 1000)); }
const cdp = await browser.newBrowserCDPSession();
await cdp.send("Browser.crashGpuProcess").catch(() => {});
await page.waitForSelector("#gpu-lost", { timeout: 30000 }).catch(() => {});
await new Promise(r => setTimeout(r, 3000));
await browser.close();
