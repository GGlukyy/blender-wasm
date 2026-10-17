// P1: WGSL seed. Windows Chrome (skutečná GPU) proti dev serveru :5173.
//   node wgsl_seed_win.mjs seed    -> projde viewport/edit mode/všechny workspaces, uloží out/wgsl-cache.json
//   node wgsl_seed_win.mjs verify  -> totéž s načteným seedem (SEED=out/wgsl-cache.json přes /wgsl-cache.json), spočítá cache-miss
// Cache-miss = volání globalThis.__WGSL_CACHE_PUT__ (shader se musel přeložit GLSL->SPIR-V->WGSL).
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const mode = process.argv[2] || "seed";
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR: " + e.message));
// Blender běží na pthread workeru → cache hooky ze stránky nevidí; počítáme řádky z konzole:
//   WGSL_MISS <key> (překlad proběhl), WGSL_EXPORT [key,wgsl] (jen při WGPU_WGSL_EXPORT=1)
const exported = new Map(); let nmiss = 0; let seedLine = "";
page.on("console", (m) => {
  const t = m.text();
  if (t.startsWith("WGSL_EXPORT ")) { const [k, v] = JSON.parse(t.slice(12)); exported.set(k, v); nmiss++; }
  else if (t.startsWith("WGSL_MISS ")) nmiss++;
  else if (t.startsWith("WGSL seed")) seedLine = t;
});
if (mode === "seed") await page.addInitScript(() => { window.__CAPENV = { WGPU_WGSL_EXPORT: "1" }; });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) {
  if ((await page.evaluate(() => window.__BGUI__ || {})).window) break;
  await new Promise(r => setTimeout(r, 1000));
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(6000);
const box = await page.locator("#canvas").boundingBox();
const vp = { x: box.x + 600, y: box.y + 400 };
const misses = async () => nmiss;
const phases = [];
const i0 = (x) => (x === 1111 || x === 1092 ? 12000 : 2500);   // material/rendered kompilují EEVEE
const phase = async (name, fn) => { const a = await misses(); await fn(); await wait(1500); const b = await misses(); phases.push([name, b - a]); console.log(`phase ${name}: ${b - a} translations`); };
await page.mouse.move(vp.x, vp.y);
await phase("boot", async () => {});
await phase("orbit/pan/zoom", async () => {
  await page.mouse.down({ button: "middle" }); await page.mouse.move(vp.x + 120, vp.y + 40, { steps: 10 }); await page.mouse.up({ button: "middle" });
  await page.keyboard.down("Shift"); await page.mouse.down({ button: "middle" }); await page.mouse.move(vp.x + 60, vp.y - 30, { steps: 8 });
  await page.mouse.up({ button: "middle" }); await page.keyboard.up("Shift");
  await page.mouse.wheel(0, -2); await wait(800);
  await page.mouse.click(vp.x, vp.y); await page.keyboard.press("g");
  await page.mouse.move(vp.x + 60, vp.y, { steps: 6 }); await page.keyboard.press("Escape");
});
await phase("edit mode v/e/f", async () => {
  await page.keyboard.press("Tab"); await wait(3000);
  for (const k of ["1", "2", "3"]) { await page.keyboard.press(k); await wait(800); await page.keyboard.press("a"); await wait(800); }
  await page.keyboard.press("Alt+a"); await page.keyboard.press("Tab"); await wait(1500);
});
await phase("shading modes", async () => {   // tlačítka v hlavičce viewportu: wire, solid, material, rendered
  for (const x of [1054, 1092, 1111, 1073]) { await page.mouse.click(box.x + x, box.y + 38); await wait(i0(x)); }
  await page.mouse.move(vp.x, vp.y);
});
for (let i = 0; i < 11; i++) {
  await phase(`workspace ${i + 1}`, async () => {
    await page.keyboard.down("Control"); await page.keyboard.press("PageDown"); await page.keyboard.up("Control");
    await wait(i === 5 ? 15000 : 4500);
  });
}
const total = await misses();
console.log(`TOTAL translations: ${total}; ${seedLine || "seed not loaded"}`);
writeFileSync(`out/wgsl_${mode}_phases.json`, JSON.stringify(phases));
if (mode === "seed") {
  const entries = JSON.stringify([...exported.entries()]);
  writeFileSync("out/wgsl-cache.json", entries);
  console.log(`SEED entries=${JSON.parse(entries).length} bytes=${entries.length}`);
}
await page.screenshot({ path: `out/wgsl_${mode}_end.png` });
await browser.close();
