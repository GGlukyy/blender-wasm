// H31: MP "se zasekne" a při pohybu myši se viewport střídá mezi ~4 obrázky. Měření: bez změny scény jen hýbat myší,
// po každém pohybu screenshot viewportu; počítá různé obrázky. Očekávání: po doběhnutí vzorků 1 obrázek.
const { chromium } = await import(process.env.PW || "playwright");
const W = +(process.env.VW || 1400), H = +(process.env.VH || 850), Q = (process.env.Q || "").replace(/"/g, "");
const expr = `import bpy, os, sys, json
def view():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': return a
def _cmd():
    if os.path.exists('/tmp/h31_cmd'):
        s = open('/tmp/h31_cmd').read(); os.remove('/tmp/h31_cmd')
        a = view(); sp = a.spaces[0]
        try:
            with bpy.context.temp_override(window=bpy.context.window_manager.windows[0], area=a, region=[r for r in a.regions if r.type == 'WINDOW'][0]):
                exec(s, {'bpy': bpy, 'a': a, 'sp': sp})
            print('H31R ok ' + s[:60])
        except Exception as e: print('H31R err ' + repr(e))
        sys.stdout.flush()
    return 0.1
def _rect():
    a = view(); r = [r for r in a.regions if r.type == 'WINDOW'][0]; W = bpy.context.window_manager.windows[0]
    print('H31V ' + json.dumps([r.x, W.height - r.y - r.height, r.width, r.height, W.width, W.height])); sys.stdout.flush()
    return None
bpy.app.timers.register(_cmd, first_interval=1.0); bpy.app.timers.register(_rect, first_interval=4.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", `--window-size=${W + 100},${H + 100}`] });
const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
let errors = 0, rect = null, frame = 0, gpuerr = 0; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("console", (m) => { const t = m.text(); let i, f;
  if ((i = t.indexOf("H31V ")) >= 0) rect = JSON.parse(t.slice(i + 5));
  if ((i = t.indexOf("H31R err")) >= 0) console.log(t.slice(i));
  if ((f = /WGPU_STATS frame=(\d+)/.exec(t))) frame = +f[1];
  if (/WGPU_UNCAPTURED|PIPE_INVALID/.test(t)) { gpuerr++; if (gpuerr < 6) console.log("GPUERR " + t.slice(0, 180)); }
  if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
for (let i = 0; i < 120 && !rect; i++) await wait(1000);
await wait(5000); await page.keyboard.press("Escape"); await wait(800);
if (!rect) { console.log("FAIL: bez H31V"); await browser.close(); process.exit(1); }
const box = await page.locator("#canvas").boundingBox(); const sx = box.width / rect[4], sy = box.height / rect[5];
/* Střed viewportu bez hlavičky a navigačního gizma; css px. */
const clip = { x: Math.round(box.x + (rect[0] + rect[2] * 0.08) * sx), y: Math.round(box.y + (rect[1] + rect[3] * 0.12) * sy), width: Math.round(rect[2] * 0.72 * sx), height: Math.round(rect[3] * 0.78 * sy) };
const py = async (s) => { await page.evaluate((c) => Module.FS.writeFile("/tmp/h31_cmd", c), s); await wait(400); };
await page.evaluate(() => { window.__h31 = []; window.__h31cmp = async (b64) => {
  const r = await fetch("data:image/png;base64," + b64); const bm = await createImageBitmap(await r.blob());
  const c = new OffscreenCanvas(bm.width, bm.height), x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, bm.width, bm.height).data;
  let best = -1, bestN = 1e12; for (let k = 0; k < __h31.length; k++) { const o = __h31[k]; let n = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - o[i]) > 6 || Math.abs(d[i + 1] - o[i + 1]) > 6 || Math.abs(d[i + 2] - o[i + 2]) > 6) n++; if (n < bestN) { bestN = n; best = k; } }
  const tot = bm.width * bm.height; if (best >= 0 && bestN < tot * 0.0005) return { cls: best, diff: bestN };
  __h31.push(d); return { cls: __h31.length - 1, diff: best >= 0 ? bestN : 0, isNew: true }; }; });
let fail = 0, tag = "";
/* Pohyby: po viewportu, a každý 5. přes hlavičku/outliner a zpět (vstup/výstup z oblasti překresluje). */
const hover = async (name, n = 20) => {
  await page.evaluate(() => { window.__h31 = []; });
  const seq = []; const f0 = frame; let shots = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n; const px = clip.x + clip.width * (0.15 + 0.7 * ((i * 7 % n) / n)), py2 = clip.y + clip.height * (0.15 + 0.7 * t);
    if (i % 5 === 4) { await page.mouse.move(box.x + (rect[0] + rect[2] / 2) * sx, box.y + (rect[1] - 12) * sy, { steps: 2 }); await wait(120); }
    await page.mouse.move(px, py2, { steps: 3 }); await wait(220);
    const b = await page.screenshot({ clip }); const r = await page.evaluate((s) => window.__h31cmp(s), b.toString("base64"));
    seq.push(r.cls); if (r.isNew && r.cls > 0) { shots++; await page.screenshot({ path: `out/h31_${name}_c${r.cls}.png` }); }
  }
  const nc = Math.max(...seq) + 1; const flips = seq.slice(1).filter((v, i) => v !== seq[i]).length;
  console.log(`${nc === 1 ? "PASS" : "FAIL"} ${name}: různých obrázků=${nc} přepnutí=${flips} seq=${seq.join("")} frames=${frame - f0}`);
  if (nc !== 1) { fail++; await page.screenshot({ path: `out/h31_${name}_end.png` }); }
};
const shade = async (t, ms) => { await py(`sp.shading.type='${t}'`); await wait(ms); };
await page.mouse.move(clip.x + 50, clip.y + 50);
if (process.env.SCEN === "tab") {
  /* Přepnutí karty a dlouhé čekání (telemetrie Lukáše 6.11.: hidden/visible v obou relacích). Screenshot celé stránky navíc přes CDP z vykresleného povrchu. */
  await shade("MATERIAL", 15000); await hover("t_mp", 12);
  for (const [n, ms] of [["t_tab8s", 8000], ["t_tab40s", 40000]]) { const p2 = await page.context().newPage(); await p2.goto("about:blank"); await p2.bringToFront(); await wait(ms); await p2.close(); await page.bringToFront(); await wait(1500); await hover(n, 12); }
  await wait(60000); await hover("t_idle60s", 12);
  const cx = clip.x + clip.width / 2, cy = clip.y + clip.height / 2;
  for (let k = 0; k < 4; k++) { await page.mouse.move(cx, cy); await page.mouse.down({ button: "middle" }); for (let i = 0; i < 25; i++) { await page.mouse.move(cx + i * 8, cy + i * 3); await wait(16); } await page.mouse.up({ button: "middle" }); const p2 = await page.context().newPage(); await p2.bringToFront(); await wait(3000); await p2.close(); await page.bringToFront(); await wait(9000); await hover("t_orbit_tab" + k, 10); }
  console.log(`RESULT fail=${fail} errors=${errors} gpuerr=${gpuerr} frame=${frame}`); await browser.close(); process.exit(fail === 0 && errors === 0 ? 0 : 1);
}
if (process.env.SCEN === "mimic") {
  /* Lukášovy akce z telemetrie 6.11.: MP, MMB orbit, klik, G/R + pravý klik, I, Ctrl+Z, mezerník; po každém kole doběhnout a jen hýbat. */
  await py(`bpy.ops.mesh.primitive_monkey_add(location=(2.5,0,0)); m=bpy.context.object.modifiers.new('s','SUBSURF'); m.levels=2; bpy.ops.mesh.primitive_uv_sphere_add(location=(-2.5,0,0)); mt=bpy.data.materials.new('M'); bpy.context.object.data.materials.append(mt)`); await wait(1500);
  const cx = clip.x + clip.width / 2, cy = clip.y + clip.height / 2; let rnd = 12345; const R = (n) => (rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) % n;
  await shade("MATERIAL", 12000); await hover("m_start", 8);
  for (let k = 0; k < 7; k++) {
    for (let a = 0; a < 14; a++) { const x = clip.x + 80 + R(clip.width - 160), y = clip.y + 80 + R(clip.height - 160); const o = R(7);
      if (o === 0) { await page.mouse.move(x, y); await page.mouse.down({ button: "middle" }); for (let i = 0; i < 10; i++) { await page.mouse.move(x + i * 7, y + i * 2); await wait(16); } await page.mouse.up({ button: "middle" }); }
      else if (o === 1) await page.mouse.click(x, y);
      else if (o === 2 || o === 3) { await page.mouse.move(x, y); await page.keyboard.press(o === 2 ? "g" : "r"); for (let i = 0; i < 6; i++) { await page.mouse.move(x + i * 8, y - i * 3); await wait(16); } await page.mouse.click(x + 40, y - 15, { button: R(2) ? "right" : "left" }); }
      else if (o === 4) { await page.mouse.move(x, y); await page.keyboard.press("Control+z"); }
      else if (o === 5) { await page.mouse.move(x, y); await wait(40); }
      else if (k % 3 === 0) await shade(["SOLID", "MATERIAL", "RENDERED", "WIREFRAME"][R(4)], 400);
      await wait(R(2) ? 30 : 250); }
    await shade("MATERIAL", 12000); await hover("m_k" + k, 8);
  }
  console.log(`RESULT fail=${fail} errors=${errors} gpuerr=${gpuerr} frame=${frame}`); await browser.close(); process.exit(fail === 0 && errors === 0 ? 0 : 1);
}
await shade("SOLID", 2000); await hover("solid");
await shade("MATERIAL", 15000); await hover("mp");
await shade("RENDERED", 15000); await hover("rendered");
await shade("WIREFRAME", 2000); await hover("wire");
await shade("MATERIAL", 12000); await hover("mp2");
/* Orbit a změny v MP; po každé změně doběhnout a hýbat. */
const cx = clip.x + clip.width / 2, cy = clip.y + clip.height / 2;
for (let k = 0; k < 3; k++) {
  await page.mouse.move(cx, cy); await page.mouse.down({ button: "middle" }); for (let i = 0; i < 12; i++) { await page.mouse.move(cx + i * 12, cy + i * 4); await wait(30); } await page.mouse.up({ button: "middle" });
  await wait(10000); await hover("mp_orbit" + k, 12);
}
await page.mouse.move(cx, cy); await page.mouse.click(cx, cy); await wait(800); await page.keyboard.press("g"); for (let i = 0; i < 10; i++) { await page.mouse.move(cx + i * 6, cy - i * 3); await wait(40); } await page.mouse.click(cx + 60, cy - 30);
await wait(10000); await hover("mp_grab", 12);
for (const t of ["SOLID", "MATERIAL", "RENDERED", "WIREFRAME", "MATERIAL", "SOLID", "MATERIAL"]) await shade(t, 1500);
await wait(12000); await hover("mp_fastswitch");
/* Kontrola citlivosti: posun objektu mezi snímky MUSÍ být vidět jako nový obrázek, jinak test nic neměří. */
{ const b0 = await page.screenshot({ clip }); await page.evaluate(() => { window.__h31 = []; }); await page.evaluate((x) => window.__h31cmp(x), b0.toString("base64"));
  await py("o=bpy.data.objects['Cube']; o.location.x += 0.4"); await wait(10000); const b1 = await page.screenshot({ clip }); const r = await page.evaluate((x) => window.__h31cmp(x), b1.toString("base64"));
  console.log(`${r.cls > 0 ? "PASS" : "FAIL"} kontrola: posun objektu změnil ${r.diff} px`); if (!(r.cls > 0)) fail++; }
console.log(`RESULT fail=${fail} errors=${errors} gpuerr=${gpuerr} frame=${frame}`);
await browser.close();
process.exit(fail === 0 && errors === 0 ? 0 : 1);
