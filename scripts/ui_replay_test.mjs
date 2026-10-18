// Deterministický replay UI fuzzu: akce se vygenerují předem ze seedu (FUZZ_SEED, FUZZ_N), FUZZ_KEEP="0,1,5-9" vybere podmnožinu.
// Výstup: "RESULT crash|ok". Slouží k delta-debuggingu (scripts/ddmin.py). node ui_replay_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
let seed = +(process.env.FUZZ_SEED || 1); const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];
const N = +(process.env.FUZZ_N || 300);
const KEYS = "abcdefghijklmnoprstuvxyz0123456789".split("").concat(["Tab", "Escape", "Delete", "Enter", "Space", "Backspace", "ArrowUp", "ArrowDown", "Period", "Comma", "Minus", "Equal"]);
const BAD = new Set(["Control+q", "Control+w", "Control+n", "Control+t", "Control+r", "Control+l", "Control+p", "Control+s", "Control+o", "Alt+f", "Alt+d"]);
const rect = { x0: 5, y0: 5, x1: 1395, y1: 800 };
const rp = () => [Math.round(rect.x0 + rnd() * (rect.x1 - rect.x0)), Math.round(rect.y0 + rnd() * (rect.y1 - rect.y0))];
const acts = [];
for (let i = 0; i < N; i++) {
  const r = rnd();
  if (r < 0.5) { const p = rp(); const k = pick(["", "", "", "Shift+", "Control+", "Alt+"]) + pick(KEYS); acts.push({ t: "key", p, k }); }
  else if (r < 0.7) acts.push({ t: "click", p: rp(), b: pick(["left", "left", "right"]) });
  else if (r < 0.85) acts.push({ t: "drag", p: rp(), q: rp(), q2: rp() });
  else if (r < 0.95) acts.push({ t: "wheel", p: rp(), d: Math.round((rnd() - 0.5) * 600) });
  else acts.push({ t: "esc", p: rp() });
  rnd();
}
let keep = acts.map((_, i) => i);
if (process.env.FUZZ_KEEP) { keep = []; for (const part of process.env.FUZZ_KEEP.split(",")) { const [a, b] = part.split("-").map(Number); for (let i = a; i <= (b ?? a); i++) keep.push(i); } }
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let crashed = false; page.on("pageerror", e => { crashed = true; });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape");
let done = 0;
for (const i of keep) {
  if (crashed) break;
  const a = acts[i];
  try {
    await page.mouse.move(a.p[0], a.p[1], { steps: 2 });
    if (a.t === "key") { if (!BAD.has(a.k)) await page.keyboard.press(a.k); }
    else if (a.t === "click") await page.mouse.click(a.p[0], a.p[1], { button: a.b });
    else if (a.t === "drag") { await page.mouse.down(); await page.mouse.move(a.q[0], a.q[1], { steps: 2 }); await page.mouse.move(a.q2[0], a.q2[1], { steps: 2 }); await page.mouse.up(); }
    else if (a.t === "wheel") await page.mouse.wheel(0, a.d);
    else { await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); }
  } catch (e) { console.log("RESULT error " + String(e).slice(0, 150) + " act=" + JSON.stringify(a)); break; }
  done++; await wait(100);
}
await wait(1500);
console.log("RESULT " + (crashed ? "crash" : "ok") + " done=" + done + "/" + keep.length);
await browser.close();
