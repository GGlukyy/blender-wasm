# Geometry Nodes sada 2 (Curve to Mesh, Mesh to Volume to Mesh, Merge by Distance, Split Edges, Transform); desktop 5.3.0 počty v journey `gnnodes2`.
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
def curvemesh(ng,g):
    c=N(ng,'GeometryNodeCurvePrimitiveCircle'); c.inputs['Resolution'].default_value=12; p=N(ng,'GeometryNodeCurvePrimitiveCircle'); p.inputs['Resolution'].default_value=6; p.inputs['Radius'].default_value=0.1
    m=N(ng,'GeometryNodeCurveToMesh'); ng.links.new(c.outputs[0],m.inputs[0]); ng.links.new(p.outputs[0],m.inputs['Profile Curve']); return m.outputs[0]
def fill(ng,g):
    c=N(ng,'GeometryNodeCurvePrimitiveStar'); f=N(ng,'GeometryNodeFillCurve'); ng.links.new(c.outputs[0],f.inputs[0]); return f.outputs[0]
def resample(ng,g):
    c=N(ng,'GeometryNodeCurveSpiral'); r=N(ng,'GeometryNodeResampleCurve'); ng.links.new(c.outputs[0],r.inputs[0]); r.inputs['Count'].default_value=40; m=N(ng,'GeometryNodeCurveToPoints'); ng.links.new(r.outputs[0],m.inputs[0]); m.inputs['Count'].default_value=40; return m.outputs[0]
def vol(ng,g):
    v=N(ng,'GeometryNodeMeshToVolume'); ng.links.new(g,v.inputs[0]); v.inputs['Voxel Amount'].default_value=24.0 if 'Voxel Amount' in v.inputs.keys() else 0; vm=N(ng,'GeometryNodeVolumeToMesh'); ng.links.new(v.outputs[0],vm.inputs[0]); return vm.outputs[0]
def merge(ng,g):
    s=N(ng,'GeometryNodeSubdivideMesh'); ng.links.new(g,s.inputs[0]); s.inputs[1].default_value=2; m=N(ng,'GeometryNodeMergeByDistance'); ng.links.new(s.outputs[0],m.inputs[0]); m.inputs['Distance'].default_value=0.6; return m.outputs[0]
def split(ng,g):
    s=N(ng,'GeometryNodeSplitEdges'); ng.links.new(g,s.inputs[0]); return s.outputs[0]
def flip(ng,g):
    t=N(ng,'GeometryNodeTransform'); ng.links.new(g,t.inputs[0]); t.inputs['Scale'].default_value=(1,2,3); return t.outputs[0]
def sampleidx(ng,g):
    s=N(ng,'GeometryNodeSubdivisionSurface'); ng.links.new(g,s.inputs[0]); s.inputs[1].default_value=2; d=N(ng,'GeometryNodeDeleteGeometry'); ng.links.new(s.outputs[0],d.inputs[0]); p=N(ng,'GeometryNodeInputIndex'); c=N(ng,'FunctionNodeCompare'); c.data_type='INT'; c.operation='LESS_THAN'; ng.links.new(p.outputs[0],c.inputs[2]); c.inputs[3].default_value=20; ng.links.new(c.outputs[0],d.inputs[1]); return d.outputs[0]
_GN = {}
for nm,f in (('curvemesh',curvemesh),('vol',vol),('merge',merge),('split',split),('transform',flip)):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:60]
