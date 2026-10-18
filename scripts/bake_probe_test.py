# Lov chyb kolo 66: baking a probes ve web Blenderu. Běží přes ops_test.mjs (OPS_PY).
import bpy, os, sys, traceback
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
def fresh():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
    bpy.ops.mesh.primitive_cube_add(); return bpy.context.object
def case(name, fn):
    try:
        r = fn(); out('OPS bake_probe %s PASS %s' % (name, r if r is not None else ''))
    except Exception as e:
        out('OPS bake_probe %s FAIL %s' % (name, (type(e).__name__ + ': ' + str(e))[:200]))
def lightprobe_bake():
    fresh(); bpy.ops.object.lightprobe_add(type='SPHERE', location=(0, 0, 3)); bpy.ops.object.light_add(type='POINT', location=(2, 2, 3))
    sc.render.engine = 'BLENDER_EEVEE'
    r = bpy.ops.object.lightprobe_cache_bake(subset='ALL'); return r
def volume_probe_bake():
    fresh(); bpy.ops.object.lightprobe_add(type='VOLUME', location=(0, 0, 0)); sc.render.engine = 'BLENDER_EEVEE'
    return bpy.ops.object.lightprobe_cache_bake(subset='ALL')
def bake_texture():
    ob = fresh(); sc.render.engine = 'BLENDER_EEVEE'
    img = bpy.data.images.new('B', 32, 32); m = bpy.data.materials.new('M'); m.use_nodes = True
    t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = img; m.node_tree.nodes.active = t; ob.data.materials.append(m)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT')
    sc.render.engine = 'BLENDER_WORKBENCH'
    return 'engine-ok'
def render_to_image_save():
    fresh(); bpy.ops.object.camera_add(location=(0, -5, 0), rotation=(1.5708, 0, 0)); sc.camera = bpy.context.object
    sc.render.resolution_x = sc.render.resolution_y = 32; sc.render.engine = 'BLENDER_WORKBENCH'
    bpy.ops.render.render(); return len(bpy.data.images['Render Result'].pixels)
def hdri_world_load():
    img = bpy.data.images.new('H', 8, 4, float_buffer=True); img.filepath_raw = '/tmp/h.exr'; img.file_format = 'OPEN_EXR'; img.save()
    w = bpy.data.worlds.new('HW'); w.use_nodes = True; env = w.node_tree.nodes.new('ShaderNodeTexEnvironment')
    env.image = bpy.data.images.load('/tmp/h.exr'); return env.image.size[:]
def hdr_roundtrip():
    img = bpy.data.images.new('R', 8, 4, float_buffer=True); img.filepath_raw = '/tmp/r.hdr'; img.file_format = 'HDR'; img.save(); return os.path.getsize('/tmp/r.hdr')
def jpg_tga_bmp():
    img = bpy.data.images.new('J', 16, 16); res = []
    for f, ext in (('JPEG', 'jpg'), ('TARGA', 'tga'), ('BMP', 'bmp'), ('TIFF', 'tif'), ('WEBP', 'webp')):
        try:
            img.filepath_raw = '/tmp/j.' + ext; img.file_format = f; img.save(); res.append('%s=%d' % (ext, os.path.getsize('/tmp/j.' + ext)))
        except Exception as e: res.append('%s=ERR' % ext)
    return ' '.join(res)
def text_font_load():
    fresh(); bpy.ops.object.text_add(); t = bpy.context.object; t.data.body = 'Čau ř'; ev = t.evaluated_get(bpy.context.evaluated_depsgraph_get()); me = ev.to_mesh(); n = len(me.vertices); ev.to_mesh_clear(); assert n > 10, n; return n
def video_formats():
    sc.render.image_settings.file_format = 'FFMPEG'; return sc.render.image_settings.file_format
def sound_add():
    sc.sequence_editor_create(); return len(sc.sequence_editor.strips_all) if hasattr(sc.sequence_editor, 'strips_all') else 'ok'
def mesh_boolean_exact():
    a = fresh(); bpy.ops.mesh.primitive_uv_sphere_add(location=(0.5, 0, 0)); b = bpy.context.object
    m = a.modifiers.new('B', 'BOOLEAN'); m.object = b; m.solver = 'EXACT'; m.operation = 'DIFFERENCE'
    ev = a.evaluated_get(bpy.context.evaluated_depsgraph_get()); return len(ev.data.polygons)
def remesh_voxel_modifier():
    a = fresh(); m = a.modifiers.new('R', 'REMESH'); m.mode = 'VOXEL'; m.voxel_size = 0.1
    ev = a.evaluated_get(bpy.context.evaluated_depsgraph_get()); return len(ev.data.polygons)
def geonodes_bake_cache():
    a = fresh(); m = a.modifiers.new('G', 'NODES'); ng = bpy.data.node_groups.new('G', 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    i = ng.nodes.new('NodeGroupInput'); o = ng.nodes.new('NodeGroupOutput'); bk = ng.nodes.new('GeometryNodeSimulationInput') if False else None
    ng.links.new(i.outputs[0], o.inputs[0]); m.node_group = ng
    return len(a.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons)
CASES = [('lightprobe_cache_bake_sphere', lightprobe_bake), ('lightprobe_cache_bake_volume', volume_probe_bake), ('bake_prep', bake_texture),
         ('render_result_pixels', render_to_image_save), ('exr_world_load', hdri_world_load), ('hdr_save', hdr_roundtrip), ('image_formats_extra', jpg_tga_bmp),
         ('text_diacritics_mesh', text_font_load), ('ffmpeg_format_settable', video_formats), ('sequencer_create', sound_add),
         ('boolean_exact', mesh_boolean_exact), ('remesh_voxel_modifier', remesh_voxel_modifier), ('geonodes_passthrough', geonodes_bake_cache)]
state = {'i': 0}
def tick():
    i = state['i']
    if i >= len(CASES):
        out('OPS_DONE'); return None
    case(*CASES[i]); state['i'] += 1; return 1.5
bpy.app.timers.register(tick, first_interval=1.0)
