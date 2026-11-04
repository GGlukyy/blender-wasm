// Blender Web MCP (M1): lets an AI client drive this Blender tab through a local relay (mcp/relay.mjs).
// OFF unless the page is opened with ?mcp=ws://127.0.0.1:PORT&mcptoken=TOKEN (explicit user action).
// The page only connects OUT; it never listens. Only ws://localhost / 127.0.0.1 or wss:// is accepted.
// Channel to Python: files in MEMFS (/tmp/mcp_in.json -> timer in Blender -> /tmp/mcp_out.json).

const IN = "/tmp/mcp_in.json", OUT = "/tmp/mcp_out.json";

export function mcpConfig(qp) {
  const url = qp.get("mcp"), token = qp.get("mcptoken");
  if (!url || !token) return null;
  let u; try { u = new URL(url); } catch { return null; }
  const local = u.protocol === "ws:" && (u.hostname === "127.0.0.1" || u.hostname === "localhost");
  if (!local && u.protocol !== "wss:") { console.warn("MCP: only ws://localhost or wss:// allowed"); return null; }
  return { url: u.toString(), token };
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
bpy.app.timers.register(_mcp_tick, first_interval=1.0, persistent=True)
print('MCP python ready')
`;

export function mcpPyArgs(cfg) { return cfg ? ["--python-expr", PY] : []; }

export function startMcp(cfg, canvas, log) {
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
  const connect = () => {
    const ws = new WebSocket(cfg.url + (cfg.url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(cfg.token));
    ws.onopen = () => log("MCP: connected to relay");
    ws.onclose = () => { setTimeout(connect, 3000); };
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      busy = busy.then(async () => {
        try {
          const result = m.cmd === "get_viewport_screenshot" ? await screenshot(m.params.max_size) : await py(m.cmd, m.params);
          ws.send(JSON.stringify({ id: m.id, result }));
        } catch (e) { ws.send(JSON.stringify({ id: m.id, error: String(e.message || e) })); }
      });
    };
  };
  connect();
}
