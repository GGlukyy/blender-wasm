// P3: high-poly. Ico sphere (subdivisions N: 8 = 327k tris, 9 = 1.3M tris) přes --python-expr, orbit,
// perf panel, WebGPU chyby z konzole, screenshot. Použití: node highpoly_test.mjs <subdiv>
import { mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const sub = process.argv[2] || "8";
const ipad = process.argv[3] === "ipad";   // omezí limity zařízení jako iPad Safari (256 MiB buffer / 128 MiB SSBO)
const tag = sub + (ipad ? "i" : "");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const lines = []; page.on("console", (m) => lines.push(m.text()));
page.on("pageerror", (e) => lines.push("PAGEERROR " + e.message));
const expr = `
import bpy, sys
bpy.ops.object.delete()
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=${sub}, radius=1.5)
bpy.ops.object.shade_smooth()
print('HP_DONE faces=%d' % len(bpy.context.object.data.polygons)); sys.stdout.flush()
`;
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
if (ipad) await page.addInitScript(() => { window.__CAPENV = { WGPU_CAP_MAX_BUFFER: "268435456", WGPU_CAP_MAX_SSBO: "134217728" }; });
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000);
await page.keyboard.press("Escape"); await wait(1500);
const box = await page.locator("#canvas").boundingBox();
const c = { x: box.x + 600, y: box.y + 400 };
await page.mouse.move(c.x, c.y);
await page.keyboard.press("Home"); await wait(2000);
await page.screenshot({ path: `out/hp_${tag}_home.png` });
await page.mouse.down({ button: "middle" });
for (let i = 0; i < 120; i++) { await page.mouse.move(c.x + 100 * Math.sin(i / 10), c.y + 40 * Math.cos(i / 10)); await wait(16); }
await page.mouse.up({ button: "middle" }); await wait(1500);
const perf = await page.evaluate(() => window.__PERF__ || null);
await page.screenshot({ path: `out/hp_${tag}_orbit.png` });
const hp = lines.filter(l => l.includes("HP_DONE"));
const errs = lines.filter(l => /WGPU_LIMITS|validation|exceeds|maxBufferSize|out of memory|OOM|RuntimeError|PAGEERROR|abort|Invalid/i.test(l)).slice(0, 12);
writeFileSync(`out/hp_${tag}.log`, lines.join("\n"));
console.log("HP " + tag + " " + (hp[0] || "NO HP_DONE") + " PERF " + JSON.stringify(perf));
console.log("ERRORS " + errs.length); errs.forEach(e => console.log("  " + e.slice(0, 220)));
await browser.close();
