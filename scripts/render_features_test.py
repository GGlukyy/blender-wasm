# EEVEE funkce přes WebGPU: každý případ vyrenderuje 64×64 do PNG a zkontroluje barvy pixelů (lov chyb, kolo 66).
# Běží přes ops_test.mjs (OPS_PY). Řetěz timerů kvůli asynchronnímu čtení z GPU.
import bpy, os, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
sc.render.resolution_x = sc.render.resolution_y = 64; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.engine = 'BLENDER_EEVEE'
sc.view_settings.view_transform = 'Standard'   # AgX (výchozí) odbarvuje jasné barvy – test chce čisté
def reset(world=(0.05, 0.05, 0.05), transparent=False):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)
    sc.render.film_transparent = transparent; sc.compositing_node_group = None
    w = bpy.data.worlds.get('W') or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*world, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    bpy.ops.object.camera_add(location=(0, -5, 0), rotation=(1.5708, 0, 0)); sc.camera = bpy.context.object
def mat(ob, build):
    m = bpy.data.materials.new('M'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    outn = nt.nodes.new('ShaderNodeOutputMaterial'); sh = build(nt); nt.links.new(sh.outputs[0], outn.inputs[0])
    ob.data.materials.append(m); return m
def emission(nt, c, s=5.0):
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs[0].default_value = (*c, 1); e.inputs[1].default_value = s; return e
def cube(size=2.0):
    bpy.ops.mesh.primitive_cube_add(size=size); return bpy.context.object
def c_emission():
    ob = cube(); mat(ob, lambda nt: emission(nt, (1, 0, 0)))
def c_image_tex():
    ob = cube(); img = bpy.data.images.new('T', 8, 8); img.pixels = [0, 1, 0, 1] * 64
    def b(nt):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img; e = emission(nt, (1, 1, 1), 2.0); nt.links.new(t.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_world_bg():
    reset(world=(0, 0, 1)); 
def c_transparent_film():
    reset(transparent=True); ob = cube(1.0); mat(ob, lambda nt: emission(nt, (1, 1, 0)))
def c_lit_diffuse():
    ob = cube(); mat(ob, lambda nt: nt.nodes.new('ShaderNodeBsdfDiffuse'))
    ob.active_material.node_tree.nodes['Diffuse BSDF'].inputs[0].default_value = (1, 0, 0, 1)
    bpy.ops.object.light_add(type='SUN', location=(0, -5, 5), rotation=(0.9, 0, 0)); bpy.context.object.data.energy = 5
def c_alpha_blend_material():
    ob = cube(); m = mat(ob, lambda nt: emission(nt, (0, 0, 1)))
    reset_bg = bpy.data.worlds['W'].node_tree.nodes['Background'].inputs[0]; reset_bg.default_value = (1, 0, 0, 1)
    m.blend_method = 'BLEND'
    nt = m.node_tree; mix = nt.nodes.new('ShaderNodeMixShader'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
    outn = nt.nodes['Material Output']; em = [n for n in nt.nodes if n.type == 'EMISSION'][0]
    mix.inputs[0].default_value = 0.5; nt.links.new(tr.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2]); nt.links.new(mix.outputs[0], outn.inputs[0])
def c_compositor_invert(passthrough=False, device=None):
    out('OPS_INFO compositor_device', sc.render.compositor_device, 'precision', sc.render.compositor_precision)
    if device: sc.render.compositor_device = device
    ob = cube(); mat(ob, lambda nt: emission(nt, (1, 0, 0)))
    ng = bpy.data.node_groups.new('C', 'CompositorNodeTree'); sc.compositing_node_group = ng
    ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
    rl = ng.nodes.new('CompositorNodeRLayers'); inv = ng.nodes.new('CompositorNodeInvert'); go = ng.nodes.new('NodeGroupOutput')
    ng.links.new(rl.outputs['Image'], inv.inputs['Color'])
    ng.links.new((rl.outputs['Image'] if passthrough else inv.outputs[0]), go.inputs[0])
def c_vertex_color_attr():
    ob = cube(); me = ob.data; ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for d in ca.data: d.color = (0, 1, 0, 1)
    def b(nt):
        a = nt.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'; e = emission(nt, (1, 1, 1), 2.0); nt.links.new(a.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def px(path):
    im = bpy.data.images.load(path, check_existing=False); p = list(im.pixels); w, h = im.size
    def at(x, y): i = (y * w + x) * 4; return tuple(p[i:i + 4])
    return at(w // 2, h // 2), at(2, 2)
# (jméno, příprava, predikát(střed, roh) → bool)
CASES = [
    ('emission_red', lambda: (reset(), c_emission()), lambda c, k: c[0] > 0.5 and c[1] < 0.2 and c[2] < 0.2),
    ('image_texture', lambda: (reset(), c_image_tex()), lambda c, k: c[1] > 0.3 and c[0] < 0.2 and c[2] < 0.2),
    ('world_background', lambda: (c_world_bg(),), lambda c, k: k[2] > 0.3 and k[0] < 0.1),
    ('film_transparent', lambda: (c_transparent_film(),), lambda c, k: c[3] > 0.9 and k[3] < 0.1),
    ('sun_diffuse', lambda: (reset(), c_lit_diffuse()), lambda c, k: c[0] > 0.1 and c[1] < c[0] * 0.3),
    ('alpha_blend_mix', lambda: (reset(), c_alpha_blend_material()), lambda c, k: c[0] > 0.2 and c[2] > 0.2),   # červené pozadí prosvítá modrým boxem
    ('compositor_skipped_keeps_render', lambda: (reset(), c_compositor_invert()), lambda c, k: c[0] > 0.5 and c[1] < 0.2 and c[2] < 0.2),
    ('compositor_passthrough', lambda: (reset(), c_compositor_invert(True)), lambda c, k: c[0] > 0.5 and c[1] < 0.2),
    ('compositor_cpu_skipped', lambda: (reset(), c_compositor_invert(False, 'CPU')), lambda c, k: c[0] > 0.5 and c[1] < 0.2 and c[2] < 0.2),
    ('vertex_color_attr', lambda: (reset(), c_vertex_color_attr()), lambda c, k: c[1] > 0.3 and c[0] < 0.2 and c[2] < 0.2),
]
state = {'i': 0, 'phase': 0, 'waited': 0}
def tick():
    i = state['i']
    if i >= len(CASES):
        out('OPS_DONE'); return None
    name, prep, pred = CASES[i]; path = '/tmp/rf_%d.png' % i
    if state['phase'] == 0:
        if os.path.exists(path): os.remove(path)
        try:
            prep(); sc.render.filepath = path; bpy.ops.render.render(write_still=True)
        except Exception as e:
            out('OPS render_feat %s FAIL EXC %s' % (name, str(e)[:150])); state['i'] += 1; return 0.1
        state['phase'] = 1; state['waited'] = 0; return 1.0
    if not os.path.exists(path) and state['waited'] < 15:
        state['waited'] += 1; return 1.0
    if not os.path.exists(path):
        out('OPS render_feat %s FAIL no file' % name)
    else:
        c, k = px(path); ok = bool(pred(c, k))
        out('OPS render_feat %s %s center=%s corner=%s' % (name, 'PASS' if ok else 'FAIL', tuple(round(v, 2) for v in c), tuple(round(v, 2) for v in k)))
    state['i'] += 1; state['phase'] = 0; return 0.3
bpy.app.timers.register(tick, first_interval=1.0)
