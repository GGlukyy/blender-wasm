// I4a: QWERTZ — Ctrl + {key:'z', code:'KeyY'} (klávesa se Z na české klávesnici) = undo? node qwertz_test.mjs
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
page.on("console", (m) => { const t = m.text(); if (t.startsWith("KD2")) console.log(t); const i = t.indexOf("BPROBE"); if (i >= 0) last = t.slice(i + 7); });
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
const cdp = await page.context().newCDPSession(page);
const vk = (k) => k.toUpperCase().charCodeAt(0);
const cdpKey = async (code, key, mods) => { const o = { key, code, modifiers: mods, windowsVirtualKeyCode: vk(key), nativeVirtualKeyCode: vk(key) };
  const c = { key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17, nativeVirtualKeyCode: 17 };
  if (mods & 2) await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", modifiers: 2, ...c });
  await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...o }); await wait(60); await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...o });
  if (mods & 2) await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", ...c }); };
const kk = (type, code, key, ctrl) => page.evaluate(([t, c, k, ct]) => window.dispatchEvent(new KeyboardEvent(t, { code: c, key: k, bubbles: true, cancelable: true, ctrlKey: ct })), [type, code, key, ctrl]);
const chord = async (code, key) => { await kk("keydown", "ControlLeft", "Control", true); await kk("keydown", code, key, true); await wait(60); await kk("keyup", code, key, true); await kk("keyup", "ControlLeft", "Control", false); };
const move = async () => { await page.keyboard.press("g"); await page.keyboard.press("x"); await page.keyboard.type("2"); await page.keyboard.press("Enter"); };
const x0 = await g();
await move(); const x1 = await g(); check("G X 2 posune", Math.abs(x1 - x0 - 2) < 0.01, `${x0} -> ${x1}`);
await chord("KeyZ", "z"); const xa = await g(); console.log(`INFO US Ctrl+{code KeyZ,key z}: x ${x1} -> ${xa}`);
if (Math.abs(xa - x0) < 0.01) { await chord("KeyZ", "z"); /* nic k vracení */ }
await move(); const x2 = await g();
await page.evaluate(() => { window.addEventListener("keydown", (e) => console.log("KD2 trusted=" + e.isTrusted + " code=" + e.code + " key=" + e.key + " ctrl=" + e.ctrlKey), true); });
await cdpKey("KeyY", "z", 2); const xb = await g();
check("QWERTZ Ctrl + {code KeyY, key z} = undo", Math.abs(xb - (x2 - 2)) < 0.01, `x ${x2} -> ${xb}`);
console.log("errors", errs);
await browser.close(); process.exit(fail ? 1 : 0);
