// Blender Web MCP (M1): lets an AI client drive this Blender tab through a local relay (mcp/relay.mjs).
// OFF unless the user connects: either the page is opened with ?mcp=ws://127.0.0.1:PORT&mcptoken=TOKEN, or the
// "Blender Web MCP" add-on (disabled by default, written into the user add-ons dir at boot) is enabled in
// Preferences and its Connect button is pressed (add-on -> /tmp/mcp_ctl.json -> this bridge).
// The page only connects OUT; it never listens. Only ws://localhost / 127.0.0.1 or wss:// is accepted.
// Channel to Python: files in MEMFS (/tmp/mcp_in.json -> timer in Blender -> /tmp/mcp_out.json).

const IN = "/tmp/mcp_in.json", OUT = "/tmp/mcp_out.json", CTL = "/tmp/mcp_ctl.json", STATUS = "/tmp/mcp_status.json";

/** Returns {url, token} for an allowed relay URL, or {error}. */
export function mcpValidate(url, token) {
  if (!url || !token) return { error: "URL and token are required" };
  let u; try { u = new URL(url); } catch { return { error: "invalid URL" }; }
  const local = u.protocol === "ws:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
  if (!local && u.protocol !== "wss:") return { error: "only ws://localhost or wss:// allowed" };
  return { url: u.toString(), token };
}

export function mcpConfig(qp) {
  const r = mcpValidate(qp.get("mcp"), qp.get("mcptoken"));
  if (r.error) { if (qp.get("mcp")) console.warn("MCP: " + r.error); return null; }
  return r;
}

const PY = String.raw`
import bpy, os, json, io, contextlib, traceback
_IN, _OUT = '/tmp/mcp_in.json', '/tmp/mcp_out.json'
_ns = {'bpy': bpy, '__name__': 'mcp_exec'}
def _obj_info(o):
    d = {'name': o.name, 'type': o.type, 'location': list(o.location), 'rotation_euler': list(o.rotation_euler),
         'scale': list(o.scale), 'dimensions': list(o.dimensions), 'visible': o.visible_get(),
         'parent': o.parent.name if o.parent else None,
         'materials': [s.material.name for s in o.material_slots if s.material]}
    if o.type == 'MESH':
        m = o.data
        d['mesh'] = {'vertices': len(m.vertices), 'edges': len(m.edges), 'polygons': len(m.polygons)}
    return d
def _handle(cmd, p):
    if cmd == 'get_scene_info':
        sc = bpy.context.scene
        return {'name': sc.name, 'frame': sc.frame_current, 'object_count': len(sc.objects),
                'active_object': bpy.context.view_layer.objects.active.name if bpy.context.view_layer.objects.active else None,
                'objects': [{'name': o.name, 'type': o.type, 'location': [round(v, 3) for v in o.location]} for o in list(sc.objects)[:50]]}
    if cmd == 'get_object_info':
        o = bpy.data.objects.get(p['name'])
        if o is None: raise ValueError('Object not found: ' + p['name'])
        return _obj_info(o)
    if cmd == 'execute_blender_code':
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            exec(p['code'], _ns)
        return buf.getvalue()
    raise ValueError('unknown command ' + cmd)
def _mcp_tick():
    if os.path.exists(_IN):
        try:
            with open(_IN) as f: req = json.load(f)
            os.remove(_IN)
            try: res = {'result': _handle(req['cmd'], req.get('params') or {})}
            except Exception: res = {'error': traceback.format_exc(limit=3)}
            with open(_OUT + '.tmp', 'w') as f: json.dump(res, f)
            os.replace(_OUT + '.tmp', _OUT)
        except Exception as e: print('MCP tick error', e)
    return 0.15
`;

const PY_LEGACY_TAIL = String.raw`
bpy.app.timers.register(_mcp_tick, first_interval=1.0, persistent=True)
print('MCP python ready')
`;

const ADDON_HEAD = String.raw`bl_info = {"name": "Blender Web MCP", "author": "blender-wasm", "version": (0, 1, 0), "blender": (5, 0, 0),
            "category": "System", "description": "Let an AI client (Claude etc.) drive this browser Blender through a local relay"}
`;

