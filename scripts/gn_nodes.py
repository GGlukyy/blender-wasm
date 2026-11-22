# Geometry Nodes: počty vrcholů/ploch pro 8 sítí uzlů; desktop 5.3.0 viz journey `gnnodes`.
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
def subdiv(ng,g): n=N(ng,'GeometryNodeSubdivisionSurface'); ng.links.new(g,n.inputs[0]); n.inputs[1].default_value=3; return n.outputs[0]
def dist(ng,g):
    d=N(ng,'GeometryNodeDistributePointsOnFaces'); d.distribute_method='RANDOM'; ng.links.new(g,d.inputs[0]); d.inputs[2].default_value=50.0 if False else d.inputs[2].default_value
    d.inputs['Density'].default_value=200.0; d.inputs['Seed'].default_value=1
    c=N(ng,'GeometryNodeMeshCube'); io=N(ng,'GeometryNodeInstanceOnPoints'); ng.links.new(d.outputs[0],io.inputs[0]); ng.links.new(c.outputs[0],io.inputs['Instance']); ri=N(ng,'GeometryNodeRealizeInstances'); ng.links.new(io.outputs[0],ri.inputs[0]); return ri.outputs[0]
def extrude(ng,g): n=N(ng,'GeometryNodeExtrudeMesh'); ng.links.new(g,n.inputs[0]); n.inputs['Offset Scale'].default_value=0.5; return n.outputs[0]
def dual(ng,g): n=N(ng,'GeometryNodeDualMesh'); ng.links.new(g,n.inputs[0]); s=N(ng,'GeometryNodeSubdivideMesh'); ng.links.new(g,s.inputs[0]); s.inputs[1].default_value=3; ng.links.remove(ng.links[-1]) if False else None; return n.outputs[0]
def boolean(ng,g):
    s=N(ng,'GeometryNodeMeshUVSphere'); b=N(ng,'GeometryNodeMeshBoolean'); b.operation='DIFFERENCE'; ng.links.new(g,b.inputs[0]); ng.links.new(s.outputs[0],b.inputs[1]); return b.outputs[0]
def hull(ng,g): n=N(ng,'GeometryNodeConvexHull'); s=N(ng,'GeometryNodeMeshUVSphere'); j=N(ng,'GeometryNodeJoinGeometry'); ng.links.new(g,n.inputs[0]); return n.outputs[0]
def tri(ng,g): n=N(ng,'GeometryNodeTriangulate'); ng.links.new(g,n.inputs[0]); return n.outputs[0]
def dissolve(ng,g): n=N(ng,'GeometryNodeMeshToPoints'); ng.links.new(g,n.inputs[0]); m=N(ng,'GeometryNodePointsToCurves') if False else None; return n.outputs[0]
_GN = {}
for nm,f in (('subdiv',subdiv),('dist',dist),('extrude',extrude),('dual',dual),('boolean',boolean),('hull',hull),('tri',tri),('m2p',dissolve)):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:60]
