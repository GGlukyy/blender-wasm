// Dotyk + Pencil: CDP Input.dispatchTouchEvent / dispatchMouseEvent(pointerType pen) -> pohled/výběr se musí změnit.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys
def probe():
    scr = bpy.context.window_manager.windows[0].screen
    ob = bpy.context.view_layer.objects.active
    for a in scr.areas:
        if a.type == 'VIEW_3D':
            r = a.spaces[0].region_3d
            q = r.view_rotation; l = r.view_location
            print('TPROBE rot=%.4f,%.4f,%.4f,%.4f dist=%.4f loc=%.3f,%.3f,%.3f mode=%s sel=%d ox=%.3f' % (q.w, q.x, q.y, q.z, r.view_distance, l.x, l.y, l.z, ob.mode if ob else '-', 1 if (ob and ob.select_get()) else 0, ob.location.x if ob else 0)); sys.stdout.flush()
    return 0.3
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
let last = "";
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("TPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y, id = 0) => ({ x: box.x + x, y: box.y + y, id, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
const parse = (s) => { const m = s.match(/rot=([-\d.,]+) dist=([-\d.]+) loc=([-\d.,]+) mode=(\S+) sel=(\d) ox=([-\d.]+)/); return m ? { rot: m[1].split(",").map(Number), dist: +m[2], loc: m[3].split(",").map(Number), mode: m[4], sel: +m[5], ox: +m[6] } : null; };
const state = async () => { await wait(1000); return parse(last); };
const diff = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
let fail = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`); if (!ok) fail++; };

let s0 = await state();
// 1) jeden prst: tah doprava -> orbit
await touch("touchStart", [P(500, 400)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(500 + i * 8, 400 + i * 2)]); await wait(16); }
await touch("touchEnd", []); let s1 = await state();
check("1 prst = orbit", diff(s0.rot, s1.rot) > 0.05, `rot Δ=${diff(s0.rot, s1.rot).toFixed(3)}`);
// 2) dva prsty: roztažení = zoom in (dist klesá)
await touch("touchStart", [P(500, 400, 1), P(600, 400, 2)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(500 - i * 5, 400, 1), P(600 + i * 5, 400, 2)]); await wait(16); }
await touch("touchEnd", []); let s2 = await state();
check("pinch out = zoom in", s2.dist < s1.dist - 0.05, `dist ${s1.dist.toFixed(2)} -> ${s2.dist.toFixed(2)}`);
await page.keyboard.press("Home"); await wait(1200); s2 = await state();
// 3) dva prsty: stahování = zoom out
await touch("touchStart", [P(400, 400, 1), P(700, 400, 2)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(400 + i * 5, 400, 1), P(700 - i * 5, 400, 2)]); await wait(16); }
await touch("touchEnd", []); let s3 = await state();
check("pinch in = zoom out", s3.dist > s2.dist + 0.05, `dist ${s2.dist.toFixed(2)} -> ${s3.dist.toFixed(2)}`);
await page.keyboard.press("Home"); await wait(1200); s3 = await state();
// 4) dva prsty rovnoběžně = pan (view_location se změní)
await touch("touchStart", [P(500, 400, 1), P(560, 400, 2)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(500 + i * 6, 400 + i * 3, 1), P(560 + i * 6, 400 + i * 3, 2)]); await wait(16); }
await touch("touchEnd", []); let s4 = await state();
check("2 prsty = pan", diff(s3.loc, s4.loc) > 0.05, `loc Δ=${diff(s3.loc, s4.loc).toFixed(3)}`);
// 5) tlačítko Tab na liště -> edit mode
await page.keyboard.press("Tab"); await wait(1500); const sd = await state(); console.log("DEBUG real Tab -> " + (sd && sd.mode)); await page.keyboard.press("Tab"); await wait(1500);
await page.locator("#touchbar button", { hasText: /^Tab$/ }).click(); await wait(2500); let s5 = await state();
check("lišta: Tab -> EDIT", s5.mode === "EDIT", s5.mode);
await page.locator("#touchbar button", { hasText: /^Tab$/ }).click(); await state();
// 6) tap = výběr: odznač (Alt+A), pak tap doprostřed kostky
await page.keyboard.press("Home"); await wait(1500); await page.mouse.move(box.x + 430, box.y + 400);
await page.keyboard.down("Alt"); await page.keyboard.press("a"); await page.keyboard.up("Alt"); let s6 = await state();
console.log("DEBUG touch state before tap " + JSON.stringify(await page.evaluate(() => window.__touchDebug())));
await touch("touchStart", [P(430, 400)]); await wait(80); await touch("touchEnd", []); let s7 = await state(); await page.screenshot({ path: "out/touch_tap.png" });
check("tap = výběr", s6.sel === 0 && s7.sel === 1, `sel ${s6.sel} -> ${s7.sel}`);
// 7) Pencil: tah (pointerType pen) přes kostku = box select (odznač nejdřív)
await page.keyboard.down("Alt"); await page.keyboard.press("a"); await page.keyboard.up("Alt"); const sPre = await state();
const pen = (type, x, y, buttons) => cdp.send("Input.dispatchMouseEvent", { type, x: box.x + x, y: box.y + y, button: type === "mouseMoved" && !buttons ? "none" : "left", buttons, pointerType: "pen", clickCount: type === "mouseMoved" ? 0 : 1 });
await pen("mouseMoved", 340, 300, 0); await pen("mousePressed", 340, 300, 1);
for (let i = 1; i <= 15; i++) { await pen("mouseMoved", 340 + i * 12, 300 + i * 10, 1); await wait(16); }
await pen("mouseReleased", 520, 450, 0); let s8 = await state();
check("Pencil tah = box select", sPre.sel === 0 && s8.sel === 1, `sel ${sPre.sel} -> ${s8.sel}`);
// 8) UI oblast: 1 prst táhne číselné pole (Location X v Properties) = mění hodnotu, NEorbituje
await page.keyboard.press("Escape"); await wait(500);
let s9 = await state();
await touch("touchStart", [P(1305, 318)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(1305 + i * 4, 318)]); await wait(16); }
await touch("touchEnd", []); let s10 = await state();
check("UI: 1 prst na poli = změna hodnoty", Math.abs(s10.ox - s9.ox) > 0.01 && diff(s9.rot, s10.rot) < 0.001, `ox ${s9.ox} -> ${s10.ox}, rot Δ=${diff(s9.rot, s10.rot).toFixed(4)}`);
// 9) UI oblast: 1 prst na prázdném místě panelu neotáčí pohled
await touch("touchStart", [P(1290, 760)]);
for (let i = 1; i <= 20; i++) { await touch("touchMove", [P(1290 - i * 3, 760 - i * 5)]); await wait(16); }
await touch("touchEnd", []); let s11 = await state();
check("UI: tah v panelu neotáčí viewport", diff(s10.rot, s11.rot) < 0.001, `rot Δ=${diff(s10.rot, s11.rot).toFixed(4)}`);
// 10) iOS soft keyboard: keydown s prázdným code (jen key) musí fungovat -> "Tab" přepne do edit módu
await page.mouse.move(box.x + 430, box.y + 400); await wait(300); await page.keyboard.press("Escape"); await wait(500);
let k0 = await state();
await page.evaluate(() => { for (const t of ["keydown", "keyup"]) window.dispatchEvent(new KeyboardEvent(t, { key: "Tab", code: "", bubbles: true, cancelable: true })); });
let k1 = await state();
check("soft klávesnice: key bez code (Tab)", k0.mode !== k1.mode, `${k0.mode} -> ${k1.mode}`);
await page.keyboard.press("Tab"); await state();
check("codeFromKey mapování", await page.evaluate(() => [window.__touchCodeFromKey("g"), window.__touchCodeFromKey("5"), window.__touchCodeFromKey(" "), window.__touchCodeFromKey("Backspace")].join()) === "KeyG,Digit5,Space,Backspace");
console.log(fail === 0 ? "ALL PASS" : `FAILED ${fail}`);
await page.screenshot({ path: "out/touch_end.png" });
await browser.close();
