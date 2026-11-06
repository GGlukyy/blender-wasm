// H30: Snap + Proportional "se zapnou samy" po startu v nové kartě a přepnutí na Material Preview. Loguje tool_settings (změny) a všechny klávesy, které jdou do Blenderu.
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, "");
const expr = `import bpy, sys, json
st = {'v': None}
def snap():
    ts = bpy.context.scene.tool_settings
    v = dict(snap=ts.use_snap, prop=ts.use_proportional_edit, prop_obj=ts.use_proportional_edit_objects, file=bpy.data.filepath, sc=bpy.context.scene.name)
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': v['shade'] = a.spaces[0].shading.type
    if v != st['v']:
        st['v'] = v; print('H30S ' + json.dumps(v)); sys.stdout.flush()
    return 0.1
def hdr():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r = [r for r in a.regions if r.type == 'HEADER'][0]
            print('H30H ' + json.dumps([r.x, r.y, r.width, r.height, bpy.context.window_manager.windows[0].height, bpy.context.preferences.system.ui_scale])); sys.stdout.flush()
bpy.app.timers.register(snap, first_interval=0.5, persistent=True); bpy.app.timers.register(lambda: hdr(), first_interval=4.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const log = []; let hdr = null, errors = 0, last = null; const wait = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("H30S ")) >= 0) { last = JSON.parse(t.slice(i + 5)); console.log("STATE " + t.slice(i + 5)); }
  if ((i = t.indexOf("H30H ")) >= 0) hdr = JSON.parse(t.slice(i + 5));
  if ((i = t.indexOf("H30K ")) >= 0) console.log(t.slice(i));
  if (/RESTORE_OFFER|AUTOSAVE|H30_STATE/.test(t)) console.log(t.slice(0, 120));
  if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; for (const ty of ["keydown", "keyup"]) window.addEventListener(ty, (ev) => console.log(`H30K ${ty} code=${ev.code} key=${ev.key} s=${+ev.shiftKey} c=${+ev.ctrlKey} a=${+ev.altKey} trusted=${ev.isTrusted}`), true); }, expr);
await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
for (let i = 0; i < 90 && !hdr; i++) await wait(1000);
await wait(4000);
if (process.env.SCEN === "reload") {
  /* Druhý start ve stejném profilu: autosave (OPFS) + nabídka obnovení. První běh má SNAP=1 zapnutý (Shift+Tab, O), scéna změněná. */
  await page.keyboard.press("Escape"); await wait(600);
  const b0 = await page.locator("#canvas").boundingBox(); await page.mouse.move(b0.x + 600, b0.y + 400); await wait(300);
  if (process.env.SNAPON) { await page.keyboard.press("Shift+Tab"); await wait(500); await page.keyboard.press("o"); await wait(500); console.log("zapnuto ručně:", JSON.stringify(last)); }
  await page.keyboard.press("g"); await page.mouse.move(b0.x + 650, b0.y + 380, { steps: 4 }); await page.mouse.click(b0.x + 650, b0.y + 380); await wait(9000);
  last = null; hdr = null; console.log("--- reload ---");
  await page.reload({ waitUntil: "load" }); await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
  for (let i = 0; i < 90 && !hdr; i++) await wait(1000);
  await wait(6000); await page.screenshot({ path: "out/h30_reload.png" });
  if (process.env.SNAPON === "restore") { /* Splash zavřít, pak File ▸ Obnovit poslední práci (autosave) přes popup / open_mainfile jako uživatel. */
    await page.keyboard.press("Escape"); await wait(800); await page.evaluate(() => Module.FS.writeFile("/tmp/open_req.txt", "/opfs/home/_autosave_prev.blend")); await wait(6000); console.log("po obnově:", JSON.stringify(last)); await page.screenshot({ path: "out/h30_restored.png" }); }
}
const s0 = last; console.log("po startu:", JSON.stringify(s0));
const box = await page.locator("#canvas").boundingBox();
/* Skutečný klik na ikonu MP v hlavičce. Pořadí zprava: šipka, Rendered, MP, Solid, Wire. */
const hy = box.y + hdr[4] - hdr[1] - hdr[3] / 2, right = box.x + hdr[0] + hdr[2];
let clicked = false;
for (const off of [64, 72, 80, 88, 56, 96, 48, 104]) {
  await page.mouse.move(right - off, hy); await wait(350); await page.mouse.click(right - off, hy); await wait(1500);
  console.log(`klik x=right-${off}: shade=${last.shade}`);
  if (last.shade === "MATERIAL") { clicked = true; break; }
}
await page.screenshot({ path: "out/h30_mp.png" }); await wait(8000);
const s1 = last; const moved = await (async () => { await page.mouse.move(box.x + 500, box.y + 400, { steps: 6 }); await wait(1000); return last; })();
console.log(`${clicked ? "PASS" : "FAIL"} klik přepnul na MP`);
const bad = (s) => s.snap || s.prop || s.prop_obj; console.log(`${!bad(s0) && !bad(moved) ? "PASS" : "FAIL"} snap/proportional po startu=${!!bad(s0)} po MP=${!!bad(moved)}`);
console.log(`RESULT clicked=${clicked} bad=${!!(bad(s0) || bad(moved))} errors=${errors}`);
await browser.close();
process.exit(clicked && !bad(s0) && !bad(moved) && !errors ? 0 : 1);
