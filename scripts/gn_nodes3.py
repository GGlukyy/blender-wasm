# Geometry Nodes sada 3 (Dual+Dissolve, Duplicate Elements, Scale Elements, Mesh Circle, Curve to Points, Flip Faces); desktop 5.3.0 počty v journey `gnnodes3`.
import bpy
o=bpy.data.objects['Cube']; bpy.context.view_layer.objects.active=o
def run(name, build):
    ng=bpy.data.node_groups.new(name,'GeometryNodeTree'); ng.interface.new_socket('Geometry',in_out='INPUT',socket_type='NodeSocketGeometry'); ng.interface.new_socket('Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
    i=ng.nodes.new('NodeGroupInput'); out=ng.nodes.new('NodeGroupOutput'); last=build(ng,i.outputs[0]); ng.links.new(last,out.inputs[0])
    md=o.modifiers.new(name,'NODES'); md.node_group=ng
    ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=ev.to_mesh(); r=(len(me.vertices),len(me.polygons)); ev.to_mesh_clear(); o.modifiers.remove(md); return r
def N(ng,t,**kw):
    n=ng.nodes.new(t)
    for k,v in kw.items(): setattr(n,k,v) if hasattr(n,k) else None
    return n
def dup(ng,g):
    d=N(ng,'GeometryNodeDuplicateElements'); d.domain='FACE'; ng.links.new(g,d.inputs[0]); d.inputs['Amount'].default_value=3; return d.outputs[0]
def scale(ng,g):
    s=N(ng,'GeometryNodeScaleElements'); s.domain='FACE'; ng.links.new(g,s.inputs[0]); s.inputs['Scale'].default_value=0.5; return s.outputs[0]
def circ(ng,g):
    c=N(ng,'GeometryNodeMeshCircle'); c.inputs['Vertices'].default_value=9; return c.outputs[0]
def c2p(ng,g):
    c=N(ng,'GeometryNodeCurvePrimitiveLine'); r=N(ng,'GeometryNodeResampleCurve'); ng.links.new(c.outputs[0],r.inputs[0]); r.inputs['Count'].default_value=7; return r.outputs[0]
def flipf(ng,g):
    f=N(ng,'GeometryNodeFlipFaces'); ng.links.new(g,f.inputs[0]); return f.outputs[0]
def dissolve(ng,g):
    s=N(ng,'GeometryNodeSubdivideMesh'); ng.links.new(g,s.inputs[0]); s.inputs[1].default_value=2; d=N(ng,'GeometryNodeDualMesh'); ng.links.new(s.outputs[0],d.inputs[0]); return d.outputs[0]
_GN = {}
for nm,f in (('dup',dup),('scale',scale),('circ',circ),('c2p',c2p),('flip',flipf),('dualsub',dissolve)):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:60]
