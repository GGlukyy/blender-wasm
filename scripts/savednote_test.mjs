// "Uloženo" toast: Blender hlásí zápis souboru → pruh s tlačítkem do 📁.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.goto("http://localhost:5173/?tel=0", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
await page.evaluate(() => window.__scan("Saved \"scene.blend\""));
const txt = await page.evaluate(() => { const n = document.getElementById("saved-note"); return n && n.style.display === "block" ? n.textContent : null; });
await page.locator("#saved-note button").click();
await new Promise(r => setTimeout(r, 800));
const fm = await page.evaluate(() => document.body.innerText.includes("/uploads") || document.body.innerText.toLowerCase().includes("soubor"));
console.log("toast:", txt, "| file manager:", fm);
console.log(txt && txt.includes("scene.blend") && fm ? "PASS savednote" : "FAIL savednote");
await browser.close();
