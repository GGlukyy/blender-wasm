# Lov chyb kolo 66: každý shader node typ v minimálním materiálu → render EEVEE 16×16; hledají se nepřeložené shadery v logu.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'; sc.render.resolution_x = sc.render.resolution_y = 16; sc.render.resolution_percentage = 100
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_uv_sphere_add(radius=1.2); ob = bpy.context.object
bpy.ops.object.camera_add(location=(0, -5, 0), rotation=(1.5708, 0, 0)); sc.camera = bpy.context.object
bpy.ops.object.light_add(type='SUN', rotation=(0.8, 0, 0.3))
img = bpy.data.images.new('NI', 8, 8)
skip = {'ShaderNodeOutputMaterial', 'ShaderNodeOutputLight', 'ShaderNodeOutputWorld', 'ShaderNodeOutputAOV', 'ShaderNodeOutputLineStyle', 'ShaderNodeGroup', 'ShaderNodeCustomGroup',
        'ShaderNodeScript', 'ShaderNodeTexIES', 'ShaderNodeBsdfHairPrincipled', 'ShaderNodeBsdfHair', 'ShaderNodeBsdfToon', 'ShaderNodeVolumePrincipled'}
types = []
for n in dir(bpy.types):
    if n.startswith('ShaderNode') and n not in skip:
        c = getattr(bpy.types, n)
        try:
            if issubclass(c, bpy.types.ShaderNode) and c is not bpy.types.ShaderNode and hasattr(c, 'bl_rna'): types.append(n)
        except Exception: pass
types.sort()
out('OPS_INFO node types', len(types))
state = {'i': 0, 'phase': 0}
def build(tn):
    m = bpy.data.materials.new('M_' + tn); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    outn = nt.nodes.new('ShaderNodeOutputMaterial'); node = nt.nodes.new(tn)
    if hasattr(node, 'image'): node.image = img
    em = nt.nodes.new('ShaderNodeEmission')
    linked = False
    for o in node.outputs:
        if o.type == 'SHADER':
            nt.links.new(o, outn.inputs['Volume' if tn in ('ShaderNodeVolumeAbsorption', 'ShaderNodeVolumeScatter', 'ShaderNodeVolumeCoefficients') else 'Surface']); linked = True; break
    if not linked:
        for o in node.outputs:
            if o.type in ('RGBA', 'VECTOR', 'VALUE') and o.enabled:
                try:
                    nt.links.new(o, em.inputs['Color']); linked = True; break
                except Exception: pass
        nt.links.new(em.outputs[0], outn.inputs['Surface'])
    ob.data.materials.clear(); ob.data.materials.append(m)
    return m
def tick():
    i = state['i']
    if i >= len(types):
        out('OPS_DONE'); return None
    tn = types[i]
    try:
        build(tn); out('OPS node_sweep render', tn)
        bpy.ops.render.render()
    except Exception as e:
        out('OPS node_sweep ERR', tn, type(e).__name__, str(e)[:100])
    state['i'] += 1; return 0.8
bpy.app.timers.register(tick, first_interval=1.5)
