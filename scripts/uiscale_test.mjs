// ?uiscale=1.4 zvětší UI (menu výška) — porovnání se základem. node uiscale_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
let logs = [];
const run = async (q, shot) => {
  const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
  page.on("console", (m) => { const t = m.text(); if (/UISCALE|USERPREF|Traceback|SyntaxError|Error/.test(t)) logs.push(q + " " + t.slice(0, 80)); });
  await page.goto("http://localhost:5173/" + q, { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
  await new Promise(r => setTimeout(r, 9000)); await page.keyboard.press("Escape"); await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: shot });
  await page.close();
};
await run("?touch=0", "out/uis_base.png");
await run("?touch=0&uiscale=1.4", "out/uis_big.png");
console.log(logs.join("\n"));
console.log(logs.some((l) => /UISCALE set 1.4/.test(l)) ? "PASS: uiscale (porovnej out/uis_*.png)" : "FAIL: uiscale");
await browser.close();
