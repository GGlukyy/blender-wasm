# Lov chyb kolo 66: všechny bpy.ops.mesh.* operátory s výchozími parametry na čerstvé Suzanne v edit módu.
# Hlásí výjimky (RuntimeError = operátor nelze, očekávané u poll fail) a hlavně zamrznutí/pád (poslední vypsaný operátor).
import bpy, sys, bmesh
def out(*a):
    print(*a); sys.stdout.flush()
names = sorted(n for n in dir(bpy.ops.graph) if not n.startswith('_'))
skip = {'knife_tool', 'loopcut_slide', 'dupli_extrude_cursor', 'primitive_cube_add_gizmo', 'select_random', 'bevel', 'inset', 'extrude_region_move', 'extrude_context_move', 'extrude_faces_move', 'extrude_edges_move', 'extrude_vertices_move', 'extrude_manifold', 'rip_move', 'rip_edge_move', 'duplicate_move', 'edge_rotate',}
out('OPS_INFO mesh ops', len(names))
state = {'i': 0, 'err': 0, 'ok': 0, 'poll': 0}
def fresh():
    bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_monkey_add(); bpy.context.object.keyframe_insert('location', frame=1)
    bpy.ops.object.select_all(action='SELECT')
def tick():
    i = state['i']
    if i >= len(names):
        out('OPS_DONE ok=%d poll_fail=%d err=%d' % (state['ok'], state['poll'], state['err'])); return None
    n = names[i]; state['i'] += 1
    if n in skip or n.startswith(('quit', 'read_', 'open', 'save', 'load', 'window_', 'new', 'revert', 'recover', 'homefile', 'url_open', 'app_template', 'call_', 'search_menu', 'splash', 'copy_prev', 'previews', 'context_', 'radial', 'collection_', 'debug', 'memory', 'operator_', 'properties_', 'tool_', 'doc_', 'redraw_timer', 'batch', 'link', 'append', 'lib_', 'save_', 'read', 'sendmessage', 'sync', 'file_', 'extension', 'repo', 'pkg', 'blend_strings', 'gizmo', 'blenderplayer', 'report_', 'scene_', 'overwrite', 'handler', 'drop', 'export', 'import', 'render', 'duplicate_move', 'lock')) or n in ('quit_blender',):
        return 0.05
    out('OPS graph_sweep try', n)
    try:
        fresh()
        r = getattr(bpy.ops.graph, n)()
        state['ok'] += 1
    except RuntimeError as e:
        msg = str(e)
        if 'poll' in msg or 'context is incorrect' in msg or 'Operator' in msg and 'failed' in msg: state['poll'] += 1
        else:
            state['err'] += 1; out('OPS graph_sweep ERR', n, msg[:140].replace('\n', ' '))
    except BaseException as e:
        state['err'] += 1; out('OPS graph_sweep ERR', n, type(e).__name__, str(e)[:100])
    return 0.05
bpy.app.timers.register(tick, first_interval=1.5)
