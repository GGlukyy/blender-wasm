// Spustí scripts/ops_test.py uvnitř web Blenderu a vypíše řádky OPS. node ops_test.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
const py = readFileSync(process.env.OPS_PY || "ops_test.py", "utf8");
const b64 = Buffer.from(py).toString("base64");
const expr = `import base64, bpy
def _run():
    exec(compile(base64.b64decode('${b64}').decode(), 'ops_test.py', 'exec'), {'__name__': 'ops'})
    return None
bpy.app.timers.register(_run, first_interval=6.0)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const lines = []; let done = false;
page.on("console", (m) => { const t = m.text(); const i = t.indexOf("OPS"); if (t.includes("WGPU_FILM") || process.env.OPS_ALL) lines.push(t.slice(0, 160)); if (i >= 0) { lines.push(t.slice(i)); if (t.includes("OPS_DONE")) done = true; } });
if (existsSync("capenv.json")) { const env = JSON.parse(readFileSync("capenv.json", "utf8")); await page.addInitScript((e) => { window.__CAPENV = e; }, env); }
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 280 && !done; i++) await new Promise(r => setTimeout(r, 1000));
if (process.env.OPS_SHOT) { await page.mouse.move(700, 612); await page.keyboard.press("Escape"); await new Promise(r => setTimeout(r, 1000)); await page.keyboard.press("Escape"); await new Promise(r => setTimeout(r, 1000)); await page.mouse.move(150, 700, { steps: 10 }); await new Promise(r => setTimeout(r, 2500)); await page.mouse.move(160, 710); await new Promise(r => setTimeout(r, 1500)); }
if (process.env.OPS_SHOT) await page.screenshot({ path: process.env.OPS_SHOT });
lines.forEach(l => console.log(l));
if (!done) console.log("OPS_TIMEOUT");
writeFileSync("out/ops_result.txt", lines.join("\n"));
await browser.close();
