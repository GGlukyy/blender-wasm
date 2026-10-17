// Interaktivní modelovací nástroje skutečnými klávesami/myší (web Blender, Windows Chrome).
// Python timer vypisuje stav (mód, v/e/f, poloha objektu); scénáře mají očekávané počty z desktop Blenderu.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, bmesh, sys
def probe():
    ob = bpy.context.view_layer.objects.active
    if ob and ob.type == 'MESH':
        if ob.mode == 'EDIT':
            bm = bmesh.from_edit_mesh(ob.data); c = (len(bm.verts), len(bm.edges), len(bm.faces))
        else:
            c = (len(ob.data.vertices), len(ob.data.edges), len(ob.data.polygons))
        print('IPROBE %s %d %d %d loc=%.2f,%.2f,%.2f nobj=%d' % (ob.mode, c[0], c[1], c[2], ob.location.x, ob.location.y, ob.location.z, len(bpy.context.scene.objects))); sys.stdout.flush()
    return 0.4
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = "", errors = 0;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("IPROBE"); if (i >= 0) last = t.slice(i + 7); else if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("CONSOLE-ERR " + t.slice(0, 160)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 160)); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000);
await page.keyboard.press("Escape"); await wait(800);
const box = await page.locator("#canvas").boundingBox();
const at = (x, y) => page.mouse.move(box.x + x, box.y + y, { steps: 4 });
const key = async (k, ms = 400) => { await page.keyboard.press(k); await wait(ms); };
const type = async (t) => { await page.keyboard.type(t, { delay: 60 }); await wait(400); };
const state = async () => { await wait(1200); return last; };
const num = (s) => { const m = s.match(/(\w+) (\d+) (\d+) (\d+) loc=([-\d.]+),([-\d.]+),([-\d.]+) nobj=(\d+)/); return m ? { mode: m[1], v: +m[2], e: +m[3], f: +m[4], loc: [+m[5], +m[6], +m[7]], nobj: +m[8] } : {}; };
let fail = 0;
const check = (name, ok, got) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${got}`); if (!ok) fail++; };
const reset = async () => {   // zpět do čistého object módu s jednou kostkou
  await at(500, 400); await key("Escape"); const s = num(await state());
  if (s.mode === "EDIT") await key("Tab", 800);
  await key("a"); await key("x"); await key("Delete", 600);          // smaže vše
  await key("Shift+a", 600); await wait(300);
  await page.keyboard.press("Escape");
};
// Základ: kostka z úvodní scény, kurzor nad viewportem
await at(500, 400); let s = num(await state());
check("start: kostka", s.v === 8 && s.mode === "OBJECT", JSON.stringify(s));
// G x 2 Enter -> posun o 2 m v X
await key("g"); await type("x2"); await key("Enter", 800); s = num(await state());
check("G X 2 Enter (posun)", Math.abs(s.loc[0] - 2) < 0.01 || Math.abs(s.loc[0]) > 1.9, JSON.stringify(s.loc));
// R z 90 Enter, S 2 Enter jen nesmí spadnout
await key("r"); await type("z90"); await key("Enter", 600);
await key("s"); await type("2"); await key("Enter", 600); s = num(await state());
check("R Z 90 + S 2 bez pádu", s.mode === "OBJECT", JSON.stringify(s));
await key("Alt+g", 400); await key("Alt+r", 400); await key("Alt+s", 600);   // vyčisti transformaci
// Edit mode: Ctrl+B bevel hran, I inset, Ctrl+R loop cut
await key("Tab", 1500); s = num(await state()); check("Tab -> edit", s.mode === "EDIT", JSON.stringify(s));
await key("3"); await key("Alt+a", 600);
await key("a"); await key("e"); await wait(300); await at(560, 380); await key("Enter", 900); s = num(await state());
check("A + E (extrude vše)", s.v > 8, JSON.stringify(s));
await key("Control+z", 1200); s = num(await state()); check("Ctrl+Z po extrude", s.v === 8, JSON.stringify(s));
await key("1"); await key("a"); await key("Control+b", 600); await type("0.1"); await key("Enter", 900); s = num(await state());
check("Ctrl+B bevel (vrcholy)", s.v > 8, JSON.stringify(s));
await key("Control+z", 1200);
await key("2"); await key("a"); await key("Control+b", 600); await at(540, 380); await type("0.1"); await key("Enter", 900); s = num(await state());
check("Ctrl+B bevel (hrany) 24v", s.v === 24, JSON.stringify(s));
await key("Control+z", 1200);
// Ctrl+R loop cut: najet na svislou hranu vlevo, Ctrl+R, klik (potvrdí řez), klik/Enter (středová poloha)
await key("Alt+a", 400); await at(523, 392); await wait(600); await key("Control+r", 800); await at(524, 392); await wait(500);
await page.mouse.click(box.x + 524, box.y + 392); await wait(600); await key("Enter", 1200); s = num(await state());
check("Ctrl+R loop cut (12v)", s.v === 12 && s.f === 10, JSON.stringify(s));
await key("Control+z", 1200);
await key("a"); await key("Alt+m", 600); await key("c", 600); s = num(await state());   // Merge menu -> At Center? (menu); jen nesmí spadnout
await key("Escape", 400);
await key("Tab", 1200); await key("Escape");
// Shift+D duplikát (a Escape = zůstane duplikát na místě) -> 2 objekty
await key("Shift+d", 600); await key("Escape", 800); s = num(await state());
check("Shift+D (duplikát)", s.nobj === 4, "nobj=" + s.nobj);   // kostka + kamera + světlo + dup
console.log(`ERRORS_IN_CONSOLE ${errors}`);
console.log(fail === 0 && errors === 0 ? "ALL PASS" : `FAILED ${fail} (+${errors} console errors)`);
await page.screenshot({ path: "out/interactive_end.png" });
await browser.close();
