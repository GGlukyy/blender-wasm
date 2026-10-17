// Které regiony se překreslují při orbitu (?perf=1&reglog=1). Výstup: počty REGDRAW area/region za orbit.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const cnt = {}; let on = false;
page.on("console", m => { if (!on) return; const r = /REGDRAW area=(-?\d+) region=(\d+)/.exec(m.text()); if (r) cnt[r[1] + "/" + r[2]] = (cnt[r[1] + "/" + r[2]] || 0) + 1; });
await page.goto("http://localhost:5173/?perf=1&reglog=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(7000); await page.keyboard.press("Escape"); await wait(1500);
const box = await page.locator("#canvas").boundingBox(); const c = { x: box.x + 600, y: box.y + 400 };
await page.mouse.move(c.x, c.y); on = true;
await page.mouse.down({ button: "middle" });
for (let i = 0; i < 200; i++) { await page.mouse.move(c.x + 100 * Math.sin(i / 10), c.y + 40 * Math.cos(i / 10)); await wait(16); }
await page.mouse.up({ button: "middle" }); await wait(500); on = false;
console.log("REGIONS " + JSON.stringify(cnt));
console.log(Object.keys(cnt).length ? "PASS: měřeno" : "FAIL: žádná data");
await browser.close();
