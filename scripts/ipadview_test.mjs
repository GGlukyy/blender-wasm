// Vzhled v rozlišení iPad Air (1180×820, DPR 2, dotyk): snímek s lištou, ⋯ rozbalené. node ipadview_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1300,1000"] });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
const page = await ctx.newPage(); let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(1000);
await page.screenshot({ path: "out/ipad_1.png" });
await page.locator("#touchbar button", { hasText: /^⋯$/ }).click(); await wait(800);
await page.screenshot({ path: "out/ipad_2_more.png" });
const bar = await page.locator("#touchbar").boundingBox();
console.log("bar", JSON.stringify(bar), "bar present:", !!bar);
console.log(errs === 0 && bar ? "PASS: ipadview (zkontroluj snímky)" : "FAIL: ipadview");
await browser.close();
