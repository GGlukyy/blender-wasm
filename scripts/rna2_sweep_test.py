# Lov chyb kolo 66: obecný RNA sweep — pro vybrané struktury každou skalární vlastnost znovu přiřadit (spustí update funkce),
# booleany přepnout, enumy projít. Pád = nedoběhne (poslední „OPS rna set“ je viník). Rekurze do vnořených struktur (hloubka 2).
import bpy, sys
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
import bpy as _b
ps = _b.data.particles.new('PS'); ob.modifiers.new('P', 'PARTICLE_SYSTEM'); ob.particle_systems[0].settings = ps
ob.modifiers.new('C', 'CLOTH'); ob.modifiers.new('SB', 'SOFT_BODY'); ob.modifiers.new('CO', 'COLLISION')
bpy.ops.object.modifier_add(type='FLUID') if hasattr(bpy.ops.object, 'modifier_add') and False else None
tex_objs = []
for tt in ('CLOUDS', 'WOOD', 'MARBLE', 'MAGIC', 'BLEND', 'STUCCI', 'NOISE', 'MUSGRAVE', 'VORONOI', 'DISTORTED_NOISE', 'IMAGE'):
    try: tex_objs.append((tt, bpy.data.textures.new(tt, tt)))
    except Exception: pass
brush_roots = [('brush.' + b.name, b) for b in list(bpy.data.brushes)[:60]]
roots = [('particle', ps), ('cloth', ob.modifiers['C'].settings), ('cloth.coll', ob.modifiers['C'].collision_settings), ('softbody', ob.modifiers['SB'].settings),
         ('collision', ob.collision), ('freestyle', bpy.context.view_layer.freestyle_settings),
         ('image_settings', sc.render.image_settings), ('ffmpeg', sc.render.ffmpeg), ('bake', sc.render.bake), ('gravity', sc), ('safe', sc.safe_areas),
         ('sequencer', sc.sequence_editor_create() or sc.sequence_editor), ('keying', sc.keying_sets), ('timeline_markers', sc)] + [('tex.' + n, t) for n, t in tex_objs] + brush_roots
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
for label, st in roots: collect(label, st, 0)
BAD = {('render', 'engine'), ('scene', 'frame_current')}
steps = [s for s in steps if (s[0], s[2]) not in BAD and not (s[3] == 'toggle' and s[2] in ('use_nodes',))]
out('OPS_INFO rna steps', len(steps))
state = {'i': 0}
def tick():
    for _ in range(25):   # dávka kroků na tick (rychlejší sweep)
        i = state['i']
        if i >= len(steps):
            out('OPS_DONE'); return None
        label, st, pid, how = steps[i]; state['i'] += 1
        out('OPS rna set', label, pid, how)
        try:
            cur = getattr(st, pid)
            if how == 'toggle': setattr(st, pid, not cur)
            elif how == 'same': setattr(st, pid, cur)
            else: setattr(st, pid, how)
        except BaseException:
            pass
    return 0.05
bpy.app.timers.register(tick, first_interval=1.5)
