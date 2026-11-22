# EEVEE F12 matice (desktop 5.3.0, journey `eevee`): střední RGB 96×54 snímku pro 12 variant nastavení/materiálů: `_EV`.
import bpy, os, time
r = lambda x, n=3: round(x, n)
_EV = {}
_D = '/opfs/home' if os.path.isdir('/opfs/home') else os.environ.get('TEMP', '/tmp')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = 96; sc.render.resolution_y = 54; sc.render.resolution_percentage = 100
sc.eevee.taa_render_samples = 16
sc.view_settings.view_transform = 'Standard'
w = bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (0.05, 0.08, 0.15, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, -1)); pl = bpy.context.object
bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 0)); sp = bpy.context.object; bpy.ops.object.shade_smooth()
bpy.ops.object.light_add(type='SUN', location=(3, -3, 5), rotation=(0.8, 0.2, 0.6)); sun = bpy.context.object; sun.data.energy = 3
bpy.ops.object.light_add(type='POINT', location=(-2, -1, 2)); pt = bpy.context.object; pt.data.energy = 300
bpy.ops.object.camera_add(location=(0, -6, 1.5), rotation=(1.35, 0, 0)); cam = bpy.context.object; sc.camera = cam
def mat(name, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    for k, v in kw.items():
        try: b.inputs[k].default_value = v
        except Exception as e: print('mat input', k, e)
    return m
mats = {
  'diffuse': mat('d', **{'Base Color': (0.8, 0.2, 0.1, 1), 'Roughness': 0.6}),
  'metal': mat('m', **{'Base Color': (0.9, 0.8, 0.3, 1), 'Metallic': 1.0, 'Roughness': 0.2}),
  'glass': mat('g', **{'Base Color': (0.9, 1, 1, 1), 'Transmission Weight': 1.0, 'Roughness': 0.05}),
  'emit': mat('e', **{'Base Color': (0, 0, 0, 1), 'Emission Color': (1, 0.5, 0.1, 1), 'Emission Strength': 4.0}),
  'sss': mat('s', **{'Base Color': (0.8, 0.5, 0.4, 1), 'Subsurface Weight': 1.0, 'Subsurface Radius': (1.0, 0.3, 0.2)}),
  'coat': mat('c', **{'Base Color': (0.1, 0.3, 0.8, 1), 'Coat Weight': 1.0, 'Coat Roughness': 0.05}),
}
pl.data.materials.append(mat('floor', **{'Base Color': (0.5, 0.5, 0.5, 1), 'Roughness': 0.8}))
sp.data.materials.append(mats['diffuse'])
V = []
def v(key, fn): V.append((key, fn))
def setmat(n): sp.data.materials[0] = mats[n]
def common():
    sc.eevee.use_shadows = True; sc.eevee.use_raytracing = False; sc.render.use_motion_blur = False; cam.data.dof.use_dof = False
    sc.render.film_transparent = False; sun.data.use_shadow = True; sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    try: sc.eevee.ray_tracing_method = 'SCREEN'
    except Exception: pass
    sc.world.use_nodes = True; sun.data.energy = 3
    for l in list(sc.world.node_tree.links):
        if l.to_socket.name == 'Volume': sc.world.node_tree.links.remove(l)
def reset(fn): 
    def f(): common(); setmat('diffuse'); fn()
    return f
v('base', reset(lambda: None))
v('metal', reset(lambda: setmat('metal')))
v('glass', reset(lambda: setmat('glass')))
v('emit', reset(lambda: setmat('emit')))
v('sss', reset(lambda: setmat('sss')))
v('coat', reset(lambda: setmat('coat')))
v('noshadow', reset(lambda: setattr(sc.eevee, 'use_shadows', False)))
def s_raytrace(): sc.eevee.use_raytracing = True
v('raytrace', reset(s_raytrace))
def s_dof(): cam.data.dof.use_dof = True; cam.data.dof.focus_distance = 3; cam.data.dof.aperture_fstop = 1.2
v('dof', reset(s_dof))
def s_vol():
    n = sc.world.node_tree; o = n.nodes['World Output']; vs = n.nodes.new('ShaderNodeVolumePrincipled'); vs.inputs['Density'].default_value = 0.15; n.links.new(vs.outputs[0], o.inputs['Volume'])
v('worldvol', reset(s_vol))
def s_trans(): sc.render.film_transparent = True
v('transparent', reset(s_trans))
def s_dark(): sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.0; sun.data.energy = 0
v('lightsout', reset(s_dark))
def _read(p):
    im = bpy.data.images.load(p, check_existing=False); px = list(im.pixels); n = len(px) // 4
    return [r(sum(px[c::4]) / n, 2) for c in (0, 1, 2, 3)]
_ST = {'i': 0, 'stage': 0, 't0': 0, 'p': None}
def _step():
    if _ST['i'] >= len(V): _EV['done'] = 1; return None
    key, fn = V[_ST['i']]
    if _ST['stage'] == 0:
        try:
            fn(); p = os.path.join(_D, 'ev_%s.png' % key); sc.render.filepath = p; sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
            if os.path.exists(p): os.remove(p)
            _ST['p'] = p; bpy.ops.render.render(write_still=True)
        except Exception as e: _EV[key] = 'ERR ' + str(e)[:80]; _ST['i'] += 1; return 0.2
        _ST['stage'] = 1; _ST['t0'] = time.time(); return 1.0
    if (os.path.exists(_ST['p']) and os.path.getsize(_ST['p']) > 100) or time.time() - _ST['t0'] > 120:
        try: _EV[key] = _read(_ST['p'])
        except Exception as e: _EV[key] = 'ERR ' + str(e)[:80]
        _ST['i'] += 1; _ST['stage'] = 0; return 0.3
    return 0.5
if bpy.app.background:
    while _step() is not None: pass
else:
    bpy.app.timers.register(_step, first_interval=0.5)
