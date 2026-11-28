# F4: Mantaflow bake (kapalina + kouř) 12 snímků do cache, pak počty z evaluovaného meshe / hustota = desktop 5.3.0 (DESK=1).
import bpy, os, sys, shutil, time
def out(*a): print(*a); sys.stdout.flush()
D = 'C:/Users/lukil/p2win/out/v2fl' if os.environ.get('DESK') == '1' else '/tmp/v2fl'
def setup(kind):
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, 12; sc.frame_set(1)
    bpy.ops.mesh.primitive_cube_add(size=4); dom = bpy.context.object; dom.name = 'Dom'
    bpy.ops.object.modifier_add(type='FLUID'); m = dom.modifiers['Fluid']; m.fluid_type = 'DOMAIN'; ds = m.domain_settings
    ds.domain_type = kind; ds.resolution_max = 24; ds.cache_frame_start = 1; ds.cache_frame_end = 12
    p = '%s/%s' % (D, kind.lower()); shutil.rmtree(p, ignore_errors=True); ds.cache_directory = p; ds.cache_type = 'ALL'
    if kind == 'LIQUID': ds.use_mesh = True
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, 0.8)); fl = bpy.context.object
    bpy.ops.object.modifier_add(type='FLUID'); f = fl.modifiers['Fluid']; f.fluid_type = 'FLOW'
    f.flow_settings.flow_type = 'LIQUID' if kind == 'LIQUID' else 'SMOKE'; f.flow_settings.flow_behavior = 'INFLOW'
    return dom
def run():
    for kind in ('LIQUID', 'GAS'):
        try:
            dom = setup(kind); bpy.context.view_layer.objects.active = dom
            t0 = time.time()
            with bpy.context.temp_override(active_object=dom, object=dom):
                r = bpy.ops.fluid.bake_all()
            dt = round(time.time() - t0, 1)
            files = sum(len(fs) for _, _, fs in os.walk(dom.modifiers['Fluid'].domain_settings.cache_directory))
            bpy.context.scene.frame_set(12)
            ev = dom.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
            info = 'v=%d' % len(ev.vertices) if kind == 'LIQUID' else 'dens=%d' % sum(1 for x in dom.modifiers['Fluid'].domain_settings.density_grid if x > 0.01)
            out('OPS v2fl', kind, r, 'files=%d' % files, info); out('OPS v2fl_time', kind, dt)
        except Exception as e:
            out('OPS v2fl', kind, 'ERR', str(e).strip().splitlines()[-1][:100])
    out('OPS_DONE')
if os.environ.get('DESK') == '1': run()
else: bpy.app.timers.register(lambda: run(), first_interval=1.0)
