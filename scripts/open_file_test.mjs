// iPad "File ▸ Open": bez showDirectoryPicker se zobrazí dialog s tlačítkem "Choose file(s)…" (input type=file);
// vybraný soubor se zkopíruje do /uploads a Blender otevře file browser v tomto adresáři.
const { chromium } = await import(process.env.PW || "playwright");
const file = process.argv[2];
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.addInitScript(() => { Object.defineProperty(window, "showDirectoryPicker", { value: undefined, configurable: true }); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.evaluate(() => { window.__blenderFileOpenHook(); });
await page.waitForSelector("#dz-input", { state: "attached", timeout: 5000 });
await page.screenshot({ path: "out/open_dialog.png" });
await page.setInputFiles("#dz-input", file);
await wait(5000);
const listing = await page.evaluate(() => { try { return window.Module.FS.readdir("/uploads").join(","); } catch (e) { return "ERR " + e; } });
console.log("FS /uploads: " + listing);
await page.screenshot({ path: "out/open_browser.png" });
console.log(listing.includes("blend64_ref.blend") ? "PASS: soubor v /uploads, file browser otevřen (viz out/win/open_browser.png)" : "FAIL");
await browser.close();
