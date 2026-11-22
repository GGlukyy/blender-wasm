# Geometry Nodes sada 6 (pole: Set Position, Extrude s Selection, Delete podle indexu, Separate Geometry, Scale); desktop 5.3.0 počty v journey `gnnodes6`.
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
def setpos(ng,g):
    s=N(ng,'GeometryNodeSetPosition'); ng.links.new(g,s.inputs[0]); s.inputs['Offset'].default_value=(0,0,1); return s.outputs[0]
def delidx(ng,g):
    s=N(ng,'GeometryNodeSubdivideMesh'); ng.links.new(g,s.inputs[0]); s.inputs[1].default_value=2
    d=N(ng,'GeometryNodeDeleteGeometry'); ng.links.new(s.outputs[0],d.inputs[0]); d.domain='FACE'
    i=N(ng,'GeometryNodeInputIndex'); c=N(ng,'FunctionNodeCompare'); c.data_type='INT'; c.operation='LESS_THAN'; ng.links.new(i.outputs[0],c.inputs[2]); c.inputs[3].default_value=30; ng.links.new(c.outputs[0],d.inputs[1]); return d.outputs[0]
def sep(ng,g):
    s=N(ng,'GeometryNodeSeparateGeometry'); s.domain='FACE'; ng.links.new(g,s.inputs[0])
    i=N(ng,'GeometryNodeInputIndex'); c=N(ng,'FunctionNodeCompare'); c.data_type='INT'; c.operation='LESS_THAN'; ng.links.new(i.outputs[0],c.inputs[2]); c.inputs[3].default_value=2; ng.links.new(c.outputs[0],s.inputs[1]); return s.outputs[0]
def ext(ng,g):
    e=N(ng,'GeometryNodeExtrudeMesh'); e.mode='FACES'; ng.links.new(g,e.inputs[0]); e.inputs['Offset Scale'].default_value=0.5; return e.outputs[0]
def inst(ng,g):
    p=N(ng,'GeometryNodeMeshToPoints'); ng.links.new(g,p.inputs[0]); c=N(ng,'GeometryNodeMeshIcoSphere'); c.inputs['Subdivisions'].default_value=1
    i=N(ng,'GeometryNodeInstanceOnPoints'); ng.links.new(p.outputs[0],i.inputs[0]); ng.links.new(c.outputs[0],i.inputs['Instance']); r=N(ng,'GeometryNodeRealizeInstances'); ng.links.new(i.outputs[0],r.inputs[0]); return r.outputs[0]
_GN = {}
for nm,f in (('setpos',setpos),('ext',ext),('inst',inst)):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:80]
