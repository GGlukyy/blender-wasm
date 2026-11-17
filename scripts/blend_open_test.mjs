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
    bad = 0; n = 0
    for o in bpy.data.objects:
        if o.name.startswith('Ob') and '_' in o.name:
            n += 1; tag = o.name[2:]
            if o.data is None or o.data.name != 'Me' + tag or len(o.data.vertices) != 8 or len(o.data.materials) != 1 or o.data.materials[0] is None or o.data.materials[0].name != 'M' + tag: bad += 1
    print('OPEN_RESULT OK objs=%d bad=%d' % (n, bad)); sys.stdout.flush()
except Exception as e:
    print('OPEN_RESULT ERROR ' + str(e).replace('\\n',' | ')); sys.stdout.flush()
`;
  const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
    args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  let result = null; const dbg = [];
  page.on("pageerror", (e) => dbg.push("PAGEERR " + e.message.slice(0, 200)));
  page.on("console", (m) => { const t = m.text(); if (/error|abort|unreachable|Cannot|assert/i.test(t)) dbg.push(t.slice(0, 200)); const i = t.indexOf("OPEN_RESULT"); if (i >= 0) result = t.slice(i); });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 120 && !result; i++) await new Promise(r => setTimeout(r, 1000));
  console.log(f.split(/[\\/]/).pop() + " -> " + result);
  /* D1 (17. 11.): adresy se internují, takže i soubory s kolizí adres se musí otevřít SPRÁVNĚ (dřív se kolizní soubor odmítl). */
  const ok = result && result.includes("OPEN_RESULT OK") && result.includes("bad=0") && (!f.includes("collide_real") || result.includes("objs=150"));
  if (!ok) fail++;
  if (!ok) dbg.slice(0, 8).forEach((d) => console.log("  dbg:", d));
  console.log(ok ? "PASS" : "FAIL");
  await browser.close();
}
process.exit(fail ? 1 : 0);
