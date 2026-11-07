// B1: spustí prohlídku `?auto=tour&tel=1` v Chrome na PC a vypíše kroky. Q = další dotaz (např. webkit_sim=1, tourpart=edit,gp).
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, "");
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let done = null, errors = 0; const bad = []; let steps = 0;
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("TOUR_STEP ")) >= 0) { const r = JSON.parse(t.slice(i + 10)); steps++;
    const p = !r.ok || r.blank || r.nerr; if (p) bad.push(r);
    console.log(`${p ? "PROBLEM" : "ok"} ${r.name} ${r.ms} ms std=${r.std}${r.err ? " ERR " + r.err : ""}${r.nerr ? " GPU(" + r.nerr + ") " + r.gpuerrs[0] : ""}`); }
  if ((i = t.indexOf("TOUR_DONE")) >= 0) done = t.slice(i);
  if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log("ERR " + t.slice(0, 200)); } });
page.on("pageerror", (e) => { errors++; console.log("PAGEERROR " + e.message.slice(0, 200)); });
await page.goto("http://localhost:5173/?auto=tour&tel=1" + (Q ? "&" + Q : ""), { waitUntil: "load" });
for (let i = 0; i < 2400 && !done && !errors; i++) await wait(1000);
await wait(2500); /* telemetrie doputuje */
console.log(done || "NEDOBĚHLO");
console.log(`RESULT steps=${steps} problem=${bad.length} errors=${errors} done=${!!done}`);
await browser.close();
process.exit(done && !bad.length && !errors ? 0 : 1);
