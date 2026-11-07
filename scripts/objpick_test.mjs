// Výběr objektu klikem proti desktopu: skript objpick_common.py přes --python-expr. Porovnání: out/win/objpick_desktop.txt.
const { chromium } = await import(process.env.PW || "playwright"); import fs from "fs";
const Q = (process.env.Q || "").replace(/"/g, "");
const py = fs.readFileSync("objpick_common.py", "utf8") + "\nbpy.app.timers.register(lambda: (main(), None)[1], first_interval=4.0)\n";
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
let done = false, errs = 0, fail = 0;
page.on("console", (m) => { const t = m.text(); let i;
  if ((i = t.indexOf("PICK ")) >= 0) { const l = t.slice(i); const c = /chci=(\S+) je=(\S+)/.exec(l); const ok = c && c[1] === c[2]; if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${l}`); }
  if (t.includes("PICK_DONE")) done = true;
  if (/Traceback|Error:|RuntimeError|abort\(|memory access/.test(t) && !/bl_pkg/.test(t)) { errs++; console.log("ERR " + t.slice(0, 200)); } });
await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, py);
await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
await page.getByRole("button", { name: /Launch Blender/ }).click();
for (let i = 0; i < 180 && !done; i++) await new Promise((r) => setTimeout(r, 1000));
await page.screenshot({ path: "out/objpick.png" });
console.log(`RESULT fail=${fail} errs=${errs} done=${done}`);
await browser.close(); process.exit(fail || errs || !done ? 1 : 0);
