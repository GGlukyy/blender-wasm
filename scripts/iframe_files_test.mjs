// H17: demo v cross-origin iframu (jako itch.io, sandbox s allow-downloads): Open nesmí spadnout na showDirectoryPicker
// (SecurityError) → musí se ukázat dropzone s <input type=file>; Save → stažení blobu; tlačítko "Otevřít v novém okně".
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true })).newPage();
let errors = 0;
page.on("console", (m) => { const t = m.text(); if (/RuntimeError|abort\(|unreachable|tint-ICE|shaderc FAIL|Assertion failed/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
const http = await import("node:http");
http.createServer((q, r) => { r.writeHead(200, { "content-type": "text/html", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" });
  r.end('<iframe src="http://localhost:5173/" style="width:1400px;height:840px;border:0" allow="cross-origin-isolated; fullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"></iframe>'); }).listen(5199, "127.0.0.1");
await page.goto("http://127.0.0.1:5199/", { waitUntil: "domcontentloaded" });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(3000);
const F = page.frames().find((f) => f !== page.mainFrame());
await F.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await F.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await F.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
await wait(6000); await page.keyboard.press("Escape");
const newWin = await F.evaluate(() => !!document.getElementById("open-new-window"));
await F.evaluate(() => { window.__blenderFileOpenHook(); });
await wait(1500);
const dz = await F.evaluate(() => !!document.getElementById("localdir-dropzone"));
const hasFs = await F.evaluate(() => !!window.showDirectoryPicker);
await page.screenshot({ path: "out/iframe_open.png" });
await F.evaluate(() => { document.getElementById("dz-cancel")?.click(); });
const dl = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
await F.evaluate(() => { window.Module.FS.writeFile("/tmp/h17.blend", new Uint8Array([66, 76, 69, 78, 68, 69, 82])); window.__blenderSaveDownload("/tmp/h17.blend"); });
const d = await dl;
console.log("H17 framed showDirectoryPicker_present=" + hasFs + " dropzone=" + dz + " newwin_btn=" + newWin + " download=" + (d ? d.suggestedFilename() : "none") + " errors=" + errors);
const ok = dz && newWin && d && d.suggestedFilename() === "h17.blend" && errors === 0;
console.log((ok ? "PASS" : "FAIL") + " iframe_files");
await browser.close(); process.exit(0);
