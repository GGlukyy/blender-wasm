# Geometry Nodes sada 4 (primitiva: Grid, UV Sphere, Ico Sphere, Cone, Cylinder, Mesh Line); desktop 5.3.0 počty v journey `gnnodes4`.
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
def prim(t,**kw):
    def f(ng,g):
        n=N(ng,t)
        for k,v in kw.items(): n.inputs[k].default_value=v
        return n.outputs[0]
    return f
_GN = {}
for nm,f in (('grid',prim('GeometryNodeMeshGrid',**{'Vertices X':7,'Vertices Y':5})),('uv',prim('GeometryNodeMeshUVSphere',Segments=12,Rings=6)),('ico',prim('GeometryNodeMeshIcoSphere',Subdivisions=2)),('cone',prim('GeometryNodeMeshCone',Vertices=10)),('cyl',prim('GeometryNodeMeshCylinder',Vertices=10)),('line',prim('GeometryNodeMeshLine',Count=8))):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:60]
