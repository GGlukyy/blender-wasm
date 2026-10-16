// P2: edit mode overlay test. Boot demo (:5173), Tab -> edit mode, screenshots -> out/p2_<tag>_*.png
// Ve WSL canvas headless/SwiftShader vykreslí bíle → test se pouští ve WINDOWS Chrome (skutečná GPU):
//   scripts/p2_win.sh <tag>      (kopíruje skript do C:\Users\<u>\p2win a spouští node.exe)
import { createWriteStream, mkdirSync, existsSync, readFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
mkdirSync("out", { recursive: true });
const tag = process.argv[2] || "now";
const keys = (process.argv[3] || "Tab,a").split(",");
const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"],
});
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const log = createWriteStream(`out/p2_${tag}.log`);
page.on("console", (m) => log.write(m.text() + "\n"));
page.on("pageerror", (e) => log.write("PAGEERROR: " + (e.stack || e.message) + "\n"));

if (existsSync("capenv.json")) { const env = JSON.parse(readFileSync("capenv.json", "utf8")); await page.addInitScript((e) => { window.__CAPENV = e; }, env); }
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) {
  if ((await page.evaluate(() => window.__BGUI__ || {})).window) break;
  await new Promise(r => setTimeout(r, 1000));
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (n) => { await wait(2500); await page.screenshot({ path: `out/p2_${tag}_${n}.png` }); };
await wait(6000);
await shot("1_object");
const box = await page.locator("#canvas").boundingBox();
await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.6);
let n = 2;
for (const k of keys) {
  if (k.startsWith("shiftrmb=")) {   // shiftrmb=<x>:<y> v px canvasu: 3D kurzor na povrch
    const [x, y] = k.slice(9).split(":").map(Number);
    await page.keyboard.down("Shift"); await page.mouse.click(box.x + x, box.y + y, { button: "right" });
    await page.keyboard.up("Shift"); await shot(`${n++}_cursor`);
  } else if (k.startsWith("click=")) {   // click=<x>:<y> levé tlačítko (px canvasu)
    const [x, y] = k.slice(6).split(":").map(Number);
    await page.mouse.click(box.x + x, box.y + y); await shot(`${n++}_click`);
  } else { await page.keyboard.press(k); await shot(`${n++}_${k}`); }
}
await browser.close();
