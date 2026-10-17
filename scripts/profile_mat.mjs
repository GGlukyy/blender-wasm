// CPU profil (V8 sampling) celé stránky + workerů během 120× bpy.ops.wm.redraw_timer(DRAW_WIN_SWAP).
// Výstup: out/profile_mat.txt (top self-time funkce na vlákně, které Blender renderuje).
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const N = process.argv[2] || "120";
const expr = `
import bpy, sys, time
def go():
    print('PROF_START'); sys.stdout.flush()
    t0 = time.time()
    w = bpy.context.window_manager.windows[0]
    for a in w.screen.areas:
        if a.type == 'VIEW_3D': a.spaces[0].shading.type = 'MATERIAL'
    bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP', iterations=3)
    print('PROF_END ms/frame=%.1f' % ((time.time() - t0) * 1000 / ${N})); sys.stdout.flush()
    return None
bpy.app.timers.register(go, first_interval=8.0)
`;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let started = false, ended = false, msg = "";
page.on("console", (m) => { const t = m.text(); if (t.includes("PROF_START")) started = true; if (t.includes("PROF_END")) { ended = true; msg = t; } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
await browser.startTracing(page, { path: "out/trace_mat.json", categories: ["disabled-by-default-v8.cpu_profiler", "v8", "toplevel"] });
for (let i = 0; i < 150 && !ended; i++) await new Promise(r => setTimeout(r, 1000));
await browser.stopTracing();
console.log(msg);
await browser.close();
