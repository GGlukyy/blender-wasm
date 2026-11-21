// H50: ?memstage=1 panel funguje (A → B compile → C). Chrome: vypíše KROK A/B/C.
const { chromium } = await import(process.env.PW || "playwright");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
await page.goto("http://localhost:5173/?memstage=1" + (process.env.Q ? "&" + process.env.Q : ""), { waitUntil: "load" });
await page.getByText(/KROK A/).waitFor({ timeout: 120000 });
await page.getByRole("button", { name: /B: compile/ }).click();
await page.getByText(/KROK B/).waitFor({ timeout: 120000 });
await page.getByRole("button", { name: /C: zahodit/ }).click();
await page.getByText(/KROK C/).waitFor({ timeout: 30000 });
const t = await page.locator("div", { hasText: /KROK A/ }).last().innerText();
console.log(t); console.log(/CHYBA/.test(t) ? "MEMSTAGE FAIL" : "MEMSTAGE PASS");
await browser.close();
