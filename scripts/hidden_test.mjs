// Karta na pozadí (přepnutí aplikace/karty na iPadu) a návrat: Blender musí dál reagovat. node hidden_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } });
const page = await ctx.newPage();
const stats = []; let errs = 0;
page.on("console", m => { const t = m.text(); const i = t.indexOf("WGPU_STATS frame="); if (i >= 0) stats.push(+/frame=(\d+)/.exec(t)[1]); });
page.on("pageerror", e => { errs++; console.log("PAGEERROR", String(e).slice(0, 200)); });
await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(2000);
const orbit = async () => { await page.mouse.move(600, 400); await page.mouse.down({ button: "middle" }); await page.mouse.move(700, 430, { steps: 10 }); await page.mouse.up({ button: "middle" }); await wait(1500); };
await orbit(); const a = stats[stats.length - 1] || 0;
const cdp = await ctx.newCDPSession(page);
await cdp.send("Page.enable");
let vis = "n/a";
try { await cdp.send("Page.setWebLifecycleState", { state: "frozen" }); } catch (e) { vis = "freeze-err " + String(e).slice(0, 80); }
await wait(8000);
try { await cdp.send("Page.setWebLifecycleState", { state: "active" }); } catch (e) { vis += " active-err " + String(e).slice(0, 80); }
await page.bringToFront(); await wait(1500);
const b0 = stats[stats.length - 1] || 0;
await orbit(); await orbit(); const b = stats[stats.length - 1] || 0;
await page.locator("#canvas").screenshot({ path: "out/hidden_after.png" });
const ok = b > b0 && b0 >= a && errs === 0;
console.log("visibility while away:", vis, "| frames before", a, "after-return", b0, "after-orbit", b);
console.log(ok ? "PASS: hidden/visible" : "FAIL: hidden/visible");
await browser.close();