const ADDON_TAIL = String.raw`
_CTL, _ST = '/tmp/mcp_ctl.json', '/tmp/mcp_status.json'
def _status():
    try:
        with open(_ST) as f: return json.load(f)
    except Exception: return {'state': 'off', 'msg': ''}
def _send(d):
    with open(_CTL + '.tmp', 'w') as f: json.dump(d, f)
    os.replace(_CTL + '.tmp', _CTL)
class WebMCPPrefs(bpy.types.AddonPreferences):
    bl_idname = __name__
    url: bpy.props.StringProperty(name='Relay URL', default='ws://127.0.0.1:8765')
    token: bpy.props.StringProperty(name='Token', subtype='PASSWORD')
    def draw(self, context):
        l = self.layout; st = _status()
        l.prop(self, 'url'); l.prop(self, 'token')
        row = l.row(); row.operator('webmcp.connect', icon='LINKED'); row.operator('webmcp.disconnect', icon='UNLINKED')
        l.label(text='Status: ' + st.get('state', 'off') + ((' - ' + st['msg']) if st.get('msg') else ''))
        b = l.box()
        b.label(text='1. On your PC run:  node mcp/relay.mjs  (prints the URL and a token)')
        b.label(text='2. Paste URL + token here and press Connect (only ws://localhost or wss:// is allowed)')
        b.label(text='3. Add the relay as an MCP server in your AI client')
        b.label(text='Warning: the AI client can run any Python in this Blender. Keep the token secret.', icon='ERROR')
class WEBMCP_OT_connect(bpy.types.Operator):
    bl_idname = 'webmcp.connect'; bl_label = 'Connect'
    def execute(self, context):
        p = context.preferences.addons[__name__].preferences
        _send({'action': 'connect', 'url': p.url, 'token': p.token})
        return {'FINISHED'}
class WEBMCP_OT_disconnect(bpy.types.Operator):
    bl_idname = 'webmcp.disconnect'; bl_label = 'Disconnect'
    def execute(self, context):
        _send({'action': 'disconnect'})
        return {'FINISHED'}
_last = [None]
def _ui_tick():
    st = _status()
    if st != _last[0]:
        _last[0] = st
        for w in bpy.context.window_manager.windows:
            for a in w.screen.areas: a.tag_redraw()
    return 1.0
_classes = (WebMCPPrefs, WEBMCP_OT_connect, WEBMCP_OT_disconnect)
def register():
    for c in _classes: bpy.utils.register_class(c)
    bpy.app.timers.register(_mcp_tick, first_interval=1.0, persistent=True)
    bpy.app.timers.register(_ui_tick, first_interval=1.0, persistent=True)
def unregister():
    try: _send({'action': 'disconnect'})
    except Exception: pass
    for f in (_mcp_tick, _ui_tick):
        if bpy.app.timers.is_registered(f): bpy.app.timers.unregister(f)
    for c in reversed(_classes): bpy.utils.unregister_class(c)
`;

const ADDON_FILE = "blender_web_mcp.py";
const INSTALL_PY = `import bpy, os, json, sys
try:
    _d = bpy.utils.user_resource('SCRIPTS', path='addons', create=True)
    with open(os.path.join(_d, ${JSON.stringify(ADDON_FILE)}), 'w') as _f: _f.write(json.loads(${JSON.stringify(JSON.stringify(ADDON_HEAD + PY + ADDON_TAIL))}))
    if _d not in sys.path: sys.path.append(_d)
except Exception as _e: print('MCP add-on install failed', _e)
`;

/** --python-expr args: legacy ?mcp= handler (when configured) and always the disabled add-on file. */
export function mcpPyArgs(cfg) { return [...(cfg ? ["--python-expr", PY + PY_LEGACY_TAIL] : []), "--python-expr", INSTALL_PY]; }

/** Bridge to the relay. Returns {connect(cfg), disconnect()}; also polls CTL (written by the Python add-on). */
export function startMcp(cfg0, canvas, log) {
  const FS = () => window.Module && window.Module.FS;
  let busy = Promise.resolve();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const py = async (cmd, params) => {
    const fs = FS();
    try { fs.unlink(OUT); } catch {}
    fs.writeFile(IN, JSON.stringify({ cmd, params }));
    for (let i = 0; i < 400; i++) { // 60 s
      await sleep(150);
      if (fs.analyzePath(OUT).exists) {
        const r = JSON.parse(new TextDecoder().decode(fs.readFile(OUT))); fs.unlink(OUT);
        if (r.error) throw new Error(r.error);
        return r.result;
      }
    }
    throw new Error("Blender Python did not answer");
  };
  const screenshot = (max) => new Promise((res, rej) => requestAnimationFrame(async () => {
    try {
      const bmp = await createImageBitmap(canvas);
      const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas"); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      res({ png_base64: c.toDataURL("image/png").split(",")[1], width: c.width, height: c.height });
    } catch (e) { rej(e); }
  }));
  let cfg = null, ws = null, timer = null;
  /* unlink first: wasmfs writeFile does not truncate, a shorter status would keep the old tail and break json.load */
  const setStatus = (state, msg = "") => { try { try { FS().unlink(STATUS); } catch {} FS().writeFile(STATUS, JSON.stringify({ state, msg })); } catch {} };
  const open = () => {
    if (!cfg) return;
    setStatus("connecting");
    const s = new WebSocket(cfg.url + (cfg.url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(cfg.token));
    ws = s;
    s.onopen = () => { setStatus("connected"); log("MCP: connected to relay"); };
    s.onerror = () => { if (ws === s) setStatus("error", "relay not reachable or wrong token (retrying)"); };
    s.onclose = () => { if (ws !== s) return; ws = null; if (cfg) timer = setTimeout(open, 3000); };
    s.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      busy = busy.then(async () => {
        try {
          const result = m.cmd === "get_viewport_screenshot" ? await screenshot(m.params.max_size) : await py(m.cmd, m.params);
          s.send(JSON.stringify({ id: m.id, result }));
        } catch (e) { s.send(JSON.stringify({ id: m.id, error: String(e.message || e) })); }
      });
    };
  };
  const disconnect = () => {
    cfg = null; clearTimeout(timer); const s = ws; ws = null;
    if (s) try { s.close(); } catch {}
    setStatus("off");
  };
  const connect = (c) => { disconnect(); cfg = c; open(); };
  setInterval(() => {
    const fs = FS();
    if (!fs || !fs.analyzePath(CTL).exists) return;
    let d; try { d = JSON.parse(new TextDecoder().decode(fs.readFile(CTL))); fs.unlink(CTL); } catch { return; }
    if (d.action === "disconnect") disconnect();
    else if (d.action === "connect") {
      const r = mcpValidate(d.url, d.token);
      if (r.error) { disconnect(); setStatus("error", r.error); } else connect(r);
    }
  }, 500);
  if (cfg0) connect(cfg0);
  return { connect, disconnect };
}
