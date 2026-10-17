// Klid: když se nic neděje (žádný vstup), Blender nemá překreslovat (baterie iPadu). Měří přírůstek snímků za 8 s.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const stats = []; page.on("console", m => { const t = m.text(); const i = t.indexOf("WGPU_STATS frame="); if (i >= 0) stats.push(+/frame=(\d+)/.exec(t)[1]); });
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(3000);
await page.mouse.move(1300, 700); await wait(2000);
const f0 = await page.evaluate(() => window.__PERF__ ? JSON.stringify(window.__PERF__) : "none"); const n0 = stats.length; const last0 = stats[stats.length - 1];
await wait(8000);
const f1 = await page.evaluate(() => window.__PERF__ ? JSON.stringify(window.__PERF__) : "none"); const last1 = stats[stats.length - 1];
console.log("PERF0", f0.slice(0, 300)); console.log("PERF1", f1.slice(0, 300));
console.log("STATS lines", n0, "->", stats.length, "frame", last0, "->", last1);
await browser.close();
