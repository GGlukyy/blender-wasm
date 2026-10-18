// Dlouhé lasso (Ctrl+pravé tlačítko tažení, >1024 bodů) ve 3D viewportu — realloc customdata gesta. node lasso_long_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const N = Number(process.env.LASSO_POINTS || 2500);
const expr = `import bpy
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
for i in range(5): bpy.ops.mesh.primitive_cube_add(location=(i * 2 - 4, 0, 0))`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let bad = 0; page.on('pageerror', (e) => { bad++; console.log('PAGEERROR', String(e).slice(0, 200)); });
page.on("console", (m) => { const t = m.text(); if (/out of bounds|signature mismatch|Uncaught|abort|C-style|CPP-style/i.test(t)) { bad++; console.log("CRASH", t.slice(0, 200)); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(9000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(600, 450); await wait(500);
await page.keyboard.down("Control");
await page.mouse.move(300, 300); await wait(200);
await page.mouse.down({ button: "right" });
for (let i = 0; i < N; i++) {                       // spirála, N bodů (>1024 → realloc customdata)
  const a = i * 0.05, r = 40 + i * 0.12;
  await page.mouse.move(600 + Math.cos(a) * r, 400 + Math.sin(a) * r * 0.6);
}
await page.mouse.up({ button: "right" });
await page.keyboard.up("Control"); await wait(2500);
await page.mouse.move(610, 420); await wait(1500);
console.log("PK points", N, "crashes", bad);
console.log(bad === 0 ? "PASS: dlouhé lasso nespadlo" : "FAIL: dlouhé lasso spadlo");
await browser.close();
