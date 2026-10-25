// Stažení wasm selže 1× (jako iOS v pozadí) → stránka to zopakuje a Blender nastartuje.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let aborted = 0, retries = 0, frames = 0;
await page.route("**/blender.wasm.zst", (route) => { if (aborted < 1) { aborted++; route.abort("connectionreset"); } else route.continue(); });
page.on("console", m => { const t = m.text(); if (/fetch retry/.test(t)) retries++; if (t.includes("WGPU_STATS frame=")) frames++; });
await page.goto("http://localhost:5173/?perf=1&tel=0", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 240 && frames < 2; i++) await new Promise(r => setTimeout(r, 1000));
console.log(`fetchretry aborted=${aborted} retries=${retries} frames=${frames}`);
console.log(aborted === 1 && retries >= 1 && frames >= 2 ? "PASS fetchretry" : "FAIL fetchretry");
await browser.close();
