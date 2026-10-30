/* A1: `?auto=<scénář>` — stránka po startu sama provede scénář (iPad test bez Lukášových rukou).
 * Scénáře: light (MP + pohyb světla přes bpy), lightdrag (MP + G-tažení světla syntetickými myšími událostmi),
 * orbit (otáčení pohledu syntetickou myší), mp (jen MP a čekání 60 s).
 * Python (timery) hlásí řádky "AUTO_*" do konzole; scan() v main.js je přepošle jako telEvent. */
import { telEvent as _telEvent } from "./telemetry.js";
const telEvent = (k, d) => { if (k === "auto_done") window.__AUTO_DONE = d.name; _telEvent(k, d); };

const _q = new URLSearchParams(location.search);
export const AUTO = _q.get("auto") || "";

const PY_HEAD = `import bpy, sys, os
def _say(s):
    print(s); sys.stdout.flush()
def _v3d():
    for a in bpy.context.window_manager.windows[0].screen.areas:
        if a.type == 'VIEW_3D': return a
def _mp():
    a = _v3d()
    if a: a.spaces[0].shading.type = 'MATERIAL'
    _say('AUTO_STEP mp_on')
    return None
def _gated(fn):                               # čeká na /tmp/auto_go (JS ho zapíše, až je Blender zahřátý)
    def _poll():
        if os.path.exists('/tmp/auto_go'):
            fn(); return None
        return 1.0
    bpy.app.timers.register(_poll, first_interval=1.0)
`;
const PY = {
  light: PY_HEAD + `
_n = [0]
def _move():
    L = bpy.data.objects.get('Light')
    if L is None or _n[0] >= 10:
        _say('AUTO_DONE light'); return None
    _n[0] += 1
    L.location.x = 4.0 * (-1 if _n[0] % 2 else 1); L.location.z = 3.0 + 0.4 * _n[0]
    _say('AUTO_STEP light_%d' % _n[0])
    return 1.0
_gated(lambda: (_mp(), bpy.app.timers.register(_move, first_interval=4.0)))`,
  lightdrag: PY_HEAD + `
def _sel():
    L = bpy.data.objects.get('Light')
    bpy.ops.object.select_all(action='DESELECT')
    L.select_set(True); bpy.context.view_layer.objects.active = L
    _say('AUTO_STEP light_selected'); _say('AUTO_DRAG_READY')
    return None
_gated(lambda: (_mp(), bpy.app.timers.register(_sel, first_interval=4.0)))`,
  orbit: PY_HEAD + `
_gated(lambda: (_mp(), bpy.app.timers.register(lambda: (_say('AUTO_ORBIT_READY'), None)[1], first_interval=4.0)))`,
  soak: PY_HEAD + `
import math, time
_t0 = [0.0]; _k = [0]
def _soak():
    if not _t0[0]: _t0[0] = time.time()
    el = time.time() - _t0[0]
    if el > float(SOAK_SEC):
        _say('AUTO_DONE soak'); return None
    _k[0] += 1; k = _k[0]
    L = bpy.data.objects.get('Light')
    if L and 'l' in 'SOAK_MODE': L.location.x = 4.0 * math.sin(k / 5.0); L.location.z = 4.0 + math.cos(k / 3.0)
    ob = bpy.data.objects.get('Cube')
    if ob and 'm' in 'SOAK_MODE':
        if not ob.data.materials:
            m = bpy.data.materials.new('SoakMat'); m.use_nodes = True; ob.data.materials.append(m)
        ob.data.materials[0].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (abs(math.sin(k / 7.0)), abs(math.cos(k / 11.0)), 0.3, 1.0)
    a = _v3d()
    if a and 'o' in 'SOAK_MODE': a.spaces[0].region_3d.view_rotation.rotate(__import__('mathutils').Euler((0, 0, 0.05)))
    if k % 30 == 0: _say('AUTO_STEP soak_%ds' % int(el))
    return 1.0
_gated(lambda: (_mp(), bpy.app.timers.register(_soak, first_interval=4.0)))`.replace('SOAK_SEC', String(+_q.get("soaksec") || 600)).replace('SOAK_MODE', _q.get("soakmode") || "lmo"),
  mp: PY_HEAD + `
_gated(lambda: (_mp(), bpy.app.timers.register(lambda: (_say('AUTO_DONE mp'), None)[1], first_interval=60.0)))`,
};

export function autoArgs() { return PY[AUTO] ? ["--python-expr", PY[AUTO]] : []; }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const canvas = () => document.getElementById("canvas");
const mouse = (type, x, y, button = 0, buttons = 0) => canvas().dispatchEvent(new MouseEvent(type, {
  bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button, buttons }));
