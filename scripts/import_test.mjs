// H19: File ▸ Import ▸ Wavefront (.obj) → lišta „Vybrat soubory z počítače“ → nahrání .obj přes <input type=file> → soubor je ve file browseru
// → Import → objekt ve scéně. Spuštění: scripts/import_win.sh (vite na :5173).
const { chromium } = await import(process.env.PW || "playwright");
const fs = await import("node:fs");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text()));
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/h19_tri.obj", "o H19Tri\nv 0 0 0\nv 1 0 0\nv 0 1 0\nv 0 0 1\nf 1 2 3\nf 1 3 4\nf 1 2 4\nf 2 3 4\n");
const PY = `import bpy, os
def _open():
    wm = bpy.context.window_manager
    with bpy.context.temp_override(window=wm.windows[0]):
        print('H19_OPEN', bpy.ops.wm.obj_import('INVOKE_DEFAULT'), flush=True)
def _check():
    for win in bpy.context.window_manager.windows:
        for a in win.screen.areas:
            if a.type == 'FILE_BROWSER':
                for sp in a.spaces:
                    if sp.type == 'FILE_BROWSER' and sp.params and sp.params.filename == 'h19_tri.obj':
                        d = sp.params.directory.decode() if isinstance(sp.params.directory, bytes) else sp.params.directory
                        print('H19_PARAMS', d, os.path.exists(d + 'h19_tri.obj'), flush=True)
                        with bpy.context.temp_override(window=win, area=a):
                            pass
                        r = bpy.ops.wm.obj_import(filepath=d + sp.params.filename)
                        print('H19_IMPORTED', r, [o.name for o in bpy.data.objects], flush=True)
                        return None
    return 0.5
bpy.app.timers.register(_open, first_interval=8.0)
bpy.app.timers.register(_check, first_interval=12.0)`;
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, PY);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const has = (re) => logs.some((l) => re.test(l));
for (let i = 0; i < 120 && !has(/WEB_FILE_IMPORT /); i++) await wait(1000);
const bar = await page.evaluate(() => { const n = document.getElementById("import-bar"); return !!n && n.style.display !== "none"; });
await page.screenshot({ path: "out/h19_bar.png" });
await page.setInputFiles("#import-input", "out/h19_tri.obj");
for (let i = 0; i < 60 && !has(/H19_IMPORTED/); i++) await wait(1000);
await page.screenshot({ path: "out/h19_done.png" });
const params = logs.find((l) => l.includes("H19_PARAMS")) || "";
const imp = logs.find((l) => l.includes("H19_IMPORTED")) || "";
console.log(params, imp, "bar=" + bar);
const ok = bar && /H19_PARAMS \/uploads\/ True/.test(params) && /FINISHED/.test(imp) && /H19Tri/.test(imp);
console.log((ok ? "PASS" : "FAIL") + " import");
// složka s modelem + texturou: model v podsložce, textura vedle
fs.mkdirSync("out/h19_dir/tex", { recursive: true });
fs.writeFileSync("out/h19_dir/tex/h19b.obj", "o H19Dir\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
fs.writeFileSync("out/h19_dir/tex/skin.png", Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"));
logs.length = 0;
await page.evaluate(() => { window.Module.ccall("blender_web_run_python", null, ["string"], ["0"]); }).catch(() => {});
await page.evaluate(() => { const n = document.getElementById("import-bar"); if (n) n.style.display = "block"; });
await page.setInputFiles("#import-dir-input", "out/h19_dir");
await wait(1500);
const ex = await page.evaluate(() => { const F = window.Module.FS; try { return F.readdir("/uploads/h19_dir/tex").join(","); } catch (e) { return "ERR " + e; } });
const pk = await page.evaluate(() => { try { return new TextDecoder().decode(window.Module.FS.readFile("/tmp/web_pick.txt")); } catch (e) { return "consumed"; } });
console.log("DIR", ex, JSON.stringify(pk));
const ok2 = /h19b\.obj/.test(ex) && /skin\.png/.test(ex);
console.log((ok2 ? "PASS" : "FAIL") + " import_dir");
await browser.close(); process.exit(0);
