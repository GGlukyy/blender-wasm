# Geometry Nodes sada 7 (pole: Delete Geometry a Separate Geometry podle indexu, Sample Index-free); desktop 5.3.0 počty v journey `gnnodes7`.
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
def cmp(ng,n):
    c=N(ng,'FunctionNodeCompare'); c.data_type='INT'; c.operation='LESS_THAN'
    ins=[s for s in c.inputs if s.type=='INT' and s.enabled]
    ng.links.new(N(ng,'GeometryNodeInputIndex').outputs[0],ins[0]); ins[1].default_value=n; return c.outputs[0]
def delidx(ng,g):
    s=N(ng,'GeometryNodeSubdivideMesh'); ng.links.new(g,s.inputs[0]); s.inputs[1].default_value=2
    d=N(ng,'GeometryNodeDeleteGeometry'); ng.links.new(s.outputs[0],d.inputs[0]); d.domain='FACE'; ng.links.new(cmp(ng,30),d.inputs[1]); return d.outputs[0]
def sep(ng,g):
    s=N(ng,'GeometryNodeSeparateGeometry'); s.domain='FACE'; ng.links.new(g,s.inputs[0]); ng.links.new(cmp(ng,2),s.inputs[1]); return s.outputs[0]
_GN = {}
for nm,f in (('delidx',delidx),('sep',sep)):
    try: _GN[nm] = list(run(nm, f))
    except Exception as e: _GN[nm] = 'ERR ' + str(e)[:80]
