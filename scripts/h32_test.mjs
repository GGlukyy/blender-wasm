// H32: ztracený mouseup. Stisk na MP v hlavičce, uvolnění mimo canvas / bez mouseup / blur, pak vodorovný pohyb bez tlačítka.
// Bez opravy zůstane Blender v drag-toggle a přepíná hlavičku. CASES=overlay,nomouseup,blur,hold (hold = záměrný drag-toggle dál funguje).
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, "");
const CASES = (process.env.CASES || "overlay,nomouseup,blur,hold").split(",");
const expr = `import bpy, sys, json
st = {'v': None}
def snap():
    ts = bpy.context.scene.tool_settings
    v = dict(snap=ts.use_snap, prop=ts.use_proportional_edit, prop_obj=ts.use_proportional_edit_objects)
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            v['shade'] = a.spaces[0].shading.type; v['xray'] = a.spaces[0].shading.show_xray; v['ovl'] = a.spaces[0].overlay.show_overlays; v['giz'] = a.spaces[0].show_gizmo
    if v != st['v']:
        st['v'] = v; print('H32S ' + json.dumps(v)); sys.stdout.flush()
    return 0.1
def hdr():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r = [r for r in a.regions if r.type == 'HEADER'][0]
            print('H32H ' + json.dumps([r.x, r.y, r.width, r.height, bpy.context.window_manager.windows[0].height])); sys.stdout.flush()
bpy.app.timers.register(snap, first_interval=0.5, persistent=True); bpy.app.timers.register(lambda: hdr(), first_interval=4.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let last = null, hdr = null, errors = 0, fails = 0; const rel = [];
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("H32S ")) >= 0) last = JSON.parse(t.slice(i + 5));
  if ((i = t.indexOf("H32H ")) >= 0) hdr = JSON.parse(t.slice(i + 5));
  if ((i = t.indexOf("H32_RELEASE")) >= 0) { rel.push(t.slice(i)); console.log(t.slice(i)); }
  if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
for (let i = 0; i < 90 && !hdr; i++) await wait(1000);
await wait(4000); await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const hy = box.y + hdr[4] - hdr[1] - hdr[3] / 2, right = box.x + hdr[0] + hdr[2];
/* Najít ikonu Wireframe: kliknout postupně zprava, dokud se shading nepřepne (pořadí zprava: šipka, Rendered, MP, Solid, Wire). */
let xWire = 0;
for (let off = 44; off < 170 && !xWire; off += 8) {
  await page.mouse.move(right - off, hy); await wait(250); await page.mouse.click(right - off, hy); await wait(900);
  if (last.shade === "WIREFRAME") xWire = right - off;
}
console.log("xWire", xWire, JSON.stringify(last));
if (!xWire) { console.log("FAIL ikona Wireframe nenalezena"); await browser.close(); process.exit(1); }
const xSolid = xWire + 18, canvasY = box.y + 400;
const reset = async () => { /* klik na Solid + zpět vypnout, cokoli se přepnulo */
  await page.mouse.move(box.x + 700, canvasY); await wait(300); await page.mouse.click(box.x + 700, canvasY); await wait(600); await page.mouse.move(xSolid, hy); await wait(400); await page.mouse.click(xSolid, hy); await wait(900);
  await page.evaluate(() => 0); };
const sweep = async () => { /* volný pohyb bez tlačítka přes celou šířku v úrovni viewportu i hlavičky */
  for (const [x, y] of [[box.x + 200, canvasY], [box.x + 1200, canvasY], [box.x + 200, canvasY], [right - 40, hy], [box.x + 300, hy]]) { await page.mouse.move(x, y, { steps: 25 }); await wait(250); }
  await wait(1200); };
const cdp = await ctx.newCDPSession(page);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
for (const c of CASES) {
  await reset(); const s0 = { ...last }; rel.length = 0;
  await page.mouse.move(xWire, hy); await wait(500);
  if (c === "overlay") { /* skutečné (trusted) uvolnění nad jiným prvkem, canvas ho nevidí */
    await page.mouse.down(); await wait(120);
    await page.evaluate(() => { const d = document.createElement("div"); d.id = "h32ov"; d.style.cssText = "position:fixed;inset:0;z-index:100000"; document.body.append(d); });
    await wait(60); await page.mouse.up(); await wait(60);
    await page.evaluate(() => document.getElementById("h32ov").remove());
  } else if (c === "nomouseup") { /* mouseup vůbec nepřijde, další pohyb hlásí buttons=0 */
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: xWire, y: hy, button: "left", buttons: 1, clickCount: 1 }); await wait(150);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: xWire + 1, y: hy, button: "none", buttons: 0 }); await wait(60);
  } else if (c === "blur") { /* přepnutí okna během stisku, uvolnění nikdy nepřijde */
    await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: xWire, y: hy, button: "left", buttons: 1, clickCount: 1 }); await wait(150);
    await page.evaluate(() => window.dispatchEvent(new Event("blur"))); await wait(100);
    if (!rel.some((r) => r.includes("why=blur"))) { fails++; console.log("FAIL blur: po blur žádné uvolnění"); }
  }
  if (c === "hold") { /* záměrný drag-toggle: držet a táhnout přes shading řádek */
    await page.mouse.down(); await wait(120); await page.mouse.move(xSolid + 18, hy, { steps: 10 }); await wait(1200);
    const during = { ...last }; await page.mouse.up(); await wait(500); const after = { ...last };
    await page.mouse.move(box.x + 200, canvasY, { steps: 20 }); await page.mouse.move(box.x + 1200, canvasY, { steps: 20 }); await wait(1000);
    const ok = during.shade !== "WIREFRAME" && same(after, last) && rel.length === 0; if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"} hold: drag-toggle během držení shade=${during.shade}, po uvolnění se nic nepřepíná (${JSON.stringify(last)}), syntetických uvolnění ${rel.length}`);
    continue;
  }
  await wait(700);
  const s1 = { ...last }; await sweep(); const s2 = { ...last };
  await page.screenshot({ path: `out/h32_${c}.png` });
  const ok = same(s1, s2) && s1.shade === "WIREFRAME"; if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${c}: před ${JSON.stringify(s1)} po pohybu ${JSON.stringify(s2)}; syntetická uvolnění ${rel.length}`);
  if (!ok) { await page.mouse.move(box.x + 700, canvasY); await page.mouse.down(); await wait(100); await page.mouse.up(); await wait(800); /* konec drag-toggle */
    await page.evaluate(`0`); console.log("  obnova:", JSON.stringify(last)); await page.keyboard.press("Escape"); await wait(300); }
}
console.log(`RESULT fails=${fails} errors=${errors}`);
await browser.close();
process.exit(fails || errors ? 1 : 0);
