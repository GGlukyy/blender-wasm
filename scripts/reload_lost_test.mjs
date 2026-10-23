// M6: po ztrátě GPU → location.reload() → Blender musí znovu naběhnout (ne zůstat na "Loading Blender…").
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const boot = async () => {
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  const t0 = Date.now();
  for (let i = 0; i < 120; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) return Date.now() - t0; await new Promise(r => setTimeout(r, 1000)); }
  return -1;
};
await page.goto("http://localhost:5173/?tel=0", { waitUntil: "load" });
console.log("BOOT1 ms", await boot());
await new Promise(r => setTimeout(r, 4000));
const cdp = await browser.newBrowserCDPSession();
await cdp.send("Browser.crashGpuProcess").catch(() => {});
await page.waitForSelector("#gpu-lost", { timeout: 30000 }).catch(() => {});
console.log("LOST banner", await page.evaluate(() => !!document.querySelector("#gpu-lost")));
await page.click("#gpu-lost button").catch(() => {});
await page.waitForLoadState("load");
const ms2 = await boot();
console.log("BOOT2 ms", ms2);
console.log(ms2 > 0 ? "PASS reload po ztrátě GPU naběhne" : "FAIL reload po ztrátě GPU: zaseklo se na Loading");
await browser.close();
