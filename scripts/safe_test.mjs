// M6: (1) ?safe=1 naběhne bez OPFS, (2) watchdog banner se ukáže při pomalém startu a po startu zmizí.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const run = async (url, wd) => {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  if (wd) await page.addInitScript((m) => { window.__WATCHDOG_MS = m; }, wd);
  let shown = false, mountFail = false;
  page.on("console", m => { if (/mounting \/opfs FAILED/.test(m.text())) mountFail = true; });
  await page.goto(url, { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  let ok = false;
  for (let i = 0; i < 120; i++) {
    if (await page.evaluate(() => !!document.getElementById("start-hang"))) shown = true;
    if ((await page.evaluate(() => window.__BGUI__ || {})).window) { ok = true; break; }
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 2500));
  const still = await page.evaluate(() => !!document.getElementById("start-hang"));
  await page.close();
  return { ok, shown, still, mountFail };
};
const a = await run("http://localhost:5173/?tel=0&safe=1");
console.log("SAFE", JSON.stringify(a));
const b = await run("http://localhost:5173/?tel=0", 1200);
console.log("WATCHDOG", JSON.stringify(b));
console.log(a.ok && b.ok && b.shown && !b.still ? "PASS safe + watchdog" : "FAIL safe/watchdog");
await browser.close();
