// A1: je ?webkit_sim=1 užitečný? Musí ZREPRODUKOVAT S1 (MP) a H26 (GP) s vypnutou opravou a s opravou projít. MODE=s1|gp|ok
const { chromium } = await import(process.env.PW || "playwright");
const expr = `import bpy, sys, json, os
def _say(v): print('SIMR ' + json.dumps(v)); sys.stdout.flush()
def _tick():
    if os.path.exists('/tmp/sim_cmd'):
        s = open('/tmp/sim_cmd').read(); os.remove('/tmp/sim_cmd')
        try:
            if s.startswith('eval:'): _say(eval(s[5:], globals()))
            else: exec(s, globals()); _say(None)
        except Exception as e: _say({'err': repr(e)})
    return 0.05
def _v():
    w = bpy.context.window_manager.windows[0]
    for a in w.screen.areas:
        if a.type == 'VIEW_3D': r = [r for r in a.regions if r.type == 'WINDOW'][0]; return a, [r.x, w.height - r.y - r.height, r.width, r.height]
bpy.app.timers.register(_tick, first_interval=0.5, persistent=True); print('SIMREADY'); sys.stdout.flush()`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME, args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
const run = async (name, Q, part) => {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  let reply, ready = false, gpu = [], flags = "", abort = 0;
  page.on("console", (m) => { const t = m.text(); let i;
    if ((i = t.indexOf("SIMR ")) >= 0) reply = JSON.parse(t.slice(i + 5));
    if (t.includes("SIMREADY")) ready = true;
    if ((i = t.indexOf("WEB_FLAGS")) >= 0) flags = t.slice(i, i + 130);
    if (/WGPU_UNCAPTURED|PIPE_INVALID|PIPE_THROW|WGPU_RW_STORAGE_BAD|WEBKIT_SIM_BAD/.test(t)) gpu.push(t.slice(0, 200));
    if (/RuntimeError|abort\(|unreachable|memory access/i.test(t)) { abort++; console.log("ERR " + t.slice(0, 200)); } });
  const py = async (c) => { reply = undefined; await page.evaluate((c) => { try { Module.FS.unlink("/tmp/sim_cmd"); } catch {} Module.FS.writeFile("/tmp/sim_cmd", c); }, c); for (let i = 0; i < 1200 && reply === undefined; i++) await wait(50); return reply; };
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/?" + Q, { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 300 && !ready; i++) await wait(1000);
  await wait(5000); await page.keyboard.press("Escape"); await wait(800);
  const box = await page.locator("#canvas").boundingBox(); let out = {};
  const sq = (a, b, r) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
  if (part === "mp") {
    await py("_v()[0].spaces[0].shading.type='MATERIAL'"); await py("eval:0"); await wait(25000); await py("eval:0");
    await page.screenshot({ path: `out/simcheck_${name}.png` });
    out.gpu = gpu.length;
  } else {
    await py("bpy.ops.wm.read_homefile(app_template='2D_Animation', use_factory_startup=True)"); await wait(6000); await page.keyboard.press("Escape"); await wait(800);
    const R = (await py("eval:_v()[1]")); const m = [box.x + R[0] + R[2] / 2, box.y + R[1] + R[3] / 2]; const clip = { x: box.x + R[0] + 20, y: box.y + R[1] + 40, width: R[2] - 40, height: R[3] - 80 };
    const b0 = await page.screenshot({ clip });
    await page.mouse.move(m[0] - 150, m[1]); await wait(200); await page.mouse.down(); for (let i = 0; i < 30; i++) { await page.mouse.move(m[0] - 150 + i * 10, m[1] + Math.sin(i / 3) * 40); await wait(16); } await page.mouse.up(); await wait(2000);
    await page.mouse.move(box.x + 300, box.y + 3); await wait(1500);
    const n = await py("eval:(lambda o: sum(len(d.strokes) for l in o.data.layers for d in [l.current_frame().drawing] if l.current_frame()))(bpy.context.view_layer.objects.active)");
    const b1 = await page.screenshot({ clip, path: `out/simcheck_${name}.png` });
    /* PNG se liší i když je obraz stejný málokdy; přesně: dekódovat v prohlížeči */
    const diff = await page.evaluate(async ([a, b]) => { const load = async (d) => { const i = await createImageBitmap(await (await fetch("data:image/png;base64," + d)).blob()); const c = new OffscreenCanvas(i.width, i.height), g = c.getContext("2d"); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const A = await load(a), B = await load(b); let n = 0; for (let i = 0; i < A.length; i += 4) if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > 40) n++; return n; }, [b0.toString("base64"), b1.toString("base64")]);
    out = { strokes: n, diff, gpu: gpu.length };
  }
  console.log(`CASE ${name} ${JSON.stringify(out)} ${flags}`); for (const g of [...new Set(gpu)].slice(0, 3)) console.log("   " + g);
  await page.context().close(); return { ...out, abort, msgs: gpu };
};
const res = {}; let fail = 0; const check = (ok, m) => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${m}`); };
const MODE = process.env.MODE || "all";
if (MODE === "all" || MODE === "s1") { const r = await run("s1_bug", "webkit_sim=1&sim_nos1=1", "mp"); check(r.msgs.some((m) => /torage buffers/i.test(m)), `S1 zreprodukována bez opravy (${r.gpu} chyb)`); }
if (MODE === "all" || MODE === "gp") { const r = await run("gp_bug", "webkit_sim=1&nodualsrc=0", "gp"); check(r.gpu > 0 && r.diff < 300, `GP chyba zreprodukována bez opravy (gpu ${r.gpu}, tah změnil ${r.diff} px)`); }
if (MODE === "all" || MODE === "ok") { const r = await run("mp_ok", "webkit_sim=1", "mp"); check(r.gpu === 0 && !r.abort, `MP v sim s opravou bez chyb (${r.gpu})`);
  const g = await run("gp_ok", "webkit_sim=1", "gp"); check(g.gpu === 0 && g.strokes >= 1 && g.diff >= 300, `GP v sim s opravou: tah vidět (${g.diff} px, gpu ${g.gpu})`); }
console.log(`RESULT fail=${fail}`); await browser.close(); process.exit(fail ? 1 : 0);
