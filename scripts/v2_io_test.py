# V2i: export → import 3D formátů (OBJ, FBX, glTF GLB/separate, STL, PLY) — počty, UV, materiály, rozměry = desktop 5.3.0.
# Stejný skript na desktopu (DESK=1). Výstup 'OPS v2io <fmt> obj=.. v=.. f=.. uv=.. mat=[..] dim=[..]'.
import bpy, os, sys, shutil
def out(*a): print(*a); sys.stdout.flush()
D = 'C:/Users/lukil/p2win/out/v2io' if os.environ.get('DESK') == '1' else '/tmp/v2io'
shutil.rmtree(D, ignore_errors=True); os.makedirs(D)
def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
def scene():
    clear()
    bpy.ops.mesh.primitive_monkey_add(location=(0, 0, 0)); o = bpy.context.active_object; o.name = 'Opice'
    m = o.modifiers.new('s', 'SUBSURF'); m.levels = 1
    mat = bpy.data.materials.new('Cervena'); mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.8, 0.1, 0.1, 1); o.data.materials.append(mat)
    bpy.ops.mesh.primitive_cube_add(location=(3, 0, 0), size=1.5); c = bpy.context.active_object; c.name = 'Kostka'; c.rotation_euler = (0.3, 0, 0.5)
    for ob in bpy.data.objects: ob.select_set(True)
def stats(fmt):
    obs = [o for o in bpy.data.objects if o.type == 'MESH']
    v = sum(len(o.data.vertices) for o in obs); f = sum(len(o.data.polygons) for o in obs)
    uv = sorted(len(o.data.uv_layers) for o in obs); mats = sorted({s.material.name.split('.')[0] for o in obs for s in o.material_slots if s.material})
    xs = [ (o.matrix_world @ vv.co) for o in obs for vv in o.data.vertices]
    dim = [round(max(p[k] for p in xs) - min(p[k] for p in xs), 2) for k in range(3)] if xs else []
    out('OPS v2io', fmt, 'obj=%d v=%d f=%d uv=%s mat=%s dim=%s' % (len(obs), v, f, uv, mats, dim))
E = [('obj', lambda p: bpy.ops.wm.obj_export(filepath=p, export_selected_objects=False), lambda p: bpy.ops.wm.obj_import(filepath=p), '.obj'),
     ('fbx', lambda p: bpy.ops.export_scene.fbx(filepath=p), lambda p: bpy.ops.import_scene.fbx(filepath=p), '.fbx'),
     ('glb', lambda p: bpy.ops.export_scene.gltf(filepath=p, export_format='GLB'), lambda p: bpy.ops.import_scene.gltf(filepath=p), '.glb'),
     ('gltf_sep', lambda p: bpy.ops.export_scene.gltf(filepath=p, export_format='GLTF_SEPARATE'), lambda p: bpy.ops.import_scene.gltf(filepath=p), '.gltf'),
     ('stl', lambda p: bpy.ops.wm.stl_export(filepath=p), lambda p: bpy.ops.wm.stl_import(filepath=p), '.stl'),
     ('stl_ascii', lambda p: bpy.ops.wm.stl_export(filepath=p, ascii_format=True), lambda p: bpy.ops.wm.stl_import(filepath=p), '.stl'),
     ('ply', lambda p: bpy.ops.wm.ply_export(filepath=p), lambda p: bpy.ops.wm.ply_import(filepath=p), '.ply'),
     ('ply_ascii', lambda p: bpy.ops.wm.ply_export(filepath=p, ascii_format=True), lambda p: bpy.ops.wm.ply_import(filepath=p), '.ply')]
def run():
    scene(); stats('source')
    for fmt, ex, im, ext in E:
        p = '%s/t_%s%s' % (D, fmt, ext)
        try:
            scene(); ex(p); clear(); im(p); stats(fmt)
        except Exception as e:
            out('OPS v2io', fmt, 'ERR', str(e).strip().splitlines()[-1][:80])
    out('OPS_DONE')
if os.environ.get('DESK') == '1': run()
else: bpy.app.timers.register(lambda: run(), first_interval=1.0)
