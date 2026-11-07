// H32: přirozený výskyt. N × čistý start + lidský klik na MP + pohyb myši. Hlásí snap/prop a H32_RELEASE. N=20 Q=mouserelease=0
const { chromium } = await import(process.env.PW || "playwright");
const Q = (process.env.Q || "").replace(/"/g, ""), N = +(process.env.N || 20);
const expr = `import bpy, sys, json
st = {'v': None}
def snap():
    ts = bpy.context.scene.tool_settings
    v = dict(snap=ts.use_snap, prop=ts.use_proportional_edit, prop_obj=ts.use_proportional_edit_objects)
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': v['shade'] = a.spaces[0].shading.type
    if v != st['v']:
        st['v'] = v; print('H32S ' + json.dumps(v)); sys.stdout.flush()
    return 0.1
def hdr():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D':
            r = [r for r in a.regions if r.type == 'HEADER'][0]
            print('H32H ' + json.dumps([r.x, r.y, r.width, r.height, bpy.context.window_manager.windows[0].height])); sys.stdout.flush()
bpy.app.timers.register(snap, first_interval=0.5, persistent=True); bpy.app.timers.register(lambda: hdr(), first_interval=4.0)`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms)); let bad = 0, released = 0, errors = 0, done = 0, miss = 0;
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
for (let n = 0; n < N; n++) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 850 } }); const page = await ctx.newPage();
  let last = null, hdr = null, rel = 0, seq = [];
  page.on("console", (m) => { const t = m.text(); let i;
    if ((i = t.indexOf("H32S ")) >= 0) { last = JSON.parse(t.slice(i + 5)); seq.push(last.shade[0] + (last.snap ? "S" : "") + (last.prop_obj ? "P" : "")); }
    if ((i = t.indexOf("H32H ")) >= 0) hdr = JSON.parse(t.slice(i + 5));
    if ((i = t.indexOf("H32_RELEASE")) >= 0) { rel++; released++; console.log(`#${n} ` + t.slice(i)); }
    if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { errors++; console.log(`#${n} ERR ` + t.slice(0, 160)); } });
  page.on("pageerror", (e) => { errors++; console.log(`#${n} PAGEERROR ` + e.message.slice(0, 160)); });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/" + (Q ? "?" + Q : ""), { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 200 && !hdr; i++) await wait(500);
  if (!hdr) { console.log(`#${n} start nedoběhl`); errors++; await ctx.close(); continue; }
  await wait(1500 + Math.random() * 2500);
  const box = await page.locator("#canvas").boundingBox(); const hy = box.y + hdr[4] - hdr[1] - hdr[3] / 2;
  /* Ikona MP při 1400 px: Wireframe 1057 (změřeno h32_test) + 2 ikony. */
  await page.mouse.move(box.x + 700, box.y + 400, { steps: 8 }); const xMP = box.x + 1093; await page.mouse.move(xMP, hy, { steps: 12 }); await wait(150 + Math.random() * 300);
  /* první klik zavře splash (jako člověk), až druhý přepne na MP */
  await page.mouse.down(); await wait(40 + Math.random() * 100); await page.mouse.up(); await wait(250 + Math.random() * 700);
  await page.mouse.move(xMP + 1, hy, { steps: 2 }); await wait(200 + Math.random() * 300);
  await page.mouse.down(); await wait(40 + Math.random() * 120);
  if (Math.random() < 0.5) await page.mouse.move(xMP + (Math.random() < .5 ? -2 : 2), hy);
  await page.mouse.up();
  await wait(Math.random() * 400);
  for (let k = 0; k < 6; k++) { await page.mouse.move(box.x + 300 + Math.random() * 800, box.y + 200 + Math.random() * 400, { steps: 10 }); await wait(500); }
  await wait(4000);
  const b = last.snap || last.prop || last.prop_obj; if (b) bad++; done++;
  const hit = seq.some((x) => x[0] === "M"); if (!hit) miss++;
  console.log(`#${n} ${b ? "BAD" : "ok"} ${hit ? "" : "NETREFIL_MP "}${seq.join(" ")} rel=${rel}`);
  if (b) await page.screenshot({ path: `out/h32s_${n}.png` });
  await ctx.close();
}
console.log(`RESULT done=${done} miss=${miss} bad=${bad} released=${released} errors=${errors} Q=${Q}`);
await browser.close(); process.exit(0);
