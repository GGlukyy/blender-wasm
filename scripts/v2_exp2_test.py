# F6: další exportéry — UV layout PNG/SVG/EPS, Grease Pencil SVG/PDF, BVH, OBJ+MTL, SVG import zpět. Výsledek = soubor vznikl / chyba, = desktop.
import bpy, os, sys, shutil
def out(*a): print(*a); sys.stdout.flush()
D = 'C:/Users/lukil/p2win/out/v2e2' if os.environ.get('DESK') == '1' else '/tmp/v2e2'
def ok(name, fn, path):
    try:
        r = fn(); ex = os.path.exists(path) and os.path.getsize(path) > 0
        out('OPS v2e2', name, sorted(r) if isinstance(r, set) else r, 'file=%s' % ex)
    except Exception as e:
        out('OPS v2e2', name, 'ERR', str(e).strip().splitlines()[-1][:90])
def run():
    shutil.rmtree(D, ignore_errors=True); os.makedirs(D)
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    bpy.ops.mesh.primitive_monkey_add(); o = bpy.context.object
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    for m in ('PNG', 'SVG', 'EPS'):
        p = '%s/uv_%s.%s' % (D, m, m.lower())
        ok('uv_' + m, lambda: bpy.ops.uv.export_layout(filepath=p, mode=m, size=(256, 256)), p)
    bpy.ops.object.mode_set(mode='OBJECT')
    p = D + '/m.obj'; ok('obj_mtl', lambda: bpy.ops.wm.obj_export(filepath=p, export_materials=True), p)
    out('OPS v2e2 mtl_exists', os.path.exists(D + '/m.mtl'))
    bpy.ops.object.armature_add(); p = D + '/a.bvh'
    ok('bvh', lambda: bpy.ops.export_anim.bvh(filepath=p, frame_start=1, frame_end=3), p)
    ok('bvh_import', lambda: bpy.ops.import_anim.bvh(filepath=p), p)
    bpy.ops.object.grease_pencil_add(type='MONKEY'); g = bpy.context.object
    p = D + '/g.svg'; ok('gp_svg', lambda: bpy.ops.wm.grease_pencil_export_svg(filepath=p), p)
    p2 = D + '/g.pdf'
    if hasattr(bpy.ops.wm, 'grease_pencil_export_pdf'): ok('gp_pdf', lambda: bpy.ops.wm.grease_pencil_export_pdf(filepath=p2), p2)
    else: out('OPS v2e2 gp_pdf NOOP')
    ok('svg_import', lambda: bpy.ops.import_curve.svg(filepath=p), p)
    out('OPS v2e2 curves', len([x for x in bpy.data.objects if x.type == 'CURVE']))
    ok('gp_svg_import', lambda: bpy.ops.wm.grease_pencil_import_svg(filepath=p), p)
    out('OPS_DONE')
if os.environ.get('DESK') == '1': run()
else: bpy.app.timers.register(lambda: run(), first_interval=1.0)
