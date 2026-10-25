import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
def chk(name, ok, info=''):
    out('OPS model7_%s %s %s' % (name, 'PASS' if ok else 'FAIL', info))
def act(): return bpy.context.view_layer.objects.active
def fresh(kind='cube'):
    a = act()
    if a and a.mode != 'OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    if kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8)
    else: bpy.ops.mesh.primitive_cube_add()
    return act()
def tryit(name, fn):
    try: fn()
    except Exception as e:
        chk(name, False, 'exc=%s' % str(e)[:120])
        try: bpy.ops.object.mode_set(mode='OBJECT')
        except Exception: pass
def t_modes_cycle():
    ob = fresh('sphere'); ok = []
    for m in ('EDIT', 'SCULPT', 'VERTEX_PAINT', 'WEIGHT_PAINT', 'TEXTURE_PAINT', 'OBJECT'):
        bpy.ops.object.mode_set(mode=m); ok.append(ob.mode == m)
    chk('modes_cycle', all(ok), str(ok))
def t_vertex_color_fill():
    ob = fresh('sphere'); bpy.ops.object.mode_set(mode='VERTEX_PAINT')
    vp = bpy.context.tool_settings.vertex_paint; b = vp.brush
    out('OPS info brush=%s attrs=%s' % (b.name if b else None, [a for a in dir(vp) if 'unified' in a or 'color' in a]))
    ups = getattr(vp, 'unified_paint_settings', None)
    if b: b.color = (1, 0, 0)
    if ups is not None: ups.color = (1, 0, 0)
    bpy.ops.paint.vertex_color_set(); bpy.ops.object.mode_set(mode='OBJECT')
    ca = ob.data.color_attributes
    chk('vertex_color_set', len(ca) > 0 and ca[0].data[0].color[0] > 0.9, 'attrs=%d c=%s' % (len(ca), tuple(ca[0].data[0].color)))
def t_texture_paint_image():
    ob = fresh('sphere'); img = bpy.data.images.new('P', 64, 64)
    mat = bpy.data.materials.new('M'); mat.use_nodes = True; ob.data.materials.append(mat)
    n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; mat.node_tree.nodes.active = n
    bpy.ops.object.mode_set(mode='TEXTURE_PAINT'); bpy.ops.object.mode_set(mode='OBJECT')
    chk('texpaint_enter', True)
def t_weight_paint_gradient_normalize():
    ob = fresh('sphere'); ob.vertex_groups.new(name='a'); ob.vertex_groups.new(name='b')
    ob.vertex_groups[0].add([v.index for v in ob.data.vertices], 0.3, 'REPLACE'); ob.vertex_groups[1].add([v.index for v in ob.data.vertices], 0.3, 'REPLACE')
    bpy.ops.object.mode_set(mode='WEIGHT_PAINT'); bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL'); bpy.ops.object.mode_set(mode='OBJECT')
    chk('weight_normalize', abs(sum(g.weight for g in ob.data.vertices[3].groups) - 1.0) < 1e-3)
def t_particles():
    ob = fresh('sphere'); bpy.ops.object.particle_system_add(); ps = ob.particle_systems[0]
    ps.settings.count = 50; bpy.context.scene.frame_set(5); bpy.context.view_layer.update()
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); n = len(ev.particle_systems[0].particles)
    chk('particles_emit', n == 50, 'n=%d' % n)
def t_cloth_frames():
    ob = fresh('sphere'); ob.location.z = 3
    bpy.ops.object.modifier_add(type='CLOTH'); sc = bpy.context.scene; sc.frame_set(1)
    for f in range(2, 12): sc.frame_set(f)
    ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); zs = [v.co.z for v in ev.data.vertices]
    chk('cloth_moved', min(zs) != min(v.co.z for v in ob.data.vertices), 'zmin_eval=%.3f' % min(zs))
    sc.frame_set(1)
def t_rigidbody():
    ob = fresh(); bpy.ops.rigidbody.object_add()
    chk('rigidbody_add', ob.rigid_body is not None)
def t_fluid_smoke_domain():
    ob = fresh(); bpy.ops.object.modifier_add(type='FLUID'); ob.modifiers['Fluid'].fluid_type = 'DOMAIN'
    chk('fluid_domain_set', ob.modifiers['Fluid'].fluid_type == 'DOMAIN')
def t_softbody_frames():
    ob = fresh('sphere'); bpy.ops.object.modifier_add(type='SOFT_BODY'); sc = bpy.context.scene; sc.frame_set(1)
    for f in range(2, 8): sc.frame_set(f)
    sc.frame_set(1); chk('softbody_frames', True)
def t_shader_nodes_build():
    ob = fresh(); m = bpy.data.materials.new('N'); m.use_nodes = True; ob.data.materials.append(m)
    nt = m.node_tree; t = nt.nodes.new('ShaderNodeTexNoise'); r = nt.nodes.new('ShaderNodeValToRGB'); b = nt.nodes['Principled BSDF']
    nt.links.new(t.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], b.inputs['Base Color'])
    chk('nodes_link', len(nt.links) == 3, 'links=%d' % len(nt.links))
def t_world_render_settings():
    sc = bpy.context.scene; sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items else 'BLENDER_EEVEE'
    sc.render.resolution_x = 320; sc.render.resolution_y = 240
    chk('render_settings', sc.render.resolution_x == 320, sc.render.engine)
for n, f in list(globals().items()):
    if n.startswith('t_') and callable(f): tryit(n[2:], f)
out('OPS_DONE')
