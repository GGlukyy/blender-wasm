// H54: obrázek ze zařízení (Add ▸ Image ▸ Reference, Image ▸ Open, drop) nesmí být růžový ani po uložení/otevření .blend.
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
page.on("console", (m) => { const t = m.text(); if (t.includes("H54")) { logs.push(t); console.log("LOG " + t.slice(0, 300)); } });
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
const b64 = png(256, 256).toString("base64");
await page.evaluate((b) => { const FS = Module.FS; try { FS.mkdir("/uploads"); } catch (_) {}
  FS.writeFile("/uploads/ref.png", Uint8Array.from(atob(b), c => c.charCodeAt(0))); }, b64);
const py = (code) => page.evaluate((c) => { Module.FS.writeFile("/tmp/h54_py.txt", c); }, code);
async function pink(tag) {
  await wait(2500);
  const buf = await page.screenshot({ path: `out/h54_${tag}.png` });
  return await page.evaluate(async (b) => { const bm = await createImageBitmap(await (await fetch("data:image/png;base64," + b)).blob());
    const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext("2d"); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, bm.width, bm.height).data;
    let p = 0, g = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 200 && d[i + 1] < 80 && d[i + 2] > 200) p++; if (d[i + 1] > 180 && d[i] < 120 && d[i + 2] < 140) g++; } return { pink: p, green: g }; }, buf.toString("base64"));
}
const CTX = `
def _v3d(fn):
    w = bpy.context.window_manager.windows[0]
    ar = [a for a in w.screen.areas if a.type == 'VIEW_3D'][0]
    with bpy.context.temp_override(window=w, area=ar, region=[r for r in ar.regions if r.type == 'WINDOW'][0]): return fn()
def _st(tag):
    im = bpy.data.images.get('ref.png')
    print('H54', tag, None if im is None else (im.filepath, im.size[:], im.has_data, im.packed_file is not None, im.source)); sys.stdout.flush()
`;
await py(CTX + `
print('H54 add', _v3d(lambda: bpy.ops.object.empty_image_add(filepath='/uploads/ref.png', align='VIEW')))
_st('after-add')`);
let r1 = await pink("add"); console.log("H54 add:", JSON.stringify(r1));
// cesta „po reloadu“: smaž soubor z /uploads (zařízení/MEMFS ztratilo), ulož do .blend a znovu otevři
await py(`
bpy.ops.wm.save_as_mainfile(filepath='/tmp/h54.blend'); _st('saved')`);
await wait(2000);
await page.evaluate(() => { try { Module.FS.unlink("/uploads/ref.png"); } catch (e) { console.log("H54 unlink fail " + e); } });
await py(`
bpy.ops.wm.open_mainfile(filepath='/tmp/h54.blend'); _st('reopened')`);
let r2 = await pink("reopen"); console.log("H54 reopen:", JSON.stringify(r2));
const ok = r1.pink < 200 && r1.green > 2000 && r2.pink < 200 && r2.green > 2000;
console.log((ok ? "PASS" : "FAIL") + " h54 pink=" + r1.pink + "/" + r2.pink + " green=" + r1.green + "/" + r2.green);
await browser.close();
process.exit(ok ? 0 : 1);
