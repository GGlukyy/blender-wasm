// Otočení iPadu / změna velikosti okna (DPR 2): canvas musí sledovat okno, obraz nesmí zčernat, Blender nesmí spadnout.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,1200"] });
const page = await (await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 })).newPage();
const errs = []; page.on("pageerror", e => errs.push(String(e).slice(0, 150)));
page.on("console", m => { if (/Aborted|RuntimeError|unreachable/.test(m.text())) errs.push(m.text().slice(0, 150)); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(7000); await page.keyboard.press("Escape"); await wait(1500);
let fail = 0;
const info = () => page.evaluate(() => { const c = document.querySelector("#canvas"); return { cw: c.width, ch: c.height, bw: c.getBoundingClientRect().width, bh: c.getBoundingClientRect().height, dpr: devicePixelRatio, iw: innerWidth, ih: innerHeight }; });
async function nonBlank(tag) {
  const buf = await page.screenshot({ path: `out/resize_${tag}.png` });
  // hrubě: počet různých bajtů ve vzorku PNG (prázdný obraz se komprimuje na pár stovek bajtů)
  return buf.length;
}
for (const [tag, w, h] of [["land", 1180, 820], ["port", 820, 1180], ["land2", 1180, 820], ["small", 700, 500]]) {
  await page.setViewportSize({ width: w, height: h }); await wait(3000);
  const i = await info(), n = await nonBlank(tag);
  const okSize = Math.abs(i.bw - w) <= 2 && Math.abs(i.bh - h) <= 40 && Math.abs(i.cw - i.bw) <= 2;
  console.log(`RESIZE ${tag} ${w}x${h} canvas=${i.cw}x${i.ch} css=${i.bw}x${i.bh} dpr=${i.dpr} png=${n}B ${okSize && n > 40000 ? "ok" : "BAD"}`);
  if (!okSize || n < 40000) fail++;
}
// po všem: orbit musí pořád fungovat (pohled se změní)
const box = await page.locator("#canvas").boundingBox(); const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
const before = await page.screenshot();
await page.mouse.move(c.x, c.y); await page.mouse.down({ button: "middle" });
for (let i = 0; i < 40; i++) { await page.mouse.move(c.x + i * 4, c.y + i * 2); await wait(16); }
await page.mouse.up({ button: "middle" }); await wait(800);
const after = await page.screenshot({ path: "out/resize_orbit.png" });
if (Buffer.compare(before, after) === 0) { console.log("RESIZE orbit: obraz se nezměnil"); fail++; }
console.log(errs.length ? "ERRS " + JSON.stringify(errs) : "no errors");
if (errs.length) fail++;
console.log(fail ? "FAIL resize" : "PASS resize");
await browser.close();
