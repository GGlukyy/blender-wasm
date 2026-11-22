# Freestyle / Workbench F12 volby / Line Art (desktop 5.3.0, journey `lines`): `_LN`.
import bpy, os, time
r = lambda x, n=3: round(x, n)
_LN = {}
_D = '/opfs/home' if os.path.isdir('/opfs/home') else os.environ.get('TEMP', '/tmp')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
sc = bpy.context.scene
sc.render.resolution_x = 96; sc.render.resolution_y = 54; sc.render.resolution_percentage = 100
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.4, 0.5, 0.6, 1)
bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0), rotation=(0.3, 0.2, 0.5)); cube = bpy.context.object
bpy.ops.mesh.primitive_monkey_add(location=(1.8, 0, 0.3)); mk = bpy.context.object; bpy.ops.object.shade_smooth()
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -1))
bpy.ops.object.light_add(type='SUN', location=(3, -3, 5), rotation=(0.8, 0.2, 0.6))
bpy.ops.object.camera_add(location=(0, -7, 2), rotation=(1.3, 0, 0)); cam = bpy.context.object; sc.camera = cam
t = lambda name, fn: _LN.__setitem__(name, (lambda: fn())() if True else 0)
V = []
def v(key, fn): V.append((key, fn))
def wb(**kw):
    def f():
        sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.use_freestyle = False; sh = sc.display.shading
        sh.light = 'STUDIO'; sh.color_type = 'MATERIAL'; sh.show_cavity = False; sh.show_object_outline = False; sh.show_specular_highlight = False; sh.show_shadows = False; sh.show_xray = False
        for k, val in kw.items(): setattr(sh, k, val)
    return f
v('wb_base', wb())
v('wb_outline', wb(show_object_outline=True, object_outline_color=(1, 0, 0)))
v('wb_cavity', wb(show_cavity=True))
v('wb_spec', wb(show_specular_highlight=True))
v('wb_shadow', wb(show_shadows=True, shadow_intensity=0.8))
v('wb_xray', wb(show_xray=True, xray_alpha=0.4))
v('wb_flat', wb(light='FLAT'))
v('wb_matcap', wb(light='MATCAP'))
def fs():
    wb()(); sc.render.engine = 'BLENDER_EEVEE'; sc.render.use_freestyle = True; sc.render.line_thickness = 2.0
    vl = bpy.context.view_layer; vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new('L')
    ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    ls.linestyle.color = (1, 0, 0); ls.linestyle.thickness = 3.0
v('freestyle', fs)
def fs_off():
    fs(); sc.render.use_freestyle = False
v('freestyle_off', fs_off)
def _read(p):
    im = bpy.data.images.load(p, check_existing=False); px = list(im.pixels); n = len(px) // 4
    return [r(sum(px[c::4]) / n, 2) for c in (0, 1, 2)]
_ST = {'i': 0, 'stage': 0, 't0': 0, 'p': None}
def _step():
    if _ST['i'] >= len(V): _LN['done'] = 1; return None
    key, fn = V[_ST['i']]
    if _ST['stage'] == 0:
        try:
            fn(); p = os.path.join(_D, 'ln_%s.png' % key); sc.render.filepath = p; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
            if os.path.exists(p): os.remove(p)
            _ST['p'] = p; bpy.ops.render.render(write_still=True)
        except Exception as e: _LN[key] = 'ERR ' + str(e)[:80]; _ST['i'] += 1; return 0.2
        _ST['stage'] = 1; _ST['t0'] = time.time(); return 1.0
    if (os.path.exists(_ST['p']) and os.path.getsize(_ST['p']) > 100) or time.time() - _ST['t0'] > 120:
        try: _LN[key] = _read(_ST['p'])
        except Exception as e: _LN[key] = 'ERR ' + str(e)[:80]
        _ST['i'] += 1; _ST['stage'] = 0; return 0.3
    return 0.5
# Line Art (GP): počet tahů z kostky (data, bez renderu).
def lineart():
    try:
        bpy.ops.object.select_all(action='DESELECT'); cube.select_set(True); bpy.context.view_layer.objects.active = cube
        bpy.ops.object.gpencil_add(type='LRT_COLLECTION') if False else bpy.ops.object.grease_pencil_add(type='LINEART_OBJECT')
        g = bpy.context.object; g.modifiers  # noqa
        _LN['lineart_mods'] = [m.type for m in g.modifiers]
    except Exception as e: _LN['lineart_mods'] = 'ERR ' + str(e)[:100]
lineart()
if bpy.app.background:
    while _step() is not None: pass
else:
    bpy.app.timers.register(_step, first_interval=0.5)
