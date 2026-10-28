// N1b: dojde 5.3 build do okna Blenderu? Vypíše posledních 25 řádků konzole + screenshot out/boot53.png.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text().slice(0, 220)));
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message.slice(0, 220)));
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
const t0 = Date.now(); let ok = false;
for (let i = 0; i < 90; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) { ok = true; break; } await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 8000));
await page.screenshot({ path: "out/boot53.png" });
console.log("WINDOW " + ok + " po " + Math.round((Date.now() - t0) / 1000) + " s od kliknutí");
console.log(logs.slice(-25).join("\n"));
await browser.close();
