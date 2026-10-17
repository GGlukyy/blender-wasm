// Safari-like uložení: bez FS Access API se po Ctrl+S (a potvrzení) .blend stáhne jako download.
const { chromium } = await import(process.env.PW || "playwright");
const { readFileSync } = await import("node:fs");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true })).newPage();
await page.addInitScript(() => { for (const k of ["showDirectoryPicker", "showSaveFilePicker", "showOpenFilePicker"]) Object.defineProperty(window, k, { value: undefined, configurable: true }); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 400); await page.keyboard.press("g"); await page.keyboard.type("x2"); await page.keyboard.press("Enter"); await wait(800);
let dl = null; page.on("download", (d) => { dl = d; });
await page.keyboard.down("Control"); await page.keyboard.press("s"); await page.keyboard.up("Control"); await wait(3000);
await page.screenshot({ path: "out/save_dialog.png" });
await page.keyboard.press("Enter"); await wait(4000);
await page.screenshot({ path: "out/save_after.png" });
if (dl) { const p = await dl.path(); const b = readFileSync(p); console.log(`PASS: download ${dl.suggestedFilename()} ${b.length} B, hlavička ${b.slice(0, 7).toString()}`); }
else console.log("FAIL: žádný download (viz out/save_dialog.png, save_after.png)");
await browser.close();
