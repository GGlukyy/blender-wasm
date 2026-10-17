// Modelovací nástroje přes skutečné UI (klávesy + myš): loop cut, inset, extrude, bevel, knife.
// Stav sítě čte Python timer (řádky "UIC mode v e f"). node uiops_test.mjs
import { writeFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const expr = `import bpy, bmesh, sys
def _t():
    try:
        ob = bpy.context.view_layer.objects.active
        if ob and ob.type == 'MESH':
            if ob.mode == 'EDIT':
                bm = bmesh.from_edit_mesh(ob.data); c = (len(bm.verts), len(bm.edges), len(bm.faces))
            else:
                c = (len(ob.data.vertices), len(ob.data.edges), len(ob.data.polygons))
            print('UIC', ob.mode, *c); sys.stdout.flush()
        else: print('UIC NOOBJ', len(bpy.data.objects)); sys.stdout.flush()
    except Exception as e: print('UIC ERR', e); sys.stdout.flush()
    return 0.7
bpy.app.timers.register(_t, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = null;
page.on("console", (m) => { const t = m.text(); if (/Traceback|Error|UIC/.test(t) && !/WGPU/.test(t)) console.log("LOG", t.slice(0, 200)); const i = t.indexOf("UIC "); if (i >= 0) last = t.slice(i + 4).trim().split(/\s+/); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(7000);
await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const C = { x: box.x + box.width * 0.4114, y: box.y + box.height * 0.4659 };  // střed kostky v čelním pohledu (výchozí layout)
const cur = async () => { await wait(1600); return last ? last.join(" ") : "none"; };
const shot = (n) => page.locator("#canvas").screenshot({ path: `out/uiops_${n}.png` });
let fails = 0;
const check = async (name, want) => { const g = await cur(); const ok = g === want; if (!ok) fails++; console.log(`UIOPS ${name} ${ok ? "PASS" : "FAIL"} got=${g} want=${want}`); };
await page.mouse.move(C.x, C.y); await wait(300);
await check("start", "OBJECT 8 12 6");
await page.keyboard.press("Numpad1"); await wait(500);
await page.mouse.click(C.x, C.y); await wait(300);
await page.keyboard.press("Tab"); await wait(500);
await page.keyboard.press("2"); await wait(300);   // edge mode
await check("edit", "EDIT 8 12 6");
await shot("1_edit");
// Loop cut: Ctrl+R, hover, klik (potvrdit řez), klik (potvrdit slide)
await page.keyboard.down("Control"); await page.keyboard.press("r"); await page.keyboard.up("Control"); await wait(500);
await page.mouse.move(C.x - 10, C.y - 8, { steps: 5 }); await wait(500);
await shot("2_loopcut_preview");
await page.mouse.click(C.x - 10, C.y - 8); await wait(600);
await page.mouse.click(C.x - 10, C.y - 8); await wait(600);
await check("loopcut", "EDIT 12 20 10");
await shot("3_loopcut");
// Undo
await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control");
await check("undo_loopcut", "EDIT 8 12 6");
// Inset na ploše: režim ploch, A, I, tah, klik
await page.keyboard.press("3"); await page.mouse.click(C.x, C.y); await wait(300);
await page.mouse.move(C.x + 5, C.y); await page.keyboard.press("i"); await page.mouse.move(C.x + 25, C.y, { steps: 5 }); await wait(300);
await page.mouse.click(C.x + 25, C.y); await wait(300);
await check("inset_face", "EDIT 12 20 10");
await shot("4_inset");
await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control");
// Extrude: E, tah, klik
await page.keyboard.press("e"); await page.mouse.move(C.x + 40, C.y - 20, { steps: 5 }); await wait(300);
await page.mouse.click(C.x + 40, C.y - 20); await wait(300);
await check("extrude_face", "EDIT 12 20 10");
await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control");
// Bevel hran: režim hran, A, Ctrl+B, tah, klik
await page.keyboard.press("2"); await page.keyboard.press("a"); await page.mouse.move(C.x + 3, C.y); await wait(300);
await page.keyboard.down("Control"); await page.keyboard.press("b"); await page.keyboard.up("Control");
await page.mouse.move(C.x + 30, C.y, { steps: 8 }); await wait(300); await page.mouse.click(C.x + 30, C.y); await wait(300);
await check("bevel_all", "EDIT 24 48 26");
await shot("5_bevel");
await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control"); await wait(300);
// Knife: K, klik začátek, klik konec, Enter
await page.mouse.move(C.x - 60, C.y + 5); await page.keyboard.press("k"); await wait(400);
await page.mouse.click(C.x - 60, C.y + 5); await wait(200);
await page.mouse.move(C.x, C.y + 5, { steps: 6 }); await page.mouse.move(C.x + 60, C.y + 5, { steps: 6 }); await wait(300);
await page.mouse.click(C.x + 60, C.y + 5); await wait(300);
await shot("6_knife");
await page.keyboard.press("Enter"); await wait(300);
await check("knife", "EDIT 10 15 7");
const undo = async () => { await page.keyboard.down("Control"); await page.keyboard.press("z"); await page.keyboard.up("Control"); await wait(400); };
await undo();
await check("undo_knife", "EDIT 8 12 6");
// Shift+D duplikát, Esc zruší přesun (kopie zůstane)
await page.mouse.move(C.x + 3, C.y); await page.keyboard.press("a"); await wait(200);
await page.keyboard.down("Shift"); await page.keyboard.press("d"); await page.keyboard.up("Shift"); await wait(300);
await page.keyboard.press("Escape"); await wait(300);
await check("duplicate_shift_d", "EDIT 16 24 12");
await undo(); await undo();
// Merge: vertex mód, A, M, At Center
await page.keyboard.press("1"); await page.keyboard.press("a"); await wait(200);
await page.keyboard.press("m"); await wait(400); await shot("7_merge_menu");
await page.keyboard.press("c"); await wait(300);
await check("merge_center", "EDIT 1 0 0");
await undo();
// Delete: X, menu Vertices
await page.keyboard.press("a"); await page.keyboard.press("x"); await wait(400); await shot("8_delete_menu");
await page.keyboard.press("v"); await wait(300);
await check("delete_vertices", "EDIT 0 0 0");
await undo();
// Tab zpět do objektů a ven
await page.keyboard.press("Tab"); await wait(500);
await check("back_object", "OBJECT 8 12 6");
console.log(fails ? `FAIL: ${fails}` : "PASS: uiops");
await browser.close();
