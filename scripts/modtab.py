# Tabulka modifikátorů: stejný kód na webu (cesta modtab) i v desktopu (journey_desktop.py). Řádek = [jméno, vrcholů, ploch, objem/None] nebo [jméno, 'ERR', text].
import bpy, bmesh
MODTAB = [('SUBSURF', 'SUBSURF', {'levels': 2}), ('BEVEL', 'BEVEL', {'width': 0.1, 'segments': 3}), ('MIRROR', 'MIRROR', {}), ('ARRAY', 'ARRAY', {'count': 3}), ('SOLIDIFY', 'SOLIDIFY', {'thickness': 0.1}),
          ('DECIMATE', 'DECIMATE', {'ratio': 0.5}), ('VOXEL', 'REMESH', {'mode': 'VOXEL', 'voxel_size': 0.2}), ('SHARP', 'REMESH', {'mode': 'SHARP', 'octree_depth': 4}), ('SMOOTHREM', 'REMESH', {'mode': 'SMOOTH', 'octree_depth': 4}),
          ('WIREFRAME', 'WIREFRAME', {}), ('SCREW', 'SCREW', {}), ('TRI', 'TRIANGULATE', {}), ('SPLIT', 'EDGE_SPLIT', {}), ('SKIN', 'SKIN', {}), ('WELD', 'WELD', {}), ('MULTIRES', 'MULTIRES', {}), ('CAST', 'CAST', {'factor': 0.5}), ('SMOOTH', 'SMOOTH', {'iterations': 5}),
          ('BOOL_EXACT', 'BOOLEAN', {'solver': 'EXACT'}), ('BOOL_FLOAT', 'BOOLEAN', {'solver': 'FLOAT'}), ('BOOL_MANIFOLD', 'BOOLEAN', {'solver': 'MANIFOLD'})]
def modtab_row(i):
    name, typ, props = MODTAB[i]
    for o in list(bpy.data.objects):
        if o.name.startswith('MT'): bpy.data.objects.remove(o)
    bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0)); o = bpy.context.object; o.name = 'MT'
    try:
        m = o.modifiers.new('m', typ)
        for k, v in props.items(): setattr(m, k, v)
        if typ == 'BOOLEAN':
            bpy.ops.mesh.primitive_uv_sphere_add(radius=1.2, location=(0.5, 0.5, 0.5)); s = bpy.context.object; s.name = 'MTS'; m.object = s; bpy.context.view_layer.objects.active = o
        if typ == 'MULTIRES': bpy.context.view_layer.objects.active = o; bpy.ops.object.multires_subdivide(modifier='m', mode='CATMULL_CLARK')
        if typ == 'ARRAY': m.relative_offset_displace = (1.5, 0, 0)
        dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); me = e.to_mesh()
        b = bmesh.new(); b.from_mesh(me); vol = round(b.calc_volume(signed=True), 3); b.free(); r = [name, len(me.vertices), len(me.polygons), vol]; e.to_mesh_clear()
        return r
    except Exception as x:
        return [name, 'ERR', repr(x)[:120]]
