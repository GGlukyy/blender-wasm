// U3: (původně H54 šablona) import ze zařízení se spustí rovnou. // H54: obrázek ze zařízení (Add ▸ Image ▸ Reference, Image ▸ Open, drop) nesmí být růžový ani po uložení/otevření .blend.
// Simuluje zařízení: JS zapíše PNG do /uploads (jako lišta „Vybrat soubory“), Python vytvoří Image Empty a spočítá růžové pixely na plátně.
// Q=ipad=1 (volitelně &webkit_sim=1). Výstup: PASS/FAIL, out/h54_*.png
const { chromium } = await import(process.env.PW || "playwright");
const zlib = await import("zlib");
function png(w, h) { // zelenožlutý gradient, žádná růžová
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 40 + (x * 200 / w) | 0; raw[o + 1] = 200; raw[o + 2] = 30 + (y * 100 / h) | 0; } }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = t[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const b = Buffer.concat([Buffer.from(type), data]); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([l, b, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const Q = process.env.Q || "ipad=1";
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const logs = [];
page.on("console", (m) => { const t = m.text(); if (t.includes("H54") || t.includes("U3")) { logs.push(t); console.log("LOG " + t.slice(0, 300)); } });
page.on("pageerror", (e) => console.log("PAGEERROR " + e.message.slice(0, 200)));
const PYBOOT = `import bpy, os, sys
def _h54():
    p = '/tmp/h54_py.txt'
    if os.path.exists(p):
        c = open(p).read(); os.remove(p)
        try: exec(c, globals())
        except Exception as e: print('H54 EXC', repr(e)); sys.stdout.flush()
    return 0.5
bpy.app.timers.register(_h54, first_interval=2.0, persistent=True)`;
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, PYBOOT);
await page.goto("http://localhost:5173/?" + Q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000);
await page.keyboard.press("Escape"); await wait(500);
await wait(8000);
await page.keyboard.press("Escape"); await wait(500);
const py = (code) => page.evaluate((c) => { Module.FS.writeFile("/tmp/h54_py.txt", c); }, code);
const OBJ = "v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n";
const CTX = `
def _v3d(fn):
    w = bpy.context.window_manager.windows[0]
    ar = [a for a in w.screen.areas if a.type == 'VIEW_3D'][0]
    with bpy.context.temp_override(window=w, area=ar, region=[r for r in ar.regions if r.type == 'WINDOW'][0]): return fn()
`;
let fails = 0;
const check = (n, c) => { console.log((c ? "ok  " : "FAIL ") + n); if (!c) fails++; };
const bar = () => page.evaluate(() => { const n = document.getElementById("import-bar"); return !!n && n.style.display !== "none"; });
const objs = async () => { await py(`print('H54 U3 OBJS', len(bpy.data.objects), len(bpy.data.images), [i.name for i in bpy.data.images], [bool(i.packed_file) for i in bpy.data.images]); sys.stdout.flush()`); await wait(1500); const l = logs.filter(x => x.includes("U3 OBJS")).pop() || ""; return l; };
// 1) OBJ import
await py(CTX + `print('H54 U3 invoke', _v3d(lambda: bpy.ops.wm.obj_import('INVOKE_DEFAULT')))`);
await wait(4000);
check("lišta po spuštění importu", await bar());
const before = await objs();
await page.setInputFiles("#import-input", { name: "q.obj", mimeType: "text/plain", buffer: Buffer.from(OBJ) });
await wait(5000);
const after = await objs();
console.log("before:", before, "\nafter:", after);
const n0 = +/OBJS (\d+)/.exec(before)[1], n1 = +/OBJS (\d+)/.exec(after)[1];
check("OBJ naimportován rovnou (počet objektů +1)", n1 === n0 + 1);
check("lišta zmizela", !(await bar()));
await page.screenshot({ path: "out/u3_obj.png" });
await py(`print("H54 U3 AREAS", [[a.type for a in w.screen.areas] for w in bpy.context.window_manager.windows])`); await wait(1500);
// 2) dva obrázky přes Image ▸ Open
await py(CTX + `print('H54 U3 invoke', _v3d(lambda: bpy.ops.image.open('INVOKE_DEFAULT')))`);
await wait(4000);
check("lišta po Image Open", await bar());
const p1 = png(32, 32), p2 = png(48, 48);
await page.setInputFiles("#import-input", [{ name: "a.png", mimeType: "image/png", buffer: p1 }, { name: "b.png", mimeType: "image/png", buffer: p2 }, { name: "kůň č.png", mimeType: "image/png", buffer: p1 }]);
await wait(6000);
const im = await objs();
console.log("images:", im);
check("tři obrázky (vč. české diakritiky a mezery) načtené a zabalené", /a\.png/.test(im) && /b\.png/.test(im) && /kůň č\.png/.test(im) && /\[True, True, True, False, False\]/.test(im));
check("lišta zmizela (obrázky)", !(await bar()));
await page.screenshot({ path: "out/u3_img.png" });
console.log((fails ? "FAIL" : "PASS") + " u3 direct import fails=" + fails);
await browser.close();
process.exit(fails ? 1 : 0);
