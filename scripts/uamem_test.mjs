// M4: kam jde paměť — performance.measureUserAgentSpecificMemory() (Chrome) ve fázích: stránka s assety / po startu Blenderu.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const mem = async (tag) => { const r = await page.evaluate(async () => { try { const m = await performance.measureUserAgentSpecificMemory(); return { mb: Math.round(m.bytes / 1048576), parts: m.breakdown.map(b => Math.round(b.bytes / 1048576) + "MB " + (b.attribution.map(a => a.scope + ":" + (a.url || "").split("/").pop()).join("+") || "-")).filter(x => !/^0MB/.test(x)) }; } catch (e) { return String(e); } }); console.log("UAMEM " + tag + " " + JSON.stringify(r)); };
await page.goto("http://localhost:5173/?tel=0" + (process.env.Q || ""), { waitUntil: "load" });
await new Promise(r => setTimeout(r, 15000));
await mem("splash_assets_loaded");
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 5000));
await mem("blender_booted");
await browser.close();
