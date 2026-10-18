import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.mesh.primitive_cube_add(size=1.5); src = bpy.context.object
bpy.ops.object.volume_add(); vol = bpy.context.object
md = vol.modifiers.new('MV', 'MESH_TO_VOLUME'); md.object = src; md.voxel_amount = 32
def tick():
    dg = bpy.context.evaluated_depsgraph_get(); ev = vol.evaluated_get(dg)
    out('OPS vdb grids', len(ev.data.grids), [g.name for g in ev.data.grids][:5], 'mods', [m.type for m in vol.modifiers])
    # alternativa: GN Mesh to Volume
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=2.0)
