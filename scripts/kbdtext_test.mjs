// iPad soft klávesnice: znaky z dlouhého podržení (č, ř, ž) přijdou jen jako `input` (insertText) bez keydown.
// Obyčejná písmena přijdou jako keydown s prázdným `code` + input. Jméno objektu musí být celé a bez zdvojení. node kbdtext_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, "");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage(); let errs = 0, last = null;
page.on("console", (m) => { const t = m.text(), i = t.indexOf("KTN "); if (i >= 0) last = JSON.parse(t.slice(i + 4)); });
/* Python vypisuje jméno aktivního objektu každých 0,5 s */
await page.addInitScript(() => { window.__BARGS = ["--python-expr", "import bpy, json\ndef _kt():\n    o = bpy.context.view_layer.objects.active\n    print('KTN ' + json.dumps(o.name if o else None), flush=True)\n    return 0.5\nbpy.app.timers.register(_kt, first_interval=1.0, persistent=True)"]; });
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
await page.goto("http://localhost:5173/?touch=1" + (Q ? "&" + Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const cdp = await ctx.newCDPSession(page);
const box = await page.locator("#canvas").boundingBox();
const P = (x, y) => ({ x: box.x + x, y: box.y + y, id: 0, radiusX: 4, radiusY: 4, force: 1 });
const touch = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
let fail = 0; const check = (n, ok, x = "") => { console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`); if (!ok) fail++; };
/* dvojklep na pole se jménem objektu (Object tab) = editace, #kbd-input dostane focus (jako autokbd_test) */
await touch("touchStart", [P(1300, 255)]); await wait(70); await touch("touchEnd", []); await wait(150);
await touch("touchStart", [P(1300, 255)]); await wait(70); await touch("touchEnd", []); await wait(900);
const f = await page.evaluate(() => document.activeElement && document.activeElement.id);
check("klávesnice (kbd-input) má focus", f === "kbd-input", f);
/* smazat původní "Cube": Ctrl+A v Blenderu vybere text, Backspace */
const key = async (k, code = "", text) => { await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, text, unmodifiedText: text }); await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code }); await wait(90); };
await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Control", code: "ControlLeft", modifiers: 2 });
await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", modifiers: 2 }); await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", modifiers: 2 });
await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Control", code: "ControlLeft" }); await wait(200);
await key("Backspace", "Backspace"); await wait(200);
for (const c of "Kočička řež") {
  if (/[a-zA-Z ]/.test(c)) await key(c, "", c);            /* iOS: keydown s prázdným code + text -> input */
  else { await cdp.send("Input.insertText", { text: c }); await wait(90); } /* iOS dlouhé podržení: jen input */
}
await key("Enter", "Enter", "\r"); await wait(900);
await wait(1500); const n = last;
console.log("NAME " + JSON.stringify(n));
await page.screenshot({ path: "out/kbdtext.png" });
check("jméno = 'Kočička řež' (diakritika z input bez keydown, bez zdvojení)", n === "Kočička řež", JSON.stringify(n));
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: kbdtext" : "FAIL: kbdtext " + fail);
await browser.close();
