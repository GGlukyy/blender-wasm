// Klepnutí do textového pole v Blenderu → vyskočí soft klávesnice (skrytý #kbd-input dostane focus); Esc ji skryje. node autokbd_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage(); let errs = 0;
page.on("pageerror", (e) => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
await page.goto("http://localhost:5173/?touch=1", { waitUntil: "load" });
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
const st = () => page.evaluate(() => ({ editing: window.__touchTextEditing && window.__touchTextEditing(), focus: document.activeElement && document.activeElement.id, hasFn: !!(window.Module && window.Module._blender_web_text_editing) }));
const s0 = await st(); check("export blender_web_text_editing je v buildu", s0.hasFn, JSON.stringify(s0));
check("na začátku se neupravuje", s0.editing === false);
// dvojklepnutí na název objektu ve vlastnostech (Object tab, pole „Cube“) = vstup do editace
await touch("touchStart", [P(1300, 255)]); await wait(70); await touch("touchEnd", []); await wait(150);
await touch("touchStart", [P(1300, 255)]); await wait(70); await touch("touchEnd", []); await wait(900);
await page.locator("#canvas").screenshot({ path: "out/autokbd_touch_mid.png" }); console.log("DIRECT", await page.evaluate(() => ({ t: typeof Module._blender_web_text_editing, v: Module._blender_web_text_editing && Module._blender_web_text_editing(), calledRun: Module.calledRun, ext: Object.keys(Module).filter(k => /text_edit/.test(k)) }))); const s1 = await st(); check("pole je v editaci", s1.editing === true, JSON.stringify(s1));
check("klávesnice (kbd-input) má focus", s1.focus === "kbd-input", JSON.stringify(s1));
await page.locator("#touchbar button", { hasText: /^Esc$/ }).click(); await wait(1200);
const s2 = await st(); check("po Esc se editace i klávesnice ukončí", s2.editing === false && s2.focus !== "kbd-input", JSON.stringify(s2));
await page.locator("#canvas").screenshot({ path: "out/autokbd.png" });
console.log("errors", errs);
console.log(fail === 0 && errs === 0 ? "PASS: autokbd" : "FAIL: autokbd " + fail);
await browser.close();
