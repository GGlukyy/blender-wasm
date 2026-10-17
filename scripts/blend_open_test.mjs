// P2b: otevření 64-bit .blend ve wasm32 buildu: dobrý soubor se načte, soubor s kolizí adres (dva různé
// 64-bit pointery -> stejných 32 bitů) se NAHLAS odmítne. Soubory: scripts/testdata/blend64_*.blend
//   scripts/blend_open_win.sh   (kopíruje do C:\Users\<u>\p2win a pouští node)
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const files = process.argv.slice(2);
let fail = 0;
for (const f of files) {
  const b64 = readFileSync(f).toString("base64");
  const expr = `
import bpy, base64, sys
open('/tmp/t.blend','wb').write(base64.b64decode('${b64}'))
try:
    bpy.ops.wm.open_mainfile(filepath='/tmp/t.blend')
    print('OPEN_RESULT OK'); sys.stdout.flush()
except Exception as e:
    print('OPEN_RESULT ERROR ' + str(e).replace('\\n',' | ')); sys.stdout.flush()
`;
  const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
    args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  let result = null;
  page.on("console", (m) => { const t = m.text(); const i = t.indexOf("OPEN_RESULT"); if (i >= 0) result = t.slice(i); });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 120 && !result; i++) await new Promise(r => setTimeout(r, 1000));
  console.log(f.split(/[\\/]/).pop() + " -> " + result);
  const expectOk = !f.includes("collide");
  const ok = result && (expectOk ? result.includes("OPEN_RESULT OK") : result.includes("OPEN_RESULT ERROR") && result.includes("collide"));
  if (!ok) fail++;
  console.log(ok ? "PASS" : "FAIL");
  await browser.close();
}
process.exit(fail ? 1 : 0);
