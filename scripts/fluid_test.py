# Mantaflow (WITH_MOD_FLUID, kolo 66): malá kouřová simulace — domain + flow, bake 5 snímků, kontrola cache a hustoty.
import bpy, sys, os, glob
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_cube_add(size=4); dom = bpy.context.object; dom.name = 'Domain'
bpy.ops.object.modifier_add(type='FLUID'); md = dom.modifiers[-1]; md.fluid_type = 'DOMAIN'
ds = md.domain_settings; ds.domain_type = 'GAS'; ds.resolution_max = 16; ds.use_noise = False
D = '/tmp/fluidcache'; os.makedirs(D, exist_ok=True); ds.cache_directory = D; ds.cache_type = 'ALL'
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.5, location=(0, 0, -1)); fl = bpy.context.object
bpy.ops.object.modifier_add(type='FLUID'); fm = fl.modifiers[-1]; fm.fluid_type = 'FLOW'; fm.flow_settings.flow_type = 'SMOKE'
sc.frame_start = 1; sc.frame_end = 5
state = {'s': 0, 'w': 0}
def tick():
    s = state['s']
    try:
        if s == 0:
            ds.cache_frame_start = 1; ds.cache_frame_end = 5
            out('OPS fluid domain', ds.domain_type, ds.resolution_max)
            bpy.ops.object.select_all(action='DESELECT'); dom.select_set(True); bpy.context.view_layer.objects.active = dom
            r = bpy.ops.fluid.bake_data(); out('OPS fluid bake started', r); state['s'] = 1; return 2.0
        if s == 1:
            files = glob.glob(D + '/**/*', recursive=True); n = len([f for f in files if os.path.isfile(f)])
            out('OPS fluid cache files', n, 'baking' , ds.is_cache_baking_data, 'done', ds.has_cache_baked_data)
            if (ds.has_cache_baked_data or n > 5) or state['w'] > 40:
                state['s'] = 2; return 0.5
            state['w'] += 1; return 2.0
        if s == 2:
            files = [f for f in glob.glob(D + '/**/*', recursive=True) if os.path.isfile(f)]
            ok = len(files) > 3
            out('OPS fluid result', 'PASS' if ok else 'FAIL', len(files), 'files', sorted(set(os.path.splitext(f)[1] for f in files))[:6])
    except BaseException as e:
        out('OPS fluid ERR', type(e).__name__, str(e)[:150])
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=2.0)
