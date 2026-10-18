// UI fuzz: náhodné klávesy + myš ve viewportu (pevný seed). Hledá pád wasm / zamrzlý render loop / PAGEERROR. node ui_fuzz_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
let seed = +(process.env.FUZZ_SEED || 1); const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const SECS = +(process.env.FUZZ_SECS || 180);
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const stats = []; const errs = []; const acts = []; const logs = [];
page.on("console", m => { const t = m.text(); logs.push(t.slice(0, 220)); if (logs.length > 40) logs.shift(); const i = t.indexOf("WGPU_STATS frame="); if (i >= 0) stats.push(+/frame=(\d+)/.exec(t)[1]); });
page.on("pageerror", e => errs.push((process.env.FUZZ_STACK ? (e.stack || String(e)) : String(e)).slice(0, process.env.FUZZ_STACK ? 3000 : 200)));
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
const KEYS = process.env.FUZZ_KEYSET ? process.env.FUZZ_KEYSET.split(",") : "abcdefghijklmnoprstuvxyz0123456789".split("").concat(["Tab", "Escape", "Delete", "Enter", "Space", "Backspace", "ArrowUp", "ArrowDown", "Period", "Comma", "Minus", "Equal"]);
const BAD = new Set(["Control+q", "Control+w", "Control+n", "Control+t", "Control+r", "Control+l", "Control+p", "Control+s", "Control+o", "Alt+f", "Alt+d"]);
let n = 0; const t0 = Date.now(); const rect = process.env.FUZZ_FULL ? { x0: 5, y0: 5, x1: 1395, y1: 800 } : { x0: 280, y0: 140, x1: 1050, y1: 640 };
const rp = () => [rect.x0 + rnd() * (rect.x1 - rect.x0), rect.y0 + rnd() * (rect.y1 - rect.y0)];
// Akce se generují VŽDY (stejný tok náhodných čísel), FUZZ_SKIP="3,10-20" je jen přeskočí při provedení → delta debugging.
const skip = new Set(); for (const part of (process.env.FUZZ_SKIP || "").split(",").filter(Boolean)) { const [x, y] = part.split("-").map(Number); for (let i = x; i <= (y ?? x); i++) skip.add(i); }
const MAXN = +(process.env.FUZZ_N || 1e9);
const gen = () => {
  const r = rnd(); const a = { r };
  if (r < 0.5) { a.p = rp(); a.k = pick(["", "", "", "Shift+", "Control+", "Alt+"]) + pick(KEYS); }
  else if (r < 0.7) { a.p = rp(); a.c = rp(); a.b = pick(["left", "left", "right"]); }
  else if (r < 0.85) { a.p = rp(); a.q = rp(); a.q2 = rp(); }
  else if (r < 0.95) { a.p = rp(); a.d = (rnd() - 0.5) * 600; }
  a.w = 40 + rnd() * 120; return a;
};
while (Date.now() - t0 < SECS * 1000 && errs.length === 0 && n < MAXN) {
  const a = gen(); n++; acts.push(`#${n} ${a.k || a.b || (a.q ? "drag" : a.d ? "wheel" : "esc")}@${a.p ? a.p.map(Math.round) : ""}`); if (acts.length > 8) acts.shift();
  if (skip.has(n)) continue;
  try {
    if (a.r < 0.5) { await page.mouse.move(...a.p, { steps: 2 }); if (!BAD.has(a.k)) await page.keyboard.press(a.k); }
    else if (a.r < 0.7) { await page.mouse.move(...a.p, { steps: 2 }); await page.mouse.click(...a.c, { button: a.b }); }
    else if (a.r < 0.85) { await page.mouse.move(...a.p, { steps: 2 }); await page.mouse.down(); await page.mouse.move(...a.q, { steps: 2 }); await page.mouse.move(...a.q2, { steps: 2 }); await page.mouse.up(); }
    else if (a.r < 0.95) { await page.mouse.move(...a.p, { steps: 2 }); await page.mouse.wheel(0, a.d); }
    else { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); }
  } catch (e) { errs.push("playwright: " + String(e).slice(0, 120)); }
  await wait(a.w);
}
await page.keyboard.press("Escape"); await wait(500);
const f0 = stats[stats.length - 1] || 0;
// Kontrola živosti: MMB tah (orbit) — fuzz mohl změnit layout (viewport malý/jinde, velký Outliner…), proto zkusit více míst;
// stačí, když KTERÉKOLI vyvolá překreslení (snímky GPU narostou). Dál platí: žádné chyby/pády.
let f1 = f0;
for (const [x, y] of [[600, 400], [120, 300], [1000, 300], [700, 600], [300, 200], [1100, 500]]) {
  await page.mouse.move(x, y); await page.mouse.down({ button: "middle" }); await page.mouse.move(x + 100, y + 30, { steps: 10 }); await page.mouse.up({ button: "middle" }); await wait(1500);
  f1 = stats[stats.length - 1] || 0;
  if (f1 > f0) break;
}
await page.screenshot({ path: "out/ui_fuzz_end.png" });
console.log(`CRASH_AT=${errs.length ? n : -1}`); console.log(`ui_fuzz seed=${process.env.FUZZ_SEED || 1} actions=${n} frames ${f0}->${f1} errors=${errs.length}`, errs.slice(0, 3).join(" | "));
if (errs.length) { console.log("LAST ACTIONS:", acts.join(" ; ")); console.log("LAST LOGS:\n" + logs.slice(-25).join("\n")); }
console.log(errs.length === 0 && f1 > f0 ? "PASS ui_fuzz" : "FAIL ui_fuzz");
await browser.close();
