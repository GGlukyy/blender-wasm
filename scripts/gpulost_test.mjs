// Ztráta GPU zařízení: po device.destroy() se musí ukázat červený banner (#gpu-lost) s tlačítkem Obnovit.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("console", m => { if (/LOST/.test(m.text())) console.log("CONSOLE", m.text().slice(0, 120)); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await new Promise(r => setTimeout(r, 4000));
// skutečná ztráta zařízení: spadne GPU proces (chrome://gpucrash v druhé záložce)
const cdp = await browser.newBrowserCDPSession();
await cdp.send("Browser.crashGpuProcess").catch(e => console.log("crashGpuProcess:", String(e).slice(0, 100)));
await page.waitForSelector("#gpu-lost", { timeout: 30000 }).catch(() => {});
const txt = await page.evaluate(() => document.querySelector("#gpu-lost")?.textContent || null);
await page.screenshot({ path: "out/gpulost.png" });
console.log(txt ? "PASS gpulost banner: " + txt.slice(0, 80) : "FAIL: žádný banner");
await browser.close();
