# F5: Geometry Nodes simulation zone (posun +0.1 Z/snímek) → bake na disk → snímek 10: z těžiště + počet souborů = desktop 5.3.0.
import bpy, os, sys, shutil
def out(*a): print(*a); sys.stdout.flush()
D = 'C:/Users/lukil/p2win/out/v2gnb' if os.environ.get('DESK') == '1' else '/tmp/v2gnb'
def run():
    try:
        for o in list(bpy.data.objects): bpy.data.objects.remove(o)
        sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, 10; sc.frame_set(1)
        bpy.ops.mesh.primitive_cube_add(); o = bpy.context.object
        m = o.modifiers.new('GN', 'NODES'); ng = bpy.data.node_groups.new('Sim', 'GeometryNodeTree'); m.node_group = ng
        ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
        ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
        N = ng.nodes; gi = N.new('NodeGroupInput'); go = N.new('NodeGroupOutput')
        si = N.new('GeometryNodeSimulationInput'); so = N.new('GeometryNodeSimulationOutput'); si.pair_with_output(so)
        tr = N.new('GeometryNodeSetPosition'); off = N.new('FunctionNodeInputVector'); off.vector = (0, 0, 0.1)
        L = ng.links; L.new(gi.outputs[0], si.inputs['Geometry']); L.new(si.outputs['Geometry'], tr.inputs['Geometry']); L.new(off.outputs[0], tr.inputs['Offset'])
        L.new(tr.outputs['Geometry'], so.inputs['Geometry']); L.new(so.outputs['Geometry'], go.inputs[0])
        shutil.rmtree(D, ignore_errors=True); m.bake_directory = D; m.bake_target = 'DISK'
        with bpy.context.temp_override(active_object=o, object=o, selected_objects=[o]):
            r = bpy.ops.object.simulation_nodes_cache_bake(selected=True)
        files = sum(len(fs) for _, _, fs in os.walk(D))
        sc.frame_set(10); ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        z = sum(v.co.z for v in ev.vertices) / max(1, len(ev.vertices))
        out('OPS v2gnb bake', r, 'files=%d' % files, 'z10=%.3f' % z, 'v=%d' % len(ev.vertices))
        sc.frame_set(5); ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()).data
        out('OPS v2gnb frame5 z=%.3f' % (sum(v.co.z for v in ev.vertices) / max(1, len(ev.vertices))))
    except Exception as e:
        out('OPS v2gnb ERR', str(e).strip().splitlines()[-1][:120])
    out('OPS_DONE')
if os.environ.get('DESK') == '1': run()
else: bpy.app.timers.register(lambda: run(), first_interval=1.0)
