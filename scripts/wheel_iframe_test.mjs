// H43: v iframe z jiného originu (jako itch) s vysokým rodičem kolečko nad Blenderem nesmí posunout rodiče. Env: Q, CHROME, PW.
const { chromium } = await import(process.env.PW || "playwright");
const base = "http://localhost:5173/", q = "sw=0&mp=0" + (process.env.Q ? "&" + process.env.Q : "");
const ctx = await chromium.launchPersistentContext(process.argv[2] || "wheel_profile", { headless: false, executablePath: process.env.CHROME,
  args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"], viewport: { width: 1400, height: 850 } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const http = await import("node:http");
const srv = http.createServer((req, res) => { res.writeHead(200, { "content-type": "text/html", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" });
  res.end(`<body style="margin:0;height:3000px"><iframe id=f src="${base}?${q}" allow="cross-origin-isolated; fullscreen" style="width:100vw;height:100vh;border:0;display:block"></iframe>`); }).listen(5176, "127.0.0.1");
const page = await ctx.newPage(); await page.goto("http://127.0.0.1:5176/", { waitUntil: "domcontentloaded" });
const fr = page.frameLocator("#f"); let up = false;
for (let i = 0; i < 90 && !up; i++) { up = await fr.getByRole("button", { name: /Launch Blender/ }).isEnabled().catch(() => false); if (!up) await wait(1000); }
await fr.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await fr.getByRole("button", { name: /Launch Blender/ }).click();
const frame = page.frames().find((f) => f.url().startsWith(base)); let run = false;
for (let i = 0; i < 120 && !run; i++) { run = !!(await frame.evaluate(() => (window.__BGUI__ || {}).window).catch(() => false)); if (!run) await wait(1000); }
let fail = 0; const check = (c, m) => { console.log(c ? "ok  " : "FAIL", m); if (!c) fail++; };
check(run, "Blender běží v iframe");
for (const [x, y, label] of [[700, 815, "nad stavovým řádkem"], [600, 400, "nad viewportem"], [700, 815, "nad stavovým řádkem (znovu)"], [1300, 300, "nad Properties"]]) {
  console.log("  element:", await frame.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y), c = document.getElementById("canvas").getBoundingClientRect(); return `${e && e.tagName}#${e && e.id}.${e && e.className} canvas=${Math.round(c.top)}..${Math.round(c.bottom)} innerH=${innerHeight}`; }, [x, y]));
  await page.mouse.move(x, y); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 300); await wait(150); }
  await wait(400); const sy = await page.evaluate(() => scrollY); check(sy === 0, `kolečko ${label}: scrollY rodiče = ${sy}`); await page.evaluate(() => scrollTo(0, 0));
}
srv.close(); await ctx.close(); console.log(fail ? "FAIL wheel_iframe" : "PASS wheel_iframe"); process.exit(fail ? 1 : 0);
