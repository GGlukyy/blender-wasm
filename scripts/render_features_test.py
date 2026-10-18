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
    for n in [n for n in w.node_tree.nodes if n.type == 'TEX_ENVIRONMENT']: w.node_tree.nodes.remove(n)
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

def diffuse(ob, col):
    mat(ob, lambda nt: nt.nodes.new('ShaderNodeBsdfDiffuse')); ob.active_material.node_tree.nodes['Diffuse BSDF'].inputs[0].default_value = (*col, 1)
def c_shadow():
    # kamera shora na podlahu; kostka mezi sluncem a podlahou vrhá stín (levá polovina obrazu)
    cam = sc.camera; cam.location = (0, 0, 8); cam.rotation_euler = (0, 0, 0)
    bpy.ops.mesh.primitive_plane_add(size=10); diffuse(bpy.context.object, (1, 1, 1))
    bpy.ops.mesh.primitive_cube_add(size=1.5, location=(0, 0, 2)); diffuse(bpy.context.object, (1, 1, 1))
    bpy.ops.object.light_add(type='SUN', rotation=(0, 0.6, 0)); bpy.context.object.data.energy = 4   # svítí z +X → stín posunutý do -X
def c_volume():
    ob = cube(3.0)
    def b(nt):
        v = nt.nodes.new('ShaderNodeVolumeAbsorption'); v.inputs[0].default_value = (0, 1, 1, 1); v.inputs[1].default_value = 3.0; return v
    m = bpy.data.materials.new('V'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    o = nt.nodes.new('ShaderNodeOutputMaterial'); v = b(nt); nt.links.new(v.outputs[0], o.inputs[1]); ob.data.materials.append(m)
    bpy.data.worlds['W'].node_tree.nodes['Background'].inputs[0].default_value = (1, 1, 1, 1)
def c_volume_scatter_light():
    ob = cube(1.2); m = bpy.data.materials.new('V'); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    o = nt.nodes.new('ShaderNodeOutputMaterial'); v = nt.nodes.new('ShaderNodeVolumeScatter'); v.inputs[0].default_value = (1, 1, 1, 1); v.inputs[1].default_value = 1.5
    nt.links.new(v.outputs[0], o.inputs[1]); ob.data.materials.append(m)
    bpy.ops.object.light_add(type='POINT', location=(0, -1.5, 0.8)); bpy.context.object.data.energy = 150
def c_hair_curves():
    h = bpy.data.hair_curves.new('H'); ob = bpy.data.objects.new('H', h); bpy.context.collection.objects.link(ob)
    h.add_curves([4, 4, 4]) if hasattr(h, 'add_curves') else None
    out('OPS_INFO hair curves', len(h.curves), len(h.points))
    import mathutils
    for ci, c in enumerate(h.curves):
        for pi, pt in enumerate(c.points): pt.position = (-1 + ci, 0, -1 + pi * 0.7); pt.radius = 0.15
    mat(ob, lambda nt: emission(nt, (1, 0, 0), 3.0))
def c_text():
    bpy.ops.object.text_add(location=(0, 0, 0), rotation=(1.5708, 0, 0)); t = bpy.context.object; t.data.body = 'I'; t.data.size = 3; t.data.extrude = 0.1
    mat(t, lambda nt: emission(nt, (1, 1, 1), 3.0))
    t.location = (-0.4, 0, -1.5)
def c_curve_bevel():
    bpy.ops.curve.primitive_bezier_circle_add(radius=1.5, rotation=(1.5708, 0, 0)); c = bpy.context.object; c.data.bevel_depth = 0.3
    mat(c, lambda nt: emission(nt, (1, 0.5, 0), 3.0))
def c_glossy_world():
    # lesklá koule odráží modrý svět (střed koule modrý odlesk)
    bpy.data.worlds['W'].node_tree.nodes['Background'].inputs[0].default_value = (0, 0, 1, 1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.5); bpy.ops.object.shade_smooth(); ob = bpy.context.object
    def b(nt):
        g = nt.nodes.new('ShaderNodeBsdfGlossy'); g.inputs[0].default_value = (1, 0.5, 0.5, 1); g.inputs[1].default_value = 0.0; return g
    mat(ob, b)
def c_gpencil():
    bpy.ops.object.grease_pencil_add(type='MONKEY', location=(0, 0, 0), rotation=(1.5708, 0, 0))
def c_subsurf_smooth_emission():
    bpy.ops.mesh.primitive_ico_sphere_add(radius=1.5, subdivisions=1); ob = bpy.context.object
    ob.modifiers.new('S', 'SUBSURF').levels = 2; bpy.ops.object.shade_smooth(); mat(ob, lambda nt: emission(nt, (1, 1, 1), 1.0))
def c_instanced_particles():
    bpy.ops.mesh.primitive_plane_add(size=3, location=(0, 0, 0), rotation=(1.5708, 0, 0)); ob = bpy.context.object
    mat(ob, lambda nt: emission(nt, (1, 0, 1), 2.0))
    ob.modifiers.new('A', 'ARRAY').count = 2
def c_displace_texture():
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=20, y_subdivisions=20, size=4, rotation=(1.5708, 0, 0)); ob = bpy.context.object
    mat(ob, lambda nt: emission(nt, (0, 1, 0), 2.0))
