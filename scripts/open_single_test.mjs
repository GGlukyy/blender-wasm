// H29b: File ▸ Open. node open_single_test.mjs <mode> <file.blend> [file2.blend]
//  folder1: dialog -> "Vybrat složku" (showDirectoryPicker nahrazen OPFS složkou s 1 .blend) -> otevře se rovnou
//  file:    dialog -> "Jen jeden soubor…" (filechooser) -> otevře se rovnou
//  folder2: složka se 2 .blend -> Blenderův prohlížeč (bez přímého otevření)
import { readFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
const [mode, ...files] = process.argv.slice(2);
const expr = `import bpy, sys
def t():
    print('FILEPATH ' + bpy.data.filepath); sys.stdout.flush(); return 1.0
bpy.app.timers.register(t, first_interval=3.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let fp = "";
page.on("console", (m) => { const t = m.text(), i = t.indexOf("FILEPATH "); if (i >= 0) fp = t.slice(i + 9).trim(); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
if (mode !== "file") {
  const datas = files.map((f) => [f.split(/[\\/]/).pop(), [...readFileSync(f)]]);
  await page.evaluate(async (datas) => {
    const root = await navigator.storage.getDirectory();
    const d = await root.getDirectoryHandle("h29proj", { create: true });
    for (const [n, bytes] of datas) { const fh = await d.getFileHandle(n, { create: true }); const w = await fh.createWritable(); await w.write(new Uint8Array(bytes)); await w.close(); }
    window.showDirectoryPicker = async () => d;
  }, datas);
}
await page.evaluate(() => { window.__blenderFileOpenHook(); });
await page.waitForSelector("#open-chooser", { timeout: 5000 });
await page.screenshot({ path: `out/open_chooser.png` });
const txt = await page.locator("#open-chooser").innerText();
if (!/SLOŽKU/.test(txt) || !/Jen jeden soubor/.test(txt)) { console.log("FAIL dialog text: " + txt); process.exit(1); }
if (mode === "file") {
  const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.click("#oc-file")]);
  await fc.setFiles(files[0]);
} else await page.click("#oc-folder");
await wait(9000);
await page.screenshot({ path: `out/open_${mode}.png` });
console.log(`mode=${mode} filepath=${fp}`);
const ok = mode === "folder2" ? fp === "" : /\.blend$/.test(fp);
console.log(ok ? `PASS ${mode}` : `FAIL ${mode}`);
await browser.close(); process.exit(ok ? 0 : 1);
