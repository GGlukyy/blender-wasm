// RangeError "Out of memory" při startu (iOS po pádu GPU) → stránka řekne "zavři tab" místo věčného Loading.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 800 } })).newPage();
let dialogs = 0;
page.on("dialog", d => { dialogs++; d.accept(); });
await page.goto("http://localhost:5173/?tel=0", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
await page.waitForTimeout(1500);
await page.evaluate(() => { Promise.reject(new RangeError("Out of memory")); });
await page.waitForTimeout(500);
const txt = await page.locator("#splash-status").textContent();
console.log(`oomhint dialogs=${dialogs} status="${txt}"`);
console.log(dialogs === 1 && /Zavři tento tab/.test(txt) ? "PASS oomhint" : "FAIL oomhint");
await browser.close();
