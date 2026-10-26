// P87: RangeError "Out of memory" při startu → celoobrazovkový panel #oom-overlay.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
await new Promise((r) => setTimeout(r, 3000));
await page.evaluate(() => { Promise.reject(new RangeError("Out of memory")); });
await new Promise((r) => setTimeout(r, 500));
const r = await page.evaluate(() => { const o = document.getElementById("oom-overlay"); if (!o) return null; const b = o.getBoundingClientRect(); return { w: b.width, h: b.height, vw: innerWidth, vh: innerHeight }; });
await page.screenshot({ path: "out/oom_1.png" });
const ok = r && r.w >= r.vw && r.h >= r.vh;
console.log("OOM " + JSON.stringify(r));
// H16: pthread-style window error event must also raise the panel
await page.evaluate(() => { document.getElementById("oom-overlay")?.remove(); dispatchEvent(new ErrorEvent("error", { message: "UnknownError: Out of memory" })); });
await new Promise((r) => setTimeout(r, 300));
const ok2 = await page.evaluate(() => !!document.getElementById("oom-overlay"));
console.log((ok2 ? "PASS" : "FAIL") + " oom overlay from error event");
console.log((ok ? "PASS" : "FAIL") + " oom overlay");
await browser.close();
