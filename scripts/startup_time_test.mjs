// Čas startu: od načtení stránky po první obsah (WGPU_FIRST_CONTENT) + okno __BGUI__.window. Čistý profil = bez cache.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const t0 = Date.now(); const ev = [];
const mark = (n) => { ev.push([n, ((Date.now() - t0) / 1000).toFixed(1)]); };
page.on("console", (m) => { const t = m.text(); for (const k of ["WGPU_FIRST_CONTENT", "WGSL seed loaded", "downloaded", "extract", "Extract", "ready"]) if (t.includes(k) && !ev.find(e => e[0] === t.slice(0, 50))) mark(t.slice(0, 50)); });
await page.goto("http://localhost:5173/", { waitUntil: "load" }); mark("page load");
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find(x => /Launch Blender/.test(x.textContent)); return b && !b.disabled; }, null, { timeout: 300000 }); mark("downloads done, Launch enabled");
await page.getByRole("button", { name: /Launch Blender/ }).click(); mark("launch clicked");
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 250)); } mark("window up");
await new Promise(r => setTimeout(r, 3000));
ev.forEach(([n, t]) => console.log(`${t.padStart(6)} s  ${n}`));
await browser.close();
