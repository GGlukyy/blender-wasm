# Fuzz: náhodné modelovací operace + undo/redo + přepínání módů (seed pevný → reprodukovatelné). Hledá pády wasm (trap), ne chyby operátorů.
import bpy, bmesh, random, sys
def out(*a):
    print(*a); sys.stdout.flush()
SEED = 7; N = 400
rnd = random.Random(SEED)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
ob = bpy.context.view_layer.objects.active
O = bpy.ops
def sel_random():
    bm = bmesh.from_edit_mesh(ob.data)
    for v in bm.verts: v.select_set(rnd.random() < 0.5)
    bm.select_flush_mode(); bmesh.update_edit_mesh(ob.data)
EDIT_OPS = [
    lambda: O.mesh.extrude_region_move(TRANSFORM_OT_translate={'value': (0, 0, rnd.uniform(-1, 1))}),
    lambda: O.mesh.subdivide(number_cuts=rnd.randint(1, 2)), lambda: O.mesh.bevel(offset=rnd.uniform(0.01, 0.2), segments=rnd.randint(1, 3)),
    lambda: O.mesh.inset(thickness=rnd.uniform(0.01, 0.2)), lambda: O.mesh.delete(type=rnd.choice(['VERT', 'EDGE', 'FACE'])),
    lambda: O.mesh.merge(type='CENTER'), lambda: O.mesh.remove_doubles(), lambda: O.mesh.dissolve_verts(), lambda: O.mesh.dissolve_edges(),
    lambda: O.mesh.flip_normals(), lambda: O.mesh.fill(), lambda: O.mesh.edge_face_add(), lambda: O.mesh.duplicate_move(),
    lambda: O.mesh.separate(type='SELECTED'), lambda: O.mesh.split(), lambda: O.mesh.rip(), lambda: O.mesh.tris_convert_to_quads(),
    lambda: O.mesh.quads_convert_to_tris(), lambda: O.mesh.select_more(), lambda: O.mesh.select_less(), lambda: O.mesh.hide(unselected=False),
    lambda: O.mesh.reveal(), lambda: O.mesh.normals_make_consistent(), lambda: O.mesh.vertices_smooth(), lambda: O.mesh.loopcut_slide() if False else O.mesh.select_all(action='INVERT'),
    lambda: O.mesh.symmetrize(), lambda: O.mesh.poke(), lambda: O.mesh.solidify(thickness=0.05), lambda: O.mesh.bridge_edge_loops(),
]
done = {'i': 0, 'err': 0, 'n': 0}
def step():
    for _ in range(10):
        i = done['i']
        if i >= N:
            out('OPS fuzz PASS ops=%d operator_errors=%d' % (done['n'], done['err'])); out('OPS_DONE'); return None
        done['i'] += 1
        try:
            if bpy.context.object is None or ob.name not in bpy.data.objects:
                bpy.ops.mesh.primitive_cube_add()
                globals()['ob'] = bpy.context.view_layer.objects.active
            if ob.mode != 'EDIT':
                O.object.mode_set(mode='EDIT')
            r = rnd.random()
            if r < 0.15: O.ed.undo()
            elif r < 0.22: O.ed.redo()
            elif r < 0.28:
                O.object.mode_set(mode='OBJECT'); O.object.mode_set(mode='EDIT')
            else:
                if r < 0.45: sel_random()
                O.mesh.select_mode(type=rnd.choice(['VERT', 'EDGE', 'FACE']))
                rnd.choice(EDIT_OPS)()
            done['n'] += 1
        except RuntimeError as e:
            done['err'] += 1
        except ReferenceError:
            done['err'] += 1
            globals()['ob'] = bpy.context.view_layer.objects.active or ob
        if ob.mode == 'EDIT' and len(ob.data.vertices) > 20000:
            O.mesh.select_all(action='SELECT'); O.mesh.delete(type='VERT')
    return 0.05
bpy.app.timers.register(step, first_interval=0.5)
