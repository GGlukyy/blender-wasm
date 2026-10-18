// UI fuzz: náhodné klávesy + myš ve viewportu (pevný seed). Hledá pád wasm / zamrzlý render loop / PAGEERROR. node ui_fuzz_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
let seed = +(process.env.FUZZ_SEED || 1); const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SECS = +(process.env.FUZZ_SECS || 180);
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const stats = []; const errs = [];
page.on("console", m => { const t = m.text(); const i = t.indexOf("WGPU_STATS frame="); if (i >= 0) stats.push(+/frame=(\d+)/.exec(t)[1]); });
page.on("pageerror", e => errs.push(String(e).slice(0, 200)));
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const KEYS = "abcdefghijklmnoprstuvxyz0123456789".split("").concat(["Tab", "Escape", "Delete", "Enter", "Space", "Backspace", "ArrowUp", "ArrowDown", "Period", "Comma", "Minus", "Equal"]);
const BAD = new Set(["Control+q", "Control+w", "Control+n", "Control+t", "Control+r", "Control+l", "Control+p", "Control+s", "Control+o", "Alt+f", "Alt+d"]);
let n = 0; const t0 = Date.now(); const rect = { x0: 280, y0: 140, x1: 1050, y1: 640 };
const mv = () => page.mouse.move(rect.x0 + rnd() * (rect.x1 - rect.x0), rect.y0 + rnd() * (rect.y1 - rect.y0), { steps: 2 });
while (Date.now() - t0 < SECS * 1000 && errs.length === 0) {
  const r = rnd(); n++;
  try {
    if (r < 0.5) { await mv(); const mod = pick(["", "", "", "Shift+", "Control+", "Alt+"]); const k = mod + pick(KEYS); if (!BAD.has(k)) await page.keyboard.press(k); }
    else if (r < 0.7) { await mv(); await page.mouse.click(rect.x0 + rnd() * 700, rect.y0 + rnd() * 450, { button: pick(["left", "left", "right"]) }); }
    else if (r < 0.85) { await mv(); await page.mouse.down(); await mv(); await mv(); await page.mouse.up(); }
    else if (r < 0.95) { await mv(); await page.mouse.wheel(0, (rnd() - 0.5) * 600); }
    else { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); }
  } catch (e) { errs.push("playwright: " + String(e).slice(0, 120)); }
  await wait(40 + rnd() * 120);
}
await page.keyboard.press("Escape"); await wait(500);
const f0 = stats[stats.length - 1] || 0;
await page.mouse.move(600, 400); await page.mouse.down({ button: "middle" }); await page.mouse.move(700, 430, { steps: 10 }); await page.mouse.up({ button: "middle" }); await wait(2500);
const f1 = stats[stats.length - 1] || 0;
await page.screenshot({ path: "out/ui_fuzz_end.png" });
console.log(`ui_fuzz seed=${process.env.FUZZ_SEED || 1} actions=${n} frames ${f0}->${f1} errors=${errs.length}`, errs.slice(0, 3).join(" | "));
console.log(errs.length === 0 && f1 > f0 ? "PASS ui_fuzz" : "FAIL ui_fuzz");
await browser.close();
