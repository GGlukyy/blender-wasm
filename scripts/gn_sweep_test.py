# Lov chyb kolo 66: každý typ GeometryNode* uzlu v minimální skupině → vyhodnotit modifikátor Nodes na Suzanne (pád/zamrznutí = nedoběhne).
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_monkey_add(); ob = bpy.context.object
types = []
for n in dir(bpy.types):
    if n.startswith('GeometryNode') and n not in ('GeometryNode', 'GeometryNodeCustomGroup', 'GeometryNodeGroup'):
        c = getattr(bpy.types, n)
        try:
            if issubclass(c, bpy.types.GeometryNode) and c is not bpy.types.GeometryNode: types.append(n)
        except Exception: pass
types.sort()
skip = {'GeometryNodeSimulationInput', 'GeometryNodeSimulationOutput', 'GeometryNodeRepeatInput', 'GeometryNodeRepeatOutput', 'GeometryNodeForeachGeometryElementInput', 'GeometryNodeForeachGeometryElementOutput', 'GeometryNodeBake', 'GeometryNodeClosureInput', 'GeometryNodeClosureOutput'}
out('OPS_INFO gn types', len(types))
state = {'i': 0}
def build(tn):
    ng = bpy.data.node_groups.new('G_' + tn, 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gi = ng.nodes.new('NodeGroupInput'); go = ng.nodes.new('NodeGroupOutput'); n = ng.nodes.new(tn)
    # propoj první vstup typu GEOMETRY a první výstup GEOMETRY, jinak jen projít skrz
    linked_in = False
    for s in n.inputs:
        if s.type == 'GEOMETRY' and s.enabled:
            ng.links.new(gi.outputs[0], s); linked_in = True; break
    linked_out = False
    for s in n.outputs:
        if s.type == 'GEOMETRY' and s.enabled:
            ng.links.new(s, go.inputs[0]); linked_out = True; break
    if not linked_out: ng.links.new(gi.outputs[0], go.inputs[0])
    for m in list(ob.modifiers): ob.modifiers.remove(m)
    md = ob.modifiers.new('GN', 'NODES'); md.node_group = ng
    return ng
def tick():
    i = state['i']
    if i >= len(types):
        out('OPS_DONE'); return None
    tn = types[i]; state['i'] += 1
    if tn in skip:
        return 0.02
    out('OPS gn eval', tn)
    try:
        ng = build(tn)
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); n = len(ev.data.vertices)
        out('OPS gn ok', tn, n)
    except BaseException as e:
        out('OPS gn ERR', tn, type(e).__name__, str(e)[:100])
    return 0.1
bpy.app.timers.register(tick, first_interval=1.5)
