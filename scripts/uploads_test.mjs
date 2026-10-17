// Počet GPU uploadů/vytvoření bufferů za snímek při orbitu (PC Chrome). Počítá volání GPUQueue.writeBuffer / GPUDevice.createBuffer
// na hlavním vlákně přes init script. Výstup: UPLOADS {...}
//   scripts/uploads_win.sh
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const stats = [];
page.on('console', m => { const t = m.text(); const r = /WGPU_STATS frame=(\d+) .*?writes=(\d+)\/(\d+)KB big=(\d+)/.exec(t); if (t.includes('WGPU_STATS')) console.log('RAW ' + t.slice(0,200)); if (r) stats.push(r.slice(1).map(Number)); });
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(6000);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 600, y: box.y + 400 };
await page.mouse.move(c.x, c.y);
const n0 = stats.length;
await page.mouse.down({ button: "middle" });
for (let i = 0; i < 400; i++) { await page.mouse.move(c.x + 100 * Math.sin(i / 10), c.y + 40 * Math.cos(i / 10)); await wait(16); }
await page.mouse.up({ button: "middle" });
await wait(500);
const o = stats.slice(n0);
console.log("STATS " + JSON.stringify(o));
if (o.length >= 2) { const a = o[0], b = o[o.length - 1], fr = b[0] - a[0];
  console.log(`UPLOADS per frame: writes=${((b[1]-a[1])/fr).toFixed(1)} KB=${((b[2]-a[2])/fr).toFixed(1)} big(>64KB)=${((b[3]-a[3])/fr).toFixed(2)} (over ${fr} frames)`);
  console.log("PASS: měřeno"); } else console.log("FAIL: málo snímků");
await browser.close();
