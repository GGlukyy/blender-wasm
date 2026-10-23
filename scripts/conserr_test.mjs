// Vypíše WebGPU chyby z konzole (Destroyed buffer ... atd.) při Tab, A, Alt+A, Shift+A UV Sphere.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const errs = new Map();
page.on("console", m => { const t = m.text(); if ((m.type() === "error" || m.type() === "warning") && !/WGPU_|deprecat/i.test(t.slice(0, 20))) { const k = t.slice(0, 260); errs.set(k, (errs.get(k) || 0) + 1); } });
page.on("pageerror", e => console.log("PAGEERROR", String(e).slice(0, 300)));
await page.goto("http://localhost:5173/?tel=0", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const w = (ms) => new Promise(r => setTimeout(r, ms));
await w(8000);
await page.mouse.move(700, 400); await page.keyboard.press("Tab"); await w(2000);
await page.keyboard.press("a"); await w(2000); await page.keyboard.press("Alt+a"); await w(2000);
await page.screenshot({ path: "out/conserr.png" });
for (const [k, n] of errs) console.log("ERR x" + n, k);
console.log("DONE errs=" + errs.size);
await browser.close();
