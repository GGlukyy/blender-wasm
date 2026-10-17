// Cena -> bpy.ops.wm.redraw_timer(DRAW_WIN_SWAP) = čas jednoho překreslení okna (CPU Blenderu + submit).
// node drawtime_test.mjs   (scény: cube, monkey_sub3, ico8)
const { chromium } = await import(process.env.PW || "playwright");
const only = process.env.SCENES && !process.env.SCENES.includes("%") ? process.env.SCENES.split(",") : null;
const scenes = {
  cube: "pass",
  cubes200: "[bpy.ops.mesh.primitive_cube_add(location=((i%15)*2.5, (i//15)*2.5, 0)) for i in range(200)]",
  monkeys50: "[bpy.ops.mesh.primitive_monkey_add(location=((i%8)*3, (i//8)*3, 0)) for i in range(50)]",
  monkey_sub3: "bpy.ops.object.delete(); bpy.ops.mesh.primitive_monkey_add(); m=bpy.context.object.modifiers.new('s','SUBSURF'); m.levels=3; m.render_levels=3; bpy.ops.object.shade_smooth()",
  ico6_edit: "bpy.ops.object.delete(); bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6); bpy.ops.object.mode_set(mode='EDIT')",
  ico7_edit: "bpy.ops.object.delete(); bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=7); bpy.ops.object.mode_set(mode='EDIT')",
  monkey_sub2_edit: "bpy.ops.object.delete(); bpy.ops.mesh.primitive_monkey_add(); m=bpy.context.object.modifiers.new('s','SUBSURF'); m.levels=2; bpy.ops.object.mode_set(mode='EDIT')",
  ico8: "bpy.ops.object.delete(); bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=8); bpy.ops.object.shade_smooth()",
};
for (const [name, setup] of Object.entries(scenes)) {
  if (only && !only.includes(name)) continue;
  const expr = `
import bpy, sys, time
${setup}
def go():
    for t in ('DRAW', 'DRAW_WIN_SWAP'):
        n = 20
        t0 = time.time()
        bpy.ops.wm.redraw_timer(type=t, iterations=n)
        print('DRAWTIME %s ${name} %s ms/frame=%.1f' % ('${name}', t, (time.time() - t0) * 1000 / n)); sys.stdout.flush()
    return None
bpy.app.timers.register(go, first_interval=6.0)
`;
  const browser = await chromium.launch({ headless: false, executablePath: process.env.CHROME,
    args: ["--enable-unsafe-webgpu", "--ignore-gpu-blocklist", "--window-size=1500,950"] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 850 } })).newPage();
  const out = [];
  page.on("console", (m) => { const t = m.text(); if (t.includes("DRAWTIME")) out.push(t.slice(t.indexOf("DRAWTIME"))); });
  await page.addInitScript((e) => { window.__BARGS = ["--python-expr", e]; }, expr);
  await page.goto("http://localhost:5173/?perf=1", { waitUntil: "load" });
  await page.locator("#gpu-ack").check({ timeout: 2000 }).catch(() => {});
  await page.getByRole("button", { name: /Launch Blender/ }).click();
  for (let i = 0; i < 150 && out.length < 2; i++) await new Promise(r => setTimeout(r, 1000));
  await page.keyboard.press("Escape");
  const perf = await page.evaluate(() => window.__PERF__ || null);
  out.forEach(l => console.log(l));
  if (perf) console.log(`  ${name} api_ms=${perf.api_ms.toFixed(1)} submits=${perf.submits} passes=${perf.passes}`);
  await browser.close();
}
