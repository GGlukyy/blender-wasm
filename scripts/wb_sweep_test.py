# Lov chyb kolo 66: každé bool/enum nastavení scene.eevee (+ pár render/camera/world) přepnout a vykreslit 16×16; hledá nepřeložené shadery.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = sc.render.resolution_y = 16; sc.render.resolution_percentage = 100
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object; bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('P'); m.use_nodes = True; ob.data.materials.append(m)
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -1.2))
bpy.ops.object.camera_add(location=(0, -5, 1), rotation=(1.4, 0, 0)); sc.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', rotation=(0.8, 0, 0.3)); bpy.ops.object.light_add(type='POINT', location=(2, -2, 2))
bpy.ops.object.light_add(type='SPOT', location=(-2, -2, 3), rotation=(0.8, 0, 0)); bpy.ops.object.light_add(type='AREA', location=(0, 0, 4))
ev = sc.display.shading
cases = []
for p in sc.display.bl_rna.properties:
    if p.type == 'BOOLEAN' and not p.is_array and not p.is_readonly and p.identifier != 'rna_type': cases.append(('display.' + p.identifier, lambda p=p: setattr(sc.display, p.identifier, not getattr(sc.display, p.identifier))))
for p in ev.bl_rna.properties:
    if p.identifier in ('rna_type', 'name') or p.is_readonly: continue
    if p.type == 'BOOLEAN' and not p.is_array: cases.append(('wbshading.' + p.identifier, lambda p=p: setattr(ev, p.identifier, not getattr(ev, p.identifier))))
    elif p.type == 'ENUM' and not p.is_enum_flag:
        for it in p.enum_items: cases.append(('wbshading.%s=%s' % (p.identifier, it.identifier), lambda p=p, it=it: setattr(ev, p.identifier, it.identifier)))
cases += [('render.use_motion_blur', lambda: setattr(sc.render, 'use_motion_blur', True)), ('camera.dof', lambda: setattr(sc.camera.data.dof, 'use_dof', True)),
          ('film_transparent', lambda: setattr(sc.render, 'film_transparent', True)), ('light shadows off', lambda: [setattr(l.data, 'use_shadow', False) for l in bpy.data.objects if l.type == 'LIGHT']),
          ('light contact shadow', lambda: [setattr(l.data, 'use_contact_shadow', True) for l in bpy.data.objects if l.type == 'LIGHT' and hasattr(l.data, 'use_contact_shadow')]),
          ('view_layer passes', lambda: [setattr(bpy.context.view_layer, n, True) for n in ('use_pass_z', 'use_pass_normal', 'use_pass_diffuse_color', 'use_pass_diffuse_direct', 'use_pass_glossy_direct', 'use_pass_emit', 'use_pass_environment', 'use_pass_ambient_occlusion', 'use_pass_shadow', 'use_pass_position', 'use_pass_mist') if hasattr(bpy.context.view_layer, n)]),
          ('material displacement', lambda: setattr(m, 'displacement_method', 'BOTH')), ('material blend', lambda: setattr(m, 'surface_render_method', 'BLENDED')),
          ('world sun', lambda: setattr(sc.world, 'use_sun_shadow', True) if hasattr(sc.world, 'use_sun_shadow') else None)]
out('OPS_INFO workbench cases', len(cases))
state = {'i': 0}
def tick():
    i = state['i']
    if i >= len(cases):
        out('OPS_DONE'); return None
    name, fn = cases[i]; state['i'] += 1
    try:
        fn(); out('OPS wb_sweep render', name); bpy.ops.render.render()
    except Exception as e:
        out('OPS wb_sweep ERR', name, type(e).__name__, str(e)[:100])
    return 1.0
bpy.app.timers.register(tick, first_interval=1.5)