const key = (type, code, k) => window.dispatchEvent(new KeyboardEvent(type, { code, key: k, bubbles: true, cancelable: true }));
const center = () => { const r = canvas().getBoundingClientRect(); return [r.left + r.width * 0.5, r.top + r.height * 0.45, r]; };

async function dismissSplash() {              /* úvodní splash je modální a polkne první události */
  const [cx, cy] = center();
  mouse("mousemove", cx, cy); await sleep(200);
  key("keydown", "Escape", "Escape"); await sleep(50); key("keyup", "Escape", "Escape"); await sleep(400);
}
async function drag() {                       /* G + pohyb myší + klik = přesun vybraného objektu */
  const [cx, cy] = center();
  await dismissSplash();
  mouse("mousemove", cx, cy); await sleep(300);
  key("keydown", "KeyG", "g"); await sleep(50); key("keyup", "KeyG", "g"); await sleep(300);
  for (let i = 1; i <= 120; i++) {            /* ~4 s, 30 Hz */
    mouse("mousemove", cx + 150 * Math.sin(i / 12), cy + 100 * Math.cos(i / 12)); await sleep(33);
  }
  mouse("mousedown", cx, cy, 0, 1); await sleep(70); mouse("mouseup", cx, cy, 0, 0);
  telEvent("auto_step", { name: "drag_done" }); telEvent("auto_done", { name: AUTO });
}
async function orbit() {                      /* střední tlačítko tažení = otáčení pohledu */
  const [cx, cy] = center();
  await dismissSplash();
  mouse("mousemove", cx, cy); await sleep(200);
  mouse("mousedown", cx, cy, 1, 4);
  for (let i = 1; i <= 150; i++) { mouse("mousemove", cx + 200 * Math.sin(i / 15), cy + 80 * Math.sin(i / 7), 1, 4); await sleep(33); }
  mouse("mouseup", cx, cy, 1, 0);
  telEvent("auto_done", { name: AUTO });
}

/* Zahřátí: shadery MP se překládají minuty (hlavní smyčka Blenderu stojí) → scénář startuje, až je snímek rychlý. */
let _warm = 0, _go = false;
export function autoStart() {
  if (!PY[AUTO]) return;
  const t0 = performance.now();
  let dtSeen = 9999, seenAt = 0;
  try { new BroadcastChannel("blender-perf").onmessage = (e) => { dtSeen = e.data.dt_avg_ms; seenAt = performance.now(); }; } catch (_) {}
  const iv = setInterval(() => {
    if (_go) { clearInterval(iv); return; }
    const dt = performance.now() - seenAt < 3000 ? dtSeen : 9999;
    _warm = (window.__BGUI__ && window.__BGUI__.window && dt < 150) ? _warm + 1 : 0;
    if (_warm >= 3 || performance.now() - t0 > 120000 && window.__BGUI__ && window.__BGUI__.window) {
      try { window.Module.FS.writeFile("/tmp/auto_go", "1"); _go = true; telEvent("auto_step", { name: "go" }); } catch (e) { console.log("auto_go failed", e); }
    }
  }, 1000);
}

/* volá scan() v main.js pro každý řádek konzole */
export function autoScan(t) {
  if (!AUTO || !t.startsWith("AUTO_")) return;
  const s = t.trim();
  window.__AUTO_LOG = (window.__AUTO_LOG || []).concat(s);
  if (s === "AUTO_DRAG_READY") drag();
  else if (s === "AUTO_ORBIT_READY") orbit();
  else if (s.startsWith("AUTO_DONE")) telEvent("auto_done", { name: AUTO });
  else telEvent("auto_step", { name: s.slice(10) });
}

/* iPad: Lukáš jen otevře URL — Launch klikne stránka sama (po 2 s, ať se stihne vyhodnotit GPU/asset stav). */
/* Opakuje každou 1 s (max 10 min), dokud tlačítko není povolené: na iPadu přes tunel se assety stahují
 * déle než 2 s, tlačítko je pak ještě disabled a jednorázový klik se ztratil (relace i2hhlk: 15 min na "loading"). */
if (AUTO) {
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    const ack = document.getElementById("gpu-ack"); if (ack && !ack.checked) { ack.checked = true; ack.dispatchEvent(new Event("change", { bubbles: true })); }
    const b = document.getElementById("start-btn");
    if (b && !b.disabled) { b.click(); clearInterval(iv); telEvent("auto_launch", { after_s: tries + 1 }); }
    else if (tries >= 600) { clearInterval(iv); telEvent("auto_launch_fail", { btn: !!b, disabled: !!(b && b.disabled) }); }
    else if (tries % 30 === 0) telEvent("auto_launch_wait", { s: tries, btn: !!b, disabled: !!(b && b.disabled) });
  }, 1000);
}
