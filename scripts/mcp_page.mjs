// Windows Chrome: otevře Blender s ?mcp=… a drží stránku naživu. node mcp_page.mjs <port> <token> [sec]
const { chromium } = await import(process.env.PW || "playwright");
const [port, token, sec] = [process.argv[2], process.argv[3], parseInt(process.argv[4] || "150", 10)];
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
page.on("console", (m) => { if (/MCP/.test(m.text())) console.log(m.text().slice(0, 200)); });
await page.goto(`http://localhost:5173/?mp=0&mcp=${encodeURIComponent("ws://127.0.0.1:" + port)}&mcptoken=${token}`, { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
await new Promise((r) => setTimeout(r, sec * 1000));
await browser.close();