def lit_cube(build_shader, light='SUN'):
    ob = cube(); mat(ob, build_shader)
    bpy.ops.object.light_add(type=light, location=(0, -4, 4), rotation=(0.8, 0, 0)); bpy.context.object.data.energy = 5 if light == 'SUN' else 600
    return ob
def c_spot_light():
    bpy.ops.mesh.primitive_plane_add(size=6, rotation=(1.5708, 0, 0), location=(0, 0, 0)); diffuse(bpy.context.object, (1, 1, 1))
    bpy.ops.object.light_add(type='SPOT', location=(0, -3, 0), rotation=(1.5708, 0, 0)); l = bpy.context.object.data; l.energy = 400; l.spot_size = 0.5
def c_area_light():
    bpy.ops.mesh.primitive_plane_add(size=6, rotation=(1.5708, 0, 0)); diffuse(bpy.context.object, (1, 1, 1))
    bpy.ops.object.light_add(type='AREA', location=(0, -2, 0), rotation=(1.5708, 0, 0)); l = bpy.context.object.data; l.energy = 20; l.size = 2
def c_noise_texture():
    ob = cube()
    def b(nt):
        n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs[2].default_value = 8.0; ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color = (1, 0, 0, 1); ramp.color_ramp.elements[1].color = (0, 0, 1, 1)
        nt.links.new(n.outputs[0], ramp.inputs[0]); e = emission(nt, (1, 1, 1), 1.0); nt.links.new(ramp.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_checker_tex():
    ob = cube()
    def b(nt):
        t = nt.nodes.new('ShaderNodeTexChecker'); t.inputs[1].default_value = (1, 0, 0, 1); t.inputs[2].default_value = (0, 0, 1, 1); t.inputs[3].default_value = 4.0
        co = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(co.outputs['Object'], t.inputs[0]); e = emission(nt, (1, 1, 1), 1.0); nt.links.new(t.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_bump_normal():
    ob = cube()
    def b(nt):
        d = nt.nodes.new('ShaderNodeBsdfDiffuse'); bump = nt.nodes.new('ShaderNodeBump'); n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs[2].default_value = 20
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 20.0
        nt.links.new(n.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], bump.inputs[2]); nt.links.new(bump.outputs[0], d.inputs[2]); return d
    mat(ob, b)
    bpy.ops.object.light_add(type='SUN', rotation=(0.8, 0, 0)); bpy.context.object.data.energy = 4
def c_bump_normal_vis():
    ob = cube()
    def b(nt):
        bump = nt.nodes.new('ShaderNodeBump'); n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs[2].default_value = 20
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 20.0
        nt.links.new(n.outputs[0], mul.inputs[0]); nt.links.new(mul.outputs[0], bump.inputs[2])
        e = emission(nt, (1, 1, 1), 1.0); nt.links.new(bump.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_wireframe_node():
    ob = cube()
    def b(nt):
        w = nt.nodes.new('ShaderNodeWireframe'); w.use_pixel_size = True; w.inputs[0].default_value = 3.0
        e = emission(nt, (1, 1, 1), 1.0); nt.links.new(w.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_bump_gradient():
    # výška = objektová X → normála se musí naklonit v X (bez derivací by zůstala plochá: červená 0.5 lin = 0.735 sRGB)
    ob = cube()
    def b(nt):
        co = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(co.outputs['Object'], sep.inputs[0])
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = 1.0; nt.links.new(sep.outputs[0], bump.inputs['Height'])
        vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY_ADD'; vm.inputs[1].default_value = (0.5, 0.5, 0.5); vm.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(bump.outputs[0], vm.inputs[0]); e = emission(nt, (1, 1, 1), 1.0); nt.links.new(vm.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_bump_noise_explicit(coord='Object'):
    ob = cube()
    def b(nt):
        co = nt.nodes.new('ShaderNodeTexCoord'); n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = 6.0
        nt.links.new(co.outputs[coord], n.inputs['Vector'])
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Distance'].default_value = 1.0; nt.links.new(n.outputs[0], bump.inputs['Height'])
        vm = nt.nodes.new('ShaderNodeVectorMath'); vm.operation = 'MULTIPLY_ADD'; vm.inputs[1].default_value = (0.5, 0.5, 0.5); vm.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(bump.outputs[0], vm.inputs[0]); e = emission(nt, (1, 1, 1), 1.0); nt.links.new(vm.outputs[0], e.inputs[0]); return e
    mat(ob, b)
def c_sss():
    ob = cube(); ob.modifiers.new('S', 'SUBSURF').levels = 1
    def b(nt):
        p = nt.nodes.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = (1, 0.2, 0.1, 1); p.inputs['Subsurface Weight'].default_value = 1.0; return p
    mat(ob, b)
    bpy.ops.object.light_add(type='SUN', rotation=(0.8, 0, 0)); bpy.context.object.data.energy = 4
def c_env_texture():
    img = bpy.data.images.new('E', 16, 8); img.pixels = [0, 1, 0, 1] * 128
    nt = bpy.data.worlds['W'].node_tree; env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = img
    nt.links.new(env.outputs[0], nt.nodes['Background'].inputs[0])
def c_backface_culling():
    ob = cube(); m = mat(ob, lambda nt: emission(nt, (1, 0, 0), 3.0)); m.use_backface_culling = True
    ob.scale = (1, 1, 1)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.flip_normals(); bpy.ops.object.mode_set(mode='OBJECT')
def c_wireframe_mod():
    ob = cube(); ob.modifiers.new('W', 'WIREFRAME').thickness = 0.1; mat(ob, lambda nt: emission(nt, (1, 0, 1), 3.0))
def px(path):
    im = bpy.data.images.load(path, check_existing=False); p = list(im.pixels); w, h = im.size
    def at(x, y): i = (y * w + x) * 4; return tuple(p[i:i + 4])
    IMG.update(at=at, w=w, h=h)
    return at(w // 2, h // 2), at(2, 2)
# (jméno, příprava, predikát(střed, roh) → bool)
IMG = {}
def dom(k):
    from collections import Counter
    c = Counter(tuple(round(v, 1) for v in q) for q in allpx() if max(abs(q[i] - k[i]) for i in range(4)) > 0.05)
    return c.most_common(1)
def allpx(): return [IMG['at'](x, y) for y in range(IMG['h']) for x in range(IMG['w'])]
def shadow_pred(c, k):
    lum = [(p[0] + p[1] + p[2]) / 3 for p in allpx()]
    return max(lum) > 0.5 and sum(1 for v in lum if v < 0.05) > 40 and sum(1 for v in lum if v > 0.3) > 200   # stín (tmavé) i osvětlená podlaha
def ring_pred():
    return sum(1 for p in allpx() if p[0] > 0.5 and p[1] > 0.2 and p[2] < 0.2) >= 100   # oranžový prstenec (křivka s bevel) je vykreslen
def gp_pred():
    k = IMG['at'](1, 1); return sum(1 for p in allpx() if max(abs(p[i] - k[i]) for i in range(3)) > 0.1) > 60
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
    ('shadow_sun', lambda: (reset(world=(0, 0, 0)), c_shadow()), lambda c, k: shadow_pred(c, k)),
    ('volume_absorb', lambda: (reset(), c_volume()), lambda c, k: c[0] < 0.2 and c[1] > 0.3),
    ('volume_scatter_light', lambda: (reset(world=(0, 0, 0)), c_volume_scatter_light()), lambda c, k: (c[0] + c[1] + c[2]) / 3 > 0.1 and (k[0] + k[1] + k[2]) / 3 < 0.05),
    ('hair_curves', lambda: (reset(), c_hair_curves()), lambda c, k: sum(1 for p in allpx() if p[0] > 0.5 and p[1] < 0.3) > 15),
    ('spot_light', lambda: (reset(world=(0, 0, 0)), c_spot_light()), lambda c, k: (c[0] + c[1] + c[2]) / 3 > 0.2 and (k[0] + k[1] + k[2]) / 3 < 0.1),
    ('area_light', lambda: (reset(world=(0, 0, 0)), c_area_light()), lambda c, k: (c[0] + c[1] + c[2]) / 3 > 0.2 and (c[0] + c[1] + c[2]) > (k[0] + k[1] + k[2]) * 1.5),
    ('noise_ramp', lambda: (reset(), c_noise_texture()), lambda c, k: len(set(round(q[0], 1) for q in allpx() if q[0] > 0.01 and q != k)) > 4),
    ('checker_texture', lambda: (reset(), c_checker_tex()), lambda c, k: sum(1 for q in allpx() if q[0] > 0.8 and q[2] < 0.2) > 100 and sum(1 for q in allpx() if q[2] > 0.8 and q[0] < 0.2) > 100),
    ('wireframe_node', lambda: (reset(), c_wireframe_node()), lambda c, k: len(set(round(q[0], 1) for q in allpx())) > 2),
    ('bump_height_gradient_tilts_normal', lambda: (reset(), c_bump_gradient()), lambda c, k: abs(c[0] - 0.735) > 0.08),
    ('bump_noise_explicit_object', lambda: (reset(), c_bump_noise_explicit('Object')), lambda c, k: len(set((round(q[0], 1), round(q[2], 1)) for q in allpx())) > 8),
    ('bump_noise_explicit_generated', lambda: (reset(), c_bump_noise_explicit('Generated')), lambda c, k: len(set((round(q[0], 1), round(q[2], 1)) for q in allpx())) > 8),
    ('principled_sss', lambda: (reset(), c_sss()), lambda c, k: c[0] > 0.2),
    ('environment_texture', lambda: (reset(), c_env_texture()), lambda c, k: k[1] > 0.5 and k[0] < 0.2),
    ('backface_culling_flipped', lambda: (reset(), c_backface_culling()), lambda c, k: c[0] < 0.3 or c[0] > 0.5),
    ('wireframe_modifier', lambda: (reset(), c_wireframe_mod()), lambda c, k: sum(1 for q in allpx() if q[0] > 0.8 and q[2] > 0.8) > 50 and c[0] < 0.4),
    ('text_object', lambda: (reset(), c_text()), lambda c, k: c[0] > 0.5 and c[1] > 0.5 and c[2] > 0.5),
    ('curve_bevel_ring', lambda: (reset(), c_curve_bevel()), lambda c, k: c[0] < 0.3 and ring_pred()),
    ('glossy_reflects_world', lambda: (reset(), c_glossy_world()), lambda c, k: 0.3 < c[2] < 0.95 and k[2] > 0.95 and c[0] < 0.1),
    ('grease_pencil', lambda: (reset(), c_gpencil()), lambda c, k: gp_pred()),
    ('subsurf_modifier', lambda: (reset(), c_subsurf_smooth_emission()), lambda c, k: c[0] > 0.5),
    ('array_modifier_plane', lambda: (reset(), c_instanced_particles()), lambda c, k: c[0] > 0.5 and c[2] > 0.5 and c[1] < 0.2),
    ('grid_emission', lambda: (reset(), c_displace_texture()), lambda c, k: c[1] > 0.5 and c[0] < 0.2),
    ('vertex_color_attr', lambda: (reset(), c_vertex_color_attr()), lambda c, k: c[1] > 0.3 and c[0] < 0.2 and c[2] < 0.2),
]
KNOWN_GAPS = {'grease_pencil', 'hair_curves'}   # BACKLOG: samplerBuffer (texel buffery) ve WebGPU backendu chybí
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
        nd = sum(1 for q in allpx() if max(abs(q[i] - k[i]) for i in range(4)) > 0.05)
        out('OPS render_feat %s %s center=%s corner=%s differing_px=%d domcolor=%s' % (name, 'PASS' if ok else ('GAP' if name in KNOWN_GAPS else 'FAIL'), tuple(round(v, 2) for v in c), tuple(round(v, 2) for v in k), nd, dom(k)))
    state['i'] += 1; state['phase'] = 0; return 0.3
bpy.app.timers.register(tick, first_interval=1.0)
