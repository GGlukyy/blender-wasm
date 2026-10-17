// Správce souborů (📁): export OBJ z Blenderu do wasm FS -> v dialogu je vidět a jde stáhnout.
const { chromium } = await import(process.env.PW || "playwright");
const { readFileSync } = await import("node:fs");
const expr = `import bpy, os, sys
def go():
    home = os.path.expanduser('~'); p = os.path.join(home, 'export_test.obj')
    try:
        bpy.ops.wm.obj_export(filepath=p)
    except Exception as e:
        print('FILESPY export failed ' + str(e))
    print('FILESPY wrote ' + p + ' ' + str(os.path.exists(p))); sys.stdout.flush(); return None
bpy.app.timers.register(go, first_interval=6.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true })).newPage();
let wrote = "";
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("FILESPY"); if (i >= 0) wrote = t.slice(i + 8); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(12000); console.log("blender: " + wrote);
await page.locator("#touchbar button", { hasText: "📁" }).click(); await wait(800);
await page.screenshot({ path: "out/files_dialog.png" });
const rows = await page.evaluate(() => [...document.querySelectorAll("div")].map(d => d.textContent).filter(t => t && t.includes("export_test.obj") && t.length < 200));
console.log("rows: " + JSON.stringify(rows.slice(0, 1)));
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }), page.evaluate(() => { const row = [...document.querySelectorAll("div")].find(d => d.children.length === 2 && d.children[0].textContent.includes("export_test.obj")); row.querySelector("button").click(); })]);
const path = await dl.path(); const txt = readFileSync(path, "utf8");
console.log("downloaded " + dl.suggestedFilename() + " bytes=" + txt.length + " has 'v ' lines: " + /^v /m.test(txt));
console.log(dl.suggestedFilename() === "export_test.obj" && /^v /m.test(txt) ? "PASS: export z Blenderu se dá stáhnout" : "FAIL");
await browser.close();
