// PLAN A: automatický „parity“ test web buildu — projde body z docs/TEST_CHECKLIST.md, ke každému
// provede akce ve viewportu a automaticky vyhodnotí výsledek (barvy pixelů, rozdíl snímků, logy).
// Běží ve WINDOWS Chrome (skutečná GPU): scripts/parity_win.sh [id,id,...]
// Výstup: out/win/parity/report.md + screenshoty (out/parity/ po zkopírování). Značky: ✅ ❌ ❓
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
const { chromium } = await import(process.env.PW || "playwright");
const OUT = "out/parity"; mkdirSync(OUT, { recursive: true });
const only = (process.argv[2] || "").split(",").filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BAD_LOG = /Traceback|ABORT|PAGEERROR|GPUValidationError|Invalid CommandBuffer|RuntimeError|unreachable|WGPU_FATAL/;
const OK_LOG = /_multiprocessing/;   // známé, neškodné
// Známý nález: add-on bl_pkg (Extensions) se nezaregistruje (chybí _multiprocessing) → ignorovat ten traceback.
const KNOWN_TB = /Traceback \(most recent call last\):(?:\n.*?)*?ModuleNotFoundError: No module named '_multiprocessing'/g;
const badLines = (log) => log.join("\n").replace(KNOWN_TB, "").split("\n").filter((l) => BAD_LOG.test(l));

// ---- pixel helpers (běží v prohlížeči) ----
async function pageFn(page, name, ...args) { return page.evaluate(async ([name, args]) => {
  const load = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64;
    await i.decode(); const c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(i, 0, 0); return x; };
  const pred = { orange: (r, g, b) => r > 215 && g > 110 && g < 190 && b < 90,
    red: (r, g, b) => r > 190 && g < 90 && b < 90, green: (r, g, b) => g > 170 && r < 150 && b < 90,
    blue: (r, g, b) => b > 190 && r < 110 && g < 160, white: (r, g, b) => r > 225 && g > 225 && b > 225 };
  if (name === "count") { const [b64, rect, p] = args; const x = await load(b64);
    const d = x.getImageData(rect[0], rect[1], rect[2], rect[3]).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (pred[p](d[i], d[i + 1], d[i + 2])) n++; return n; }
  if (name === "diff") { const [a, b, rect] = args; const xa = await load(a), xb = await load(b);
    const da = xa.getImageData(rect[0], rect[1], rect[2], rect[3]).data, db = xb.getImageData(rect[0], rect[1], rect[2], rect[3]).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i]-db[i]) + Math.abs(da[i+1]-db[i+1]) + Math.abs(da[i+2]-db[i+2]) > 40) n++;
    return n / (da.length / 4); }
}, [name, args]); }

const VP = [55, 55, 1090, 700];      // oblast 3D viewportu (px stránky)
const ORIGIN = [555, 376, 40, 40];   // okolí počátku v defaultním pohledu

async function boot(tag, env) {
  const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
    args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  const log = []; page.on("console", (m) => log.push(m.text())); page.on("pageerror", (e) => log.push("PAGEERROR: " + e.message));
  if (process.env.PARITY_DL) env = { ...(env || {}), WGPU_DESTROYLOG: "1" };
  if (process.env.PARITY_NDU) env = { ...(env || {}), WGPU_NO_DESTROY_USAGE: process.env.PARITY_NDU };
  if (process.env.PARITY_ND) env = { ...(env || {}), WGPU_NO_DESTROY: process.env.PARITY_ND };  // buf|tex|all: ladění M2
  if (env) await page.addInitScript((e) => { window.__CAPENV = e; }, env);
  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 300; i++) { if ((await page.evaluate(() => window.__BGUI__ || {})).window) break; await wait(1000); }
  await wait(7000);
  await page.keyboard.press("Escape"); await wait(800);          // zavřít uvítací okno
  await page.mouse.move(380, 500);
  return { browser, page, log, shot: async (n) => { await wait(1500); const b = await page.screenshot({ path: `${OUT}/${tag}_${n}.png` }); return b.toString("base64"); } };
}

