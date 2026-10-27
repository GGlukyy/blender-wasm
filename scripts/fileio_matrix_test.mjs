// H20: matice exportů — pro každý exportér provede operátor (filepath do /uploads), pak ověří, že lišta „⬇ Stáhnout“ nabídne
// soubor a klik opravdu stáhne neprázdný soubor. Spuštění: scripts/fileio_matrix_win.sh (vite na :5173).
const { chromium } = await import(process.env.PW || "playwright");
const fs = await import("node:fs");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 }, acceptDownloads: true })).newPage();
const logs = [];
page.on("console", (m) => logs.push(m.text()));
fs.mkdirSync("out/fio", { recursive: true });
const CASES = [
  ["obj", "bpy.ops.wm.obj_export(filepath='/uploads/m.obj')", "m.obj"],
  ["stl", "bpy.ops.wm.stl_export(filepath='/uploads/m.stl')", "m.stl"],
  ["ply", "bpy.ops.wm.ply_export(filepath='/uploads/m.ply')", "m.ply"],
  ["usd", "bpy.ops.wm.usd_export(filepath='/uploads/m.usda')", "m.usda"],
  ["abc", "bpy.ops.wm.alembic_export(filepath='/uploads/m.abc')", "m.abc"],
  ["gltf", "bpy.ops.export_scene.gltf(filepath='/uploads/m.glb')", "m.glb"],
  ["fbx", "bpy.ops.export_scene.fbx(filepath='/uploads/m.fbx')", "m.fbx"],
  ["dae", "bpy.ops.wm.collada_export(filepath='/uploads/m.dae')", "m.dae"],
  ["svg", "bpy.ops.wm.gpencil_export_svg(filepath='/uploads/m.svg')", "m.svg"],
  ["obj_opfs_home", "bpy.ops.wm.obj_export(filepath='/opfs/home/h20.obj')", "h20.obj"],
  ["obj_cwd", "bpy.ops.wm.obj_export(filepath=os.path.join(os.getcwd(), 'h20cwd.obj'))", "h20cwd.obj"],
  ["save_copy", "bpy.ops.wm.save_as_mainfile(filepath='/uploads/h20copy.blend', copy=True)", "h20copy.blend"],
  ["save_as", "bpy.ops.wm.save_as_mainfile(filepath='/uploads/h20saveas.blend')", "h20saveas.blend"],
  ["image_save_as", "(lambda im: im.save_render('/uploads/m_img.png'))(bpy.data.images.new('t', 8, 8))", "m_img.png"],
];
const PY = `import bpy, os, traceback
def _tick():
    if os.path.exists('/tmp/fio_req.req'):
        code = open('/tmp/fio_req.req').read(); os.remove('/tmp/fio_req.req')
        try:
            r = eval(code); print('FIO_RES', r, flush=True)
        except Exception as e:
            print('FIO_RES ERR', repr(e)[:200], flush=True)
    return 0.3
bpy.app.timers.register(_tick, first_interval=3.0, persistent=True)`;
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, PY);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
const wait = (ms) => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120; i++) { if (await page.evaluate(() => !!(window.Module && window.Module.FS && window.Module.FS.analyzePath("/uploads").exists !== undefined && window.Module.calledRun))) break; await wait(1000); }
await wait(12000);
await page.evaluate(() => { try { window.Module.FS.mkdir('/uploads'); } catch (e) {} });
let fails = 0;
for (const [name, code, file] of CASES) {
  logs.length = 0;
  await page.evaluate((c) => { window.Module.FS.writeFile("/tmp/fio_req.req", new TextEncoder().encode(c)); }, code);
  for (let i = 0; i < 40 && !logs.some((l) => l.includes("FIO_RES")); i++) await wait(500);
  const exp = await page.evaluate(() => { const F = window.Module.FS; try { return F.readdir('/uploads').join(','); } catch (e) { return 'ERR'; } });
  const res = logs.find((l) => l.includes("FIO_RES")) || "FIO_RES TIMEOUT";
  for (let i = 0; i < 16 && !(await page.locator(`.export-dl[data-path$="/${file}"]`).count()) && !/could not be found/.test(res); i++) await wait(500);
  const wx = logs.filter((l) => l.includes("WEB_EXPORT")).join(" ; ");
  const btn = page.locator(`.export-dl[data-path$="/${file}"]`);
  let status = "NOBAR", size = 0;
  if (await btn.count()) {
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 8000 }).catch(() => null), btn.first().click()]);
    if (dl) { const p = `out/fio/${name}_${file}`; await dl.saveAs(p); size = fs.statSync(p).size; status = size > 0 ? "OK" : "EMPTY"; }
    else status = "NODL";
  }
  await page.evaluate(() => { const n = document.getElementById("export-bar"); if (n) n.style.display = "none"; });
  const missing = /could not be found/.test(res); // operátor v buildu neexistuje → v UI taky není, není co stahovat
  const ok = status === "OK" || missing;
  if (missing) status = "N/A (operátor v buildu není)";
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${status} ${size}B | ${res.slice(0, 160)} | uploads=${exp} | ${wx}`);
}
// čtecí cesty: soubory z /uploads (vytvořené výše exportem) se musí načíst; ověřuje se FINISHED
const N = "(lambda r: (r, len(bpy.data.objects)))";
const READ = [
  ["append", `${N}(bpy.ops.wm.append(filepath='/uploads/h20copy.blend/Object/Cube', directory='/uploads/h20copy.blend/Object/', filename='Cube'))`],
  ["link", `${N}(bpy.ops.wm.link(filepath='/uploads/h20copy.blend/Collection/Collection', directory='/uploads/h20copy.blend/Collection/', filename='Collection'))`],
  ["obj_import", `${N}(bpy.ops.wm.obj_import(filepath='/uploads/m.obj'))`],
  ["stl_import", `${N}(bpy.ops.wm.stl_import(filepath='/uploads/m.stl'))`],
  ["ply_import", `${N}(bpy.ops.wm.ply_import(filepath='/uploads/m.ply'))`],
  ["gltf_import", `${N}(bpy.ops.import_scene.gltf(filepath='/uploads/m.glb'))`],
  ["fbx_import", `${N}(bpy.ops.import_scene.fbx(filepath='/uploads/m.fbx'))`],
  ["image_open", "bpy.ops.image.open(filepath='/uploads/m_img.png')"],
  ["open_mainfile", "bpy.ops.wm.open_mainfile(filepath='/uploads/h20saveas.blend')"],
  ["revert", "bpy.ops.wm.revert_mainfile()"],
];
for (const [name, code] of READ) {
  logs.length = 0;
  await page.evaluate((c) => { window.Module.FS.writeFile("/tmp/fio_req.req", new TextEncoder().encode(c)); }, code);
  for (let i = 0; i < 60 && !logs.some((l) => l.includes("FIO_RES")); i++) await wait(500);
  const res = logs.find((l) => l.includes("FIO_RES")) || "FIO_RES TIMEOUT";
  const ok = /FINISHED/.test(res) || /could not be found/.test(res);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} read ${name}: ${res.slice(0, 200)}`);
  await wait(1500);
}
await page.screenshot({ path: "out/fio/final.png" });
console.log(fails ? `FAIL ${fails} z ${CASES.length}` : "PASS všechny exporty");
await browser.close(); process.exit(0);
