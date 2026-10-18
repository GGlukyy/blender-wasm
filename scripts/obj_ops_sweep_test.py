# Lov chyb kolo 66: všechny bpy.ops.object.* operátory s výchozími parametry (čerstvá scéna, vše vybráno).
# Hlásí výjimky (RuntimeError = operátor nelze, očekávané u poll fail) a hlavně zamrznutí/pád (poslední vypsaný operátor).
import bpy, sys, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
names = sorted(n for n in dir(bpy.ops.object) if not n.startswith('_'))
skip = {'delete', 'select_all', 'mode_set', 'transform_apply_all', 'quadriflow_remesh', 'voxel_remesh', 'duplicates_make_real', 'bake', 'bake_image', 'lightprobe_cache_bake', 'light_linking_blocker_collection_new', 'knife_tool', 'loopcut_slide', 'dupli_extrude_cursor', 'primitive_cube_add_gizmo', 'select_random', 'bevel', 'inset', 'extrude_region_move', 'extrude_context_move', 'extrude_faces_move', 'extrude_edges_move', 'extrude_vertices_move', 'extrude_manifold', 'rip_move', 'rip_edge_move', 'duplicate_move', 'edge_rotate',}
out('OPS_INFO mesh ops', len(names))
state = {'i': 0, 'err': 0, 'ok': 0, 'poll': 0}
def fresh():
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_monkey_add(); bpy.ops.mesh.primitive_uv_sphere_add(location=(3, 0, 0)); bpy.ops.object.empty_add(location=(0, 3, 0)); bpy.ops.object.light_add(type='POINT'); bpy.ops.object.camera_add(location=(0, -6, 0))
    bpy.ops.object.select_all(action='SELECT')
def tick():
    i = state['i']
    if i >= len(names):
        out('OPS_DONE ok=%d poll_fail=%d err=%d' % (state['ok'], state['poll'], state['err'])); return None
    n = names[i]; state['i'] += 1
    if n in skip or n.startswith(('primitive_', 'light_add', 'camera_add', 'empty_add', 'armature_add', 'gpencil', 'grease_pencil_add', 'text_add', 'volume_add', 'curves_empty', 'metaball_add', 'effector_add', 'lightprobe_add', 'speaker_add', 'collection_instance_add', 'load_', 'drop_', 'data_instance_add')):
        return 0.05
    out('OPS obj_sweep try', n)
    try:
        fresh()
        r = getattr(bpy.ops.object, n)()
        state['ok'] += 1
    except RuntimeError as e:
        msg = str(e)
        if 'poll' in msg or 'context is incorrect' in msg or 'Operator' in msg and 'failed' in msg: state['poll'] += 1
        else:
            state['err'] += 1; out('OPS obj_sweep ERR', n, msg[:140].replace('\n', ' '))
    except BaseException as e:
        state['err'] += 1; out('OPS obj_sweep ERR', n, type(e).__name__, str(e)[:100])
    return 0.05
bpy.app.timers.register(tick, first_interval=1.5)
