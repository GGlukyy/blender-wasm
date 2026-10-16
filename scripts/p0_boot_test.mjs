// P0: demo (vite dev na :5173) nabootuje v Chrome na PC, Blender okno se vykreslí.
// Použití: node scripts/p0_boot_test.mjs [url] ; screenshot -> out/p0_boot.png, log -> out/p0_boot.log
import { chromium } from "playwright";
import { createWriteStream, mkdirSync } from "node:fs";
mkdirSync("out", { recursive: true });
const url = process.argv[2] || "http://localhost:5173/";
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--ignore-gpu-blocklist",
         "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const log = createWriteStream("out/p0_boot.log");
let errs = 0;
page.on("console", (m) => log.write(m.text() + "\n"));
page.on("pageerror", (e) => { errs++; log.write("PAGEERROR: " + (e.stack || e.message) + "\n"); });
const t0 = Date.now();
await page.goto(url, { waitUntil: "load" });
console.log("isolated=", await page.evaluate(() => crossOriginIsolated),
            "webgpu=", await page.evaluate(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter())));
// start-gate: při softwarovém rendereru je nutné odškrtnout "Launch anyway"
const cb = page.locator('input[type=checkbox]').first();
if (await cb.count() && await cb.isVisible().catch(() => false)) await cb.check();
await page.getByRole("button", { name: /Launch Blender/ }).click();
let ok = false;
for (let i = 0; i < 420 && !ok; i++) {
  const s = await page.evaluate(() => window.__BGUI__ || {});
  ok = !!s.window;
  if (!ok) await new Promise(r => setTimeout(r, 1000));
}
console.log("window drawn =", ok, " t=" + Math.round((Date.now() - t0) / 1000) + "s errs=" + errs);
await new Promise(r => setTimeout(r, 4000));
await page.screenshot({ path: "out/p0_boot.png" });
await browser.close();
process.exit(ok && errs === 0 ? 0 : 1);
