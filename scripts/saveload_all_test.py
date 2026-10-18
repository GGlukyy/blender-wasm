# Lov chyb kolo 66: bohatá scéna (modifikátory, částice, cloth, GN, materiály s uzly, GP, vlasy, textury, UV, animace) → uložit .blend → znovu otevřít → porovnat.
import bpy, sys, os
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object
ob.modifiers.new('S', 'SUBSURF'); ob.modifiers.new('B', 'BEVEL'); ob.modifiers.new('C', 'CLOTH'); ob.modifiers.new('A', 'ARRAY')
m = bpy.data.materials.new('MM'); m.use_nodes = True; nt = m.node_tree
n = nt.nodes.new('ShaderNodeTexNoise'); b = nt.nodes['Principled BSDF']; nt.links.new(n.outputs[0], b.inputs['Base Color']); ob.data.materials.append(m)
img = bpy.data.images.new('Img', 32, 32); img.pixels = [0.5] * 32 * 32 * 4; img.pack()
t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT')
ob.keyframe_insert('location', frame=1); ob.location.x = 3; ob.keyframe_insert('location', frame=40); ob.location.x = 0
ob.shape_key_add(name='Basis'); ob.shape_key_add(name='Key1')
bpy.ops.object.grease_pencil_add(type='MONKEY'); gp = bpy.context.object
h = bpy.data.hair_curves.new('H'); h.add_curves([4, 4]); ho = bpy.data.objects.new('H', h); bpy.context.collection.objects.link(ho)
bpy.ops.object.empty_add(); bpy.ops.object.light_add(type='AREA'); bpy.ops.object.camera_add()
ng = bpy.data.node_groups.new('GN', 'GeometryNodeTree'); ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
gi = ng.nodes.new('NodeGroupInput'); go = ng.nodes.new('NodeGroupOutput'); sub = ng.nodes.new('GeometryNodeSubdivideMesh'); ng.links.new(gi.outputs[0], sub.inputs[0]); ng.links.new(sub.outputs[0], go.inputs[0])
bpy.ops.mesh.primitive_cube_add(location=(5, 0, 0)); c = bpy.context.object; md = c.modifiers.new('GN', 'NODES'); md.node_group = ng
sc.sequence_editor_create()
ob_name = ob.name
bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
# datablocky bez uživatelů (osiřelé) se neukládají — počítat jen použité
count = lambda k: len([d for d in getattr(bpy.data, k) if d.users > 0])
before = {k: count(k) for k in ('objects', 'meshes', 'materials', 'images', 'node_groups', 'hair_curves', 'grease_pencils', 'particles', 'textures')}
mats_before = sorted((d.name, d.users, d.is_grease_pencil) for d in bpy.data.materials if d.users > 0)
out('OPS_INFO before', before, 'mats', mats_before)
state = {'step': 0}
P = '/tmp/saveload_all.blend'
def tick():
    s = state['step']; state['step'] += 1
    try:
        if s == 0:
            bpy.ops.wm.save_as_mainfile(filepath=P, check_existing=False); out('OPS saveload saved', os.path.getsize(P)); return 1.5
        if s == 1:
            bpy.ops.wm.open_mainfile(filepath=P); out('OPS saveload opened'); return 3.0
        if s == 2:
            after = {k: count(k) for k in before}
            out('OPS saveload mats after', sorted((d.name, d.users, d.is_grease_pencil) for d in bpy.data.materials if d.users > 0))
            ok = after == before; out('OPS saveload compare', 'PASS' if ok else 'FAIL', {k: (before[k], after[k]) for k in before if before[k] != after[k]})
            ob2 = bpy.data.objects.get(ob_name); ok2 = ob2 is not None and len(ob2.modifiers) == 4 and bpy.data.images['Img'].packed_file is not None
            out('OPS saveload details', 'PASS' if ok2 else 'FAIL')
            bpy.ops.wm.save_as_mainfile(filepath='/tmp/saveload_all2.blend', check_existing=False); out('OPS saveload resaved', os.path.getsize('/tmp/saveload_all2.blend')); return 1.0
    except BaseException as e:
        out('OPS saveload ERR', s, type(e).__name__, str(e)[:120])
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=2.0, persistent=True)
