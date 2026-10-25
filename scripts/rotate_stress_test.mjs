// iPad se otáčí: 40× přepnout 1180×820 ↔ 820×1180 (rychle i pomalu) v edit módu → bez ztráty GPU/pádu, obraz se vykreslí.
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy
def go():
    bpy.ops.object.mode_set(mode='EDIT'); print('RSREADY', flush=True); return None
bpy.app.timers.register(go, first_interval=3.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 } })).newPage();
let ready = false, lost = false, errs = 0;
page.on("console", m => { const t = m.text(); if (/RSREADY/.test(t)) ready = true; if (/WEBGPU_LOST/.test(t)) { lost = true; console.log("LOST", t.slice(0, 160)); } });
page.on("pageerror", e => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
await page.goto("http://localhost:5173/?tel=0", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300 && !ready; i++) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 5000));
for (let i = 0; i < 40; i++) {
  const land = i % 2 === 0;
  await page.setViewportSize(land ? { width: 820, height: 1180 } : { width: 1180, height: 820 });
  await new Promise(r => setTimeout(r, i < 20 ? 900 : 120));
}
await page.setViewportSize({ width: 1180, height: 820 }); await new Promise(r => setTimeout(r, 4000));
await page.mouse.move(600, 400); await page.keyboard.press("n"); await new Promise(r => setTimeout(r, 2500));
const shot = await page.screenshot(); const nonblank = shot.length > 20000;
await page.screenshot({ path: "out/rotate_end.png" }).catch(() => {});
console.log(`rotate_stress lost=${lost} pageerrors=${errs} shot=${shot.length}`);
console.log(!lost && !errs && nonblank ? "PASS rotate_stress" : "FAIL rotate_stress");
await browser.close();