// ---- scénáře: { id, name, env?, run(ctx) -> [status, detail] } ----
const click = async (p, x, y, o) => { await p.mouse.click(x, y, o); await wait(400); };
const key = async (p, k) => { await p.keyboard.press(k); await wait(500); };
const S = [
 { id: 3, name: "3D kurzor je vidět", run: async (c) => { const a = await c.shot("a"); const r = await pageFn(c.page, "count", a, ORIGIN, "red"); const w = await pageFn(c.page, "count", a, ORIGIN, "white");
     return [r > 8 && w > 8 ? "✅" : "❌", `červené ${r}, bílé ${w} px u počátku`]; } },
 { id: 4, name: "Cursor tool: kurzor NA povrch (depth snapshot)", env: { WGPU_LOG_DEPTH: "1" }, run: async (c) => {
     await key(c.page, "Numpad1"); await key(c.page, "NumpadDecimal"); await wait(500); await click(c.page, 29, 137); await click(c.page, 600, 400); await c.shot("a");
     const ok = c.log.some((l) => /WGPU_DEPTHREAD.*snapshot=1/.test(l)); return [ok ? "✅" : "❌", ok ? "hloubka ze snapshotu" : "čtení hloubky vrátilo FAR"]; } },
 { id: 5, name: "Výběr objektu: oranžový obrys", run: async (c) => { const a = await c.shot("a"); const o = await pageFn(c.page, "count", a, VP, "orange"); return [o > 60 ? "✅" : "❌", `oranžové pixely ${o}`]; } },
 { id: 6, name: "Move gizmo je vidět", run: async (c) => { await click(c.page, 29, 178); const a = await c.shot("a");
     const R = await pageFn(c.page, "count", a, [455, 276, 240, 240], "red"), G = await pageFn(c.page, "count", a, [455, 276, 240, 240], "green"), B = await pageFn(c.page, "count", a, [455, 276, 240, 240], "blue");
     return [R > 20 && G > 20 && B > 20 ? "✅" : "❌", `R${R} G${G} B${B}`]; } },
 { id: 7, name: "Wireframe / Material Preview / Rendered", run: async (c) => { const base = await c.shot("solid"); const res = [];
     for (const [nm, x] of [["wire", 1053], ["material", 1092], ["rendered", 1111]]) { await click(c.page, x, 38); await wait(2500); const b = await c.shot(nm); res.push(`${nm}: změna ${(await pageFn(c.page, "diff", base, b, VP) * 100).toFixed(1)} %`); }
     const bad = badLines(c.log); return [bad.length ? "❌" : "✅", res.join("; ") + (bad.length ? " | " + bad[0].slice(0, 80) : "")]; } },
 { id: 8, name: "Přepnutí workspace Layout → Shading → Modeling", run: async (c) => { const t0 = Date.now(); await click(c.page, 655, 13); await wait(6000); const a = await c.shot("shading"); await click(c.page, 350, 13); await wait(6000); const b = await c.shot("modeling");
     const bad = badLines(c.log); return [bad.length ? "❌" : "✅", `${Math.round((Date.now() - t0) / 1000)} s celkem` + (bad.length ? " | " + bad[0].slice(0, 80) : "")]; } },
 { id: 9, name: "Edit mode: vrcholy (tečky) jsou vidět", env: { WGPU_LOG_POINTS: "1" }, run: async (c) => { await key(c.page, "Tab"); await key(c.page, "a"); await c.shot("a");
     const ok = c.log.some((l) => /WGPU_PTS indexed expand 'overlay_edit_mesh_vert' points=8/.test(l)); return [ok ? "✅" : "❌", ok ? "8 bodů jako quady" : "body se nerozšiřují"]; } },
 { id: "10-11", name: "Výběr plochy v Solid módu (klik)", run: async (c) => { await key(c.page, "Tab"); await key(c.page, "3"); await key(c.page, "Alt+a"); await key(c.page, "NumpadDecimal"); const a = await c.shot("a");
     await click(c.page, 580, 410); const b = await c.shot("b");   /* klik NA plochu kostky (x 521-637): v Solid vybírá desktop jen plochu pod kurzorem */ const d = await pageFn(c.page, "diff", a, b, VP); return [d > 0.003 ? "✅" : "❌", `změna ${(d * 100).toFixed(2)} % viewportu`]; } },
 { id: 12, name: "A (vybrat vše) / Alt+A (zrušit)", run: async (c) => { await key(c.page, "Tab"); await key(c.page, "Alt+a"); const a = await c.shot("none"); await key(c.page, "a"); const b = await c.shot("all"); await key(c.page, "Alt+a"); const d2 = await c.shot("none2");
     const d1 = await pageFn(c.page, "diff", a, b, VP), d3 = await pageFn(c.page, "diff", a, d2, VP); return [d1 > 0.002 && d3 < 0.002 ? "✅" : "❌", `vybrat vše: ${(d1*100).toFixed(2)} %, zpět: ${(d3*100).toFixed(2)} %`]; } },
 { id: 13, name: "Extrude (E) na vybrané ploše", run: async (c) => { await key(c.page, "Tab"); await key(c.page, "3"); await key(c.page, "Alt+a"); await click(c.page, 580, 410); await key(c.page, "e"); await c.page.mouse.move(600, 330); await wait(500); await key(c.page, "Enter");
     const b = await c.shot("a"); const bad = badLines(c.log); return [bad.length ? "❌" : "❓", bad.length ? bad[0].slice(0, 90) : "proběhlo bez chyby (tvar posoudit ručně ze screenshotu)"]; } },
 { id: 17, name: "Přidání UV Sphere (F3 hledání)", run: async (c) => { const a = await c.shot("a"); await key(c.page, "F3"); await c.page.keyboard.type("UV Sphere", { delay: 60 }); await wait(800); await key(c.page, "Enter"); await wait(1500); const b = await c.shot("b");
     const d = await pageFn(c.page, "diff", a, b, VP); return [d > 0.003 ? "✅" : "❌", `změna ${(d * 100).toFixed(2)} %`]; } },
 { id: 18, name: "Subdivision Surface (Ctrl+2)", run: async (c) => { const a = await c.shot("a"); await key(c.page, "Control+2"); await wait(1500); const b = await c.shot("b"); await click(c.page, 1167, 471); const p = await c.shot("panel");
     const d = await pageFn(c.page, "diff", a, b, VP); return [d > 0.005 ? "✅" : "❌", `změna tvaru ${(d * 100).toFixed(2)} %`]; } },
 { id: "19a", name: "Modifikátor Array", run: async (c) => modTest(c, 300, "Array") },
 { id: "19b", name: "Modifikátor Bevel", run: async (c) => modTest(c, 340, "Bevel") },
 { id: "19c", name: "Modifikátor Mirror", run: async (c) => modTest(c, 480, "Mirror") },
 { id: "19d", name: "Modifikátor Solidify", run: async (c) => modTest(c, 600, "Solidify") },
 { id: 20, name: "Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)", run: async (c) => { const a = await c.shot("a"); await key(c.page, "Control+2"); await wait(1000); const b = await c.shot("b"); await key(c.page, "Control+z"); await wait(1200); const u = await c.shot("undo");
     await key(c.page, "Control+Shift+z"); await wait(1200); const r = await c.shot("redo"); const dA = await pageFn(c.page, "diff", a, u, VP), dB = await pageFn(c.page, "diff", b, r, VP);
     return [dA < 0.01 && dB < 0.01 ? "✅" : "❌", `po undo ${(dA*100).toFixed(2)} % od originálu, po redo ${(dB*100).toFixed(2)} % od subsurfu`]; } },
];
async function modTest(c, y, name) {
  const a = await c.shot("a"); await click(c.page, 1167, 471); await click(c.page, 1297, 254); await click(c.page, 1208, 301); await click(c.page, 1020, y); await wait(2000);
  const b = await c.shot("b"); const d = await pageFn(c.page, "diff", a, b, [55, 55, 1090, 700]);
  const err = badLines(c.log).concat(c.log.filter((l) => /No asset found/.test(l)))[0];
  return [err ? "❌" : d > 0.002 ? "✅" : "❓", `změna ${(d * 100).toFixed(2)} %` + (err ? " | " + err.slice(0, 90) : d <= 0.002 ? " (beze změny — u výchozí kostky v počátku to může být správně)" : "")];
}

const rows = [];
for (const s of S) {
  if (only.length && !only.includes(String(s.id))) continue;
  const tag = `s${s.id}`; let st = "❓", det = "";
  const t0 = Date.now(); let c;
  try { c = await boot(tag, s.env); [st, det] = await s.run(c); }
  catch (e) { st = "❌"; det = "výjimka testu: " + String(e.message).split("\n")[0]; }
  const bad = c ? badLines(c.log).length : 0;
  rows.push(`| ${s.id} | ${s.name} | ${st} | ${det}${bad ? ` (⚠ ${bad} chybových řádků v logu)` : ""} | ${Math.round((Date.now() - t0) / 1000)} s |`);
  console.log(rows[rows.length - 1]);
  if (c) { writeFileSync(`${OUT}/${tag}.log`, c.log.join("\n")); await c.browser.close().catch(() => {}); }
}
writeFileSync(`${OUT}/report.md`, "| # | Test | Výsledek | Detail | Čas |\n|---|---|---|---|---|\n" + rows.join("\n") + "\n");
