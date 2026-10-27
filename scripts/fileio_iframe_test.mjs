// H20: export v cross-origin iframu (jako itch.io, sandbox s allow-downloads): OBJ export → lišta „⬇ Stáhnout“ → klik → download neprázdný.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true })).newPage();
const logs = []; page.on("console", (m) => logs.push(m.text()));
const PY = `import bpy, os
def _tick():
    if os.path.exists('/tmp/fio_req.req'):
        code = open('/tmp/fio_req.req').read(); os.remove('/tmp/fio_req.req')
        try: print('FIO_RES', eval(code), flush=True)
        except Exception as e: print('FIO_RES ERR', repr(e)[:200], flush=True)
    return 0.3
bpy.app.timers.register(_tick, first_interval=3.0, persistent=True)`;
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, PY);
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
await wait(10000);
await F.evaluate(() => { try { window.Module.FS.mkdir("/uploads"); } catch (e) {} window.Module.FS.writeFile("/tmp/fio_req.req", new TextEncoder().encode("bpy.ops.wm.obj_export(filepath='/uploads/fr.obj')")); });
for (let i = 0; i < 30 && !(await F.locator('.export-dl[data-path$="/fr.obj"]').count()); i++) await wait(500);
const has = await F.locator('.export-dl[data-path$="/fr.obj"]').count();
await page.screenshot({ path: "out/fio/iframe.png" });
const dlp = page.waitForEvent("download", { timeout: 8000 }).catch(() => null);
if (has) await F.locator('.export-dl[data-path$="/fr.obj"]').first().click();
const d = await dlp;
let size = 0; if (d) { await d.saveAs("out/fio/iframe_fr.obj"); size = (await import("node:fs")).statSync("out/fio/iframe_fr.obj").size; }
console.log("iframe bar=" + has + " download=" + (d ? d.suggestedFilename() : "none") + " size=" + size);
console.log((has && d && size > 0 ? "PASS" : "FAIL") + " export_iframe");
await browser.close(); process.exit(0);
