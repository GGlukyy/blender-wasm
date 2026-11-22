# Geometry Nodes sada 5 (Curve to Mesh z primitiv: Spiral, Star, Arc, Quadrilateral, Bezier segment; Fill); desktop 5.3.0 počty v journey `gnnodes5`.
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
def cm(t,**kw):
    def f(ng,g):
        c=N(ng,t)
        for k,v in kw.items(): c.inputs[k].default_value=v
        p=N(ng,'GeometryNodeCurvePrimitiveCircle'); p.inputs['Resolution'].default_value=4; p.inputs['Radius'].default_value=0.05
        m=N(ng,'GeometryNodeCurveToMesh'); ng.links.new(c.outputs[0],m.inputs[0]); ng.links.new(p.outputs[0],m.inputs['Profile Curve']); return m.outputs[0]
    return f
def fillq(ng,g):
    c=N(ng,'GeometryNodeCurvePrimitiveQuadrilateral'); f=N(ng,'GeometryNodeFillCurve'); ng.links.new(c.outputs[0],f.inputs[0]); return f.outputs[0]
_GN = {}
for nm,f in (('spiral',cm('GeometryNodeCurveSpiral',Resolution=16,Rotations=2)),('arc',cm('GeometryNodeCurveArc',Resolution=9)),('quad',cm('GeometryNodeCurvePrimitiveQuadrilateral')),('fillq',fillq)):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:80]
