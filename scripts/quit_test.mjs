// File ▸ Quit / Ctrl+Q na webu: nesmí nechat prázdnou stránku bez vysvětlení. node quit_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const logs = []; let errs = 0;
page.on("pageerror", (e) => { errs++; logs.push("PAGEERROR " + String(e).slice(0, 120)); });
page.on("console", (m) => { const t = m.text(); if (/exit|abort|quit|Aborted|unreachable|status/i.test(t)) logs.push(t.slice(0, 140)); });
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await new Promise(r => setTimeout(r, 1000)); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await wait(8000); await page.keyboard.press("Escape"); await wait(800);
await page.mouse.move(700, 450);
await page.keyboard.press("Control+q"); await wait(4000);
await page.screenshot({ path: "out/quit_after.png" });
const st = await page.evaluate(() => ({ dialog: !!document.querySelector("[role=dialog], .popup"), canvasVisible: getComputedStyle(document.getElementById("canvas")).display, body: document.body.innerText.slice(0, 200) }));
st.banner = await page.evaluate(() => !!document.getElementById("blender-quit")); console.log(JSON.stringify(st)); console.log(st.banner ? "PASS: quit banner" : "FAIL: quit banner"); console.log(logs.slice(0, 8).join("\n"));
await browser.close();
