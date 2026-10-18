# Lov chyb kolo 66: každá bool/enum položka preferences (view/edit/system/inputs/filepaths/studio lights…) → přepnout, nechat překreslit.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); bpy.ops.object.shade_smooth()
prefs = bpy.context.preferences
groups = ['view', 'edit', 'system', 'inputs', 'filepaths']
skip = {'tablet_api', 'ui_scale', 'ui_line_width', 'dpi', 'pixel_size', 'use_online_access', 'use_auto_save_temporary_files', 'use_save_preview_images', 'is_dirty', 'show_developer_ui'}
steps = []
for g in groups:
    obj = getattr(prefs, g)
    for p in obj.bl_rna.properties:
        if p.identifier in ('rna_type', 'name') or p.is_readonly or p.identifier in skip: continue
        if p.type == 'BOOLEAN' and not p.is_array: steps.append((g, p.identifier, None))
        elif p.type == 'ENUM' and not p.is_enum_flag:
            for it in p.enum_items: steps.append((g, p.identifier, it.identifier))
out('OPS_INFO prefs steps', len(steps))
state = {'i': 0, 'orig': {}}
def tick():
    i = state['i']
    if i >= len(steps):
        out('OPS_DONE'); return None
    g, n, v = steps[i]; state['i'] += 1
    obj = getattr(prefs, g)
    out('OPS prefs set', g, n, v)
    try:
        if (g, n) not in state['orig']: state['orig'][(g, n)] = getattr(obj, n)
        if v is None: setattr(obj, n, not getattr(obj, n))
        else: setattr(obj, n, v)
    except BaseException as e:
        out('OPS prefs ERR', g, n, v, type(e).__name__, str(e)[:80])
    return 0.25
bpy.app.timers.register(tick, first_interval=1.5)
