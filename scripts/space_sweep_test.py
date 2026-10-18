# Lov chyb kolo 66: každý typ editoru (ui_type) + přepnutí jeho boolean/enum vlastností; hledají se Traceback a nepřeložené shadery.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT')
ob.keyframe_insert('location', frame=1); ob.location.x = 3; ob.keyframe_insert('location', frame=30); ob.location.x = 0
sc.sequence_editor_create()
bpy.data.images.new('SW', 32, 32)
win = bpy.context.window_manager.windows[0]
area = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0]   # největší oblast = viewport; přepínáme jeho typ
types = [it.identifier for it in bpy.types.Area.bl_rna.properties['type'].enum_items]
out('OPS_INFO ui types', len(types), ','.join(types)[:200])
steps = []
for t in types:
    steps.append(('type', t, None))
state = {'i': 0, 'queue': []}
KNOWN_CRASH = {('proxy_render_size', 'NONE')}
def sp_props():
    sp = area.spaces.active; res = []
    for p in sp.bl_rna.properties:
        if p.identifier in ('rna_type', 'type', 'name') or p.is_readonly: continue
        if p.type == 'BOOLEAN' and not p.is_array: res.append((p.identifier, None))
        elif p.type == 'ENUM' and not p.is_enum_flag:
            for it in p.enum_items:
                if (p.identifier, it.identifier) in KNOWN_CRASH: continue   # BACKLOG: pád (memory access out of bounds)
                res.append((p.identifier, it.identifier))
    return res
def tick():
    q = state['queue']
    if not q:
        i = state['i']
        if i >= len(types):
            out('OPS_DONE'); return None
        t = types[i]; state['i'] += 1
        try:
            area.type = t; out('OPS space type', t)
            if t == 'NODE_EDITOR':
                for tt in ('ShaderNodeTree', 'CompositorNodeTree', 'TextureNodeTree', 'GeometryNodeTree'):
                    try: area.spaces.active.tree_type = tt
                    except BaseException: pass
            q.extend([] if t == 'SEQUENCE_EDITOR' else sp_props()[:40])   # BACKLOG: VSE náhled padá (OOB) při přepínání vlastností
        except BaseException as e:
            out('OPS space ERR type', t, type(e).__name__, str(e)[:100])
        return 0.6
    name, val = q.pop(0)
    out('OPS space toggle', area.type, name, val)
    try:
        sp = area.spaces.active
        if val is None: setattr(sp, name, not getattr(sp, name))
        else: setattr(sp, name, val)
    except BaseException as e:
        pass   # čtení-jen/nepodporované hodnoty v daném kontextu nejsou chyba
    return 0.08
bpy.app.timers.register(tick, first_interval=1.5)
