// Druhá řada lišty (⋯): E, Space, H, I, ⌫… node bar_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, bmesh
def probe():
    try:
        ob = bpy.context.view_layer.objects.active
        nv = 0
        if ob and ob.mode == 'EDIT': nv = len(bmesh.from_edit_mesh(ob.data).verts)
        elif ob: nv = len(ob.data.vertices)
        print('BPROBE mode=%s nv=%d play=%d hide=%d anim=%d frame=%d' % (ob.mode if ob else '-', nv, 1 if bpy.context.screen.is_animation_playing else 0, 1 if (ob and ob.hide_get()) else 0, 1 if (ob and ob.animation_data and ob.animation_data.action) else 0, bpy.context.scene.frame_current)); sys.stdout.flush()
    except Exception as e: print('BPROBE ERR', e); sys.stdout.flush()
    return 0.4
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = ""; let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("BPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 400); await wait(300);
const g = async () => { await wait(1100); const m = last.match(/mode=(\S+) nv=(\d+) play=(\d) hide=(\d) anim=(\d) frame=(\d+)/); return m ? { mode: m[1], nv: +m[2], play: +m[3], hide: +m[4], anim: +m[5], frame: +m[6] } : {}; };
const tap = async (label) => { await page.locator("#touchbar button", { hasText: new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$") }).first().click(); await wait(250); await page.mouse.move(600, 400); };
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
await tap("⋯");
const s0 = await g();
await tap("I"); const s1 = await g(); check("I vloží klíč (object mode)", s1.anim === 1 && s0.anim === 0, JSON.stringify(s1));
await tap("Space"); await wait(1500); const s2 = await g(); check("Space spustí přehrávání", s2.play === 1 && s2.frame !== s0.frame, JSON.stringify(s2));
await tap("Space"); const s3 = await g(); check("Space zastaví", s3.play === 0, JSON.stringify(s3));
await tap("H"); const s4 = await g(); check("H skryje objekt", s4.hide === 1, JSON.stringify(s4));
await page.keyboard.press("Alt+h"); await wait(500); await page.keyboard.press("Escape");
await page.locator("#touchbar button", { hasText: /^Tab$/ }).click(); await wait(500);
await tap("3"); await tap("A");
const e0 = await g(); check("edit mode", e0.mode === "EDIT", JSON.stringify(e0));
await tap("E"); await wait(300); await page.mouse.move(650, 380, { steps: 5 }); await tap("Enter");
const e1 = await g(); check("E extrude", e1.nv > e0.nv, `${e0.nv} -> ${e1.nv}`);
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: bar" : "FAIL: bar " + fail);
await page.locator("#canvas").screenshot({ path: "out/bar_more.png" });
await browser.close();
