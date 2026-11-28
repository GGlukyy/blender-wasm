// U3: File ▸ Open na Chromu = rovnou systémový výběr souboru (showOpenFilePicker, mock), žádný dialog „složka / soubor“. node u3_open_test.mjs <file.blend>
import { readFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
const file = process.env.BLEND || process.argv[2];
const expr = `import bpy, sys
def t():
    print('FILEPATH ' + bpy.data.filepath); sys.stdout.flush(); return 1.0
bpy.app.timers.register(t, first_interval=3.0, persistent=True)`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let fp = "";
page.on("console", (m) => { const t = m.text(), i = t.indexOf("FILEPATH "); if (i >= 0) fp = t.slice(i + 9).trim(); });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
const bytes = [...readFileSync(file)], name = file.split(/[\\/]/).pop();
await page.evaluate(([n, b]) => { window.__PICK_CALLS = 0; window.showOpenFilePicker = async (o) => { window.__PICK_OPTS = JSON.stringify(o); window.__PICK_CALLS++;
  return [{ getFile: async () => new File([new Uint8Array(b)], n) }]; };
  /* Safari/sim nemá File System Access → <input type=file>: klik nahradit vložením souboru */
  const ck = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () { if (this.type !== "file") return ck.call(this); window.__PICK_CALLS++; window.__PICK_INPUT = true;
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(b)], n)); this.files = dt.files; this.dispatchEvent(new Event("change")); }; }, [name, bytes]);
await page.evaluate(() => { window.__blenderFileOpenHook(); });
/* Safari/sim: okno „Choose file(s)…“ (iPad potřebuje vlastní klepnutí pro výběr souboru) */
await wait(1500); if (await page.locator("#dz-files").isVisible().catch(() => false)) await page.locator("#dz-files").click();
await wait(9000);
const st = await page.evaluate(() => ({ calls: window.__PICK_CALLS, chooser: !!document.getElementById("open-chooser"), offer: !!document.getElementById("open-folder-btn"), opts: window.__PICK_OPTS, input: !!window.__PICK_INPUT, fsa: typeof window.showDirectoryPicker === "function" }));
await page.screenshot({ path: "out/u3_open.png" });
console.log(JSON.stringify(st), "filepath=" + fp);
/* Chrome: picker + nabídka složky; Safari/sim (bez File System Access): jeden <input type=file>, nabídka složky tam není */
const ok = st.calls === 1 && !st.chooser && (st.input ? !st.offer : st.offer) && fp.endsWith("/" + name);
console.log(ok ? "PASS u3_open" : "FAIL u3_open");
await browser.close(); process.exit(ok ? 0 : 1);
