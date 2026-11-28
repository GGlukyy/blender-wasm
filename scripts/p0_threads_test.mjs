// P0: kdo startuje pthready. Hook Worker.postMessage(cmd 2 = spawn) → start_routine (index tabulky) → index funkce wasm.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await page.addInitScript(() => {
  window.__spawns = []; const pm = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (m, t) { if (m && m.cmd === 2) window.__spawns.push({ sr: m.start_routine, t: Math.round(performance.now()) }); return pm.call(this, m, t); };
});
const q = "?tel=1" + (process.env.Q ? "&" + process.env.Q : "");
await page.goto("http://localhost:5173/" + q, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
const L = page.getByRole("button", { name: /Launch Blender/ });
for (let i = 0; i < 120 && !(await L.isEnabled().catch(() => false)); i++) await wait(1000);
await L.click();
for (let i = 0; i < 100; i++) { await wait(3000); if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; }
await wait(+(process.env.SECS || 20) * 1000);
const r = await page.evaluate(() => {
  const T = window.__indirect_function_table || window.wasmTable; const P = window.PThread;
  return { spawns: window.__spawns.map(s => { let f = null; try { f = T.get(s.sr).name; } catch (e) {} return [s.sr, f, s.t]; }),
    running: P && P.runningWorkers ? P.runningWorkers.length : String(typeof P), unused: P && P.unusedWorkers ? P.unusedWorkers.length : null };
});
console.log("THR " + JSON.stringify(r));
await browser.close();
