// I1: Cmd(Meta)+Z = undo (metaKey -> Ctrl). node cmd_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, bmesh
def probe():
    try:
        ob = bpy.context.view_layer.objects.active
        nv = 0
        if ob and ob.mode == 'EDIT': nv = len(bmesh.from_edit_mesh(ob.data).verts)
        elif ob: nv = len(ob.data.vertices)
        print('BPROBE x=%.2f' % (ob.location.x if ob else -99)); sys.stdout.flush()
    except Exception as e: print('BPROBE ERR', e); sys.stdout.flush()
    return 0.4
bpy.app.timers.register(probe, first_interval=5.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let last = ""; let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("BPROBE"); if (i >= 0) last = t.slice(i + 7); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 400); await wait(300);
const g = async () => { await wait(1300); const m = last.match(/x=(-?[\d.]+)/); return m ? +m[1] : NaN; };
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
const x0 = await g();
await page.keyboard.press("g"); await page.keyboard.press("x"); await page.keyboard.type("2"); await page.keyboard.press("Enter");
const x1 = await g(); check("G X 2 posune", Math.abs(x1 - x0 - 2) < 0.01, `${x0} -> ${x1}`);
await page.keyboard.press("Meta+z");
const x2 = await g(); check("Cmd+Z vrátí zpět", Math.abs(x2 - x0) < 0.01, `${x2}`);
await page.keyboard.press("Meta+Shift+z");
const x3 = await g(); check("Cmd+Shift+Z redo", Math.abs(x3 - x1) < 0.01, `${x3}`);
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: cmd" : "FAIL: cmd " + fail);
await page.locator("#canvas").screenshot({ path: "out/cmd.png" });
await browser.close();
