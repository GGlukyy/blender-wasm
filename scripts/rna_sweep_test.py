# Lov chyb kolo 66: obecný RNA sweep — pro vybrané struktury každou skalární vlastnost znovu přiřadit (spustí update funkce),
# booleany přepnout, enumy projít. Pád = nedoběhne (poslední „OPS rna set“ je viník). Rekurze do vnořených struktur (hloubka 2).
import bpy, sys, os
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object
m = bpy.data.materials.new('M'); m.use_nodes = True; ob.data.materials.append(m)
bpy.ops.object.camera_add(); cam = bpy.context.object
bpy.ops.object.light_add(type='SPOT'); lamp = bpy.context.object
bpy.ops.object.armature_add(); arm = bpy.context.object
bpy.ops.curve.primitive_bezier_curve_add(); cur = bpy.context.object
ob.modifiers.new('S', 'SUBSURF'); ob.modifiers.new('B', 'BEVEL')
win = bpy.context.window_manager.windows[0]
v3d = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0].spaces.active
roots = [('scene', sc), ('render', sc.render), ('eevee', sc.eevee), ('display', sc.display), ('view_settings', sc.view_settings), ('tool_settings', sc.tool_settings),
         ('view_layer', bpy.context.view_layer), ('world', sc.world), ('object', ob), ('mesh', ob.data), ('material', m), ('camera', cam.data), ('light', lamp.data),
         ('armature', arm.data), ('curve', cur.data), ('v3d', v3d), ('v3d.shading', v3d.shading), ('v3d.overlay', v3d.overlay), ('v3d.cursor', sc.cursor),
         ('unit', sc.unit_settings), ('mod.subsurf', ob.modifiers['S']), ('mod.bevel', ob.modifiers['B']), ('timeline', sc), ('gp', None)]
SKIP = {'rna_type', 'name', 'name_full', 'bl_rna', 'id_data', 'original', 'users', 'session_uid', 'is_evaluated', 'library', 'override_library', 'preview', 'asset_data', 'tag', 'is_runtime_data'}
steps = []
seen = set()
def collect(label, st, depth):
    if st is None or depth > 2: return
    try: key = st.as_pointer()
    except Exception: key = id(st)
    if (label, key) in seen: return
    seen.add((label, key))
    for p in st.bl_rna.properties:
        pid = p.identifier
        if pid in SKIP: continue
        if p.type == 'POINTER':
            try:
                sub = getattr(st, pid)
                if sub is not None and not isinstance(sub, bpy.types.ID): collect(label + '.' + pid, sub, depth + 1)
            except Exception: pass
            continue
        if p.type == 'COLLECTION' or p.is_readonly: continue
        if p.type == 'BOOLEAN' and not p.is_array: steps.append((label, st, pid, 'toggle'))
        elif p.type == 'ENUM' and not p.is_enum_flag:
            for it in p.enum_items: steps.append((label, st, pid, it.identifier))
        elif p.type in ('INT', 'FLOAT') and not p.is_array: steps.append((label, st, pid, 'same'))
ROOTS = globals().get('RNA_ROOTS')   # zúžení (OPS_PRE): čárkou oddělené labely kořenů, např. 'view_layer,world'
if ROOTS: roots = [r for r in roots if r[0] in ROOTS.split(',')]
SKIPSUB = [x for x in globals().get('RNA_SKIP', '').split(',') if x]   # podřetězce labelů k vynechání, např. 'depsgraph'
for label, st in roots: collect(label, st, 0)
if SKIPSUB: steps = [s for s in steps if not any(x in s[0] for x in SKIPSUB)]
ONLYSUB = [x for x in globals().get('RNA_ONLY', '').split(',') if x]   # jen labely s podřetězcem, např. 'depsgraph' (zápisy do vyhodnocených kopií)
if ONLYSUB: steps = [s for s in steps if any(x in s[0] for x in ONLYSUB)]
BAD = {('render', 'engine'), ('scene', 'frame_current')}
steps = [s for s in steps if (s[0], s[2]) not in BAD and not (s[3] == 'toggle' and s[2] in ('use_nodes',))]
out('OPS_INFO rna steps', len(steps))
def fresh(label, st):
    # vyhodnocené kopie (view_layer.depsgraph.*) se po každém přepočtu depsgraphu uvolní; držet starý pointer = use-after-free (pád jen na wasm 5.3)
    if '.depsgraph' not in label: return st
    try:
        o = bpy.context.view_layer
        for part in label.split('.')[1:]: o = getattr(o, part)
        return o
    except Exception: return st
state = {'i': 0}
def tick():
    for _ in range(25):   # dávka kroků na tick (rychlejší sweep)
        i = state['i']
        if i >= len(steps):
            out('OPS_DONE')
            if os.environ.get('RNA_QUIT'): bpy.ops.wm.quit_blender()   # desktop 3b běh (rna_sweep_desktop.sh)
            return None
        label, st, pid, how = steps[i]; state['i'] += 1
        out('OPS rna set', label, pid, how)
        st = fresh(label, st)
        try:
            cur = getattr(st, pid)
            if how == 'toggle': setattr(st, pid, not cur)
            elif how == 'same': setattr(st, pid, cur)
            else: setattr(st, pid, how)
        except BaseException:
            pass
    return 0.05
bpy.app.timers.register(tick, first_interval=1.5)
