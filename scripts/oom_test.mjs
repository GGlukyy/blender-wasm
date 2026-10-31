// I3: hláška při "Out of memory" (EN+CS) + tlačítko "Zkusit s menší pamětí" (-> ?pool=4). node oom_test.mjs
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 300)));
await page.goto("http://localhost:5173/", { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 120000 }).catch(() => {});
await page.waitForFunction(() => { const b = [...document.querySelectorAll("button")].find((x) => /Launch Blender/.test(x.textContent)); return b && !b.disabled; }, null, { timeout: 120000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click(); await page.waitForTimeout(3000);
for (let i = 0; i < 5 && !(await page.locator("#oom-overlay").count()); i++) { await page.evaluate(() => { Promise.reject(new RangeError("Out of memory")); }); await page.waitForTimeout(1000); }
await page.waitForTimeout(500);
console.log("BODY", (await page.evaluate(() => document.body.innerText)).slice(0, 300).replace(/\n/g, " ")); await page.screenshot({ path: "out/oom.png" });
const t = await page.locator("#oom-overlay").innerText();
let fail = 0; const check = (n, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${n}`); if (!ok) fail++; };
check("EN text", /Close this tab completely/.test(t));
check("CS text", /Zavři tuhle záložku úplně/.test(t));
const btn = page.locator("#oom-overlay button");
check("tlačítko", await btn.count() === 1);
await btn.click(); await page.waitForURL(/pool=4/, { timeout: 5000 }).then(() => check("?pool=4", true)).catch(() => check("?pool=4", false));
await page.screenshot({ path: "out/oom.png" });
console.log(fail ? "FAIL: oom" : "PASS: oom");
await browser.close();
