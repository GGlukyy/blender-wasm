# Výběr objektu klikem: stejné kliky (view3d.select na promítnuté 3D body) na webu i na desktopu. Výstup: řádky PICK <cíl> <vybráno>.
import bpy, bmesh, sys, math, mathutils
from bpy_extras import view3d_utils
def out(*a):
    print(*a); sys.stdout.flush()
def view():
    w = bpy.context.window_manager.windows[0]
    for a in w.screen.areas:
        if a.type == 'VIEW_3D': return w, a, [r for r in a.regions if r.type == 'WINDOW'][0]
def build():
    for o in list(bpy.data.objects):
        if o.type == 'MESH': bpy.data.objects.remove(o)
    C = bpy.data.collections[0].objects
    # Pokoj 10x10x10 bez stěny k pohledu, uvnitř malá krabice
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=10.0)
    front = [f for f in bm.faces if f.calc_center_median().y < -4.9]; bmesh.ops.delete(bm, geom=front, context='FACES_ONLY')
    me = bpy.data.meshes.new('Room'); bm.to_mesh(me); bm.free(); C.link(bpy.data.objects.new('Room', me))
    def cube(name, size, loc, rot=(0, 0, 0), scale=(1, 1, 1)):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=size); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); o.location = loc; o.rotation_euler = rot; o.scale = scale; C.link(o); return o
    cube('Box', 1.0, (0, 0, 0))
    cube('Bar', 1.0, (15, 0, 0), rot=(0, math.radians(45), 0), scale=(0.3, 0.3, 14))  # dlouhá šikmá tyč: AABB je skoro prázdný
    bpy.data.objects['Camera'].location = (-12, 0, 7); bpy.data.objects['Camera'].rotation_euler = (math.radians(70), 0, math.radians(30))
    bpy.data.objects['Light'].location = (-15, 0, -6)
    w, a, r = view(); rv = a.spaces[0].region_3d
    rv.view_perspective = 'PERSP'; rv.view_location = (0, 0, 0); rv.view_distance = 42.0
    rv.view_rotation = mathutils.Euler((math.radians(90), 0, 0)).to_quaternion()  # zepředu, -Y
    a.spaces[0].overlay.show_floor = False
    a.tag_redraw()
TARGETS = [
    ('Box_stred', (0, -0.5, 0), 'Box'),
    ('Pokoj_stena_zadni', (3.5, 5, 3.5), 'Room'),
    ('Pokoj_podlaha', (-3.5, 0, -5), 'Room'),
    ('Tyc_stred', (15, 0, 0), 'Bar'),
    ('Tyc_AABB_roh_prazdno', (19.5, 0, -4), ''),
    ('Tyc_AABB_roh2_prazdno', (10.5, 0, 4), ''),
    ('Prazdno_vpravo_nahore', (9, 0, 12), ''),
    ('Prazdno_dole', (0, 0, -9), ''),
]
# Wireframe: tak vybírá desktop 5.2.3 (malá krabice i uprostřed stěny).
WIRE = [
    ('Wire_Bar_stred', (15, 0, 0), 'Bar'),
    ('Wire_Box_hrana', (0.5, -0.5, 0), 'Box'),
    ('Wire_Box_stred_steny', (0, -0.5, 0), 'Box'),
]
def _cam_targets():
    c = bpy.data.objects['Camera']; L = bpy.data.objects['Light']; m = c.matrix_world
    d = c.data.display_size
    return [('Kamera_pocatek', m.translation.copy(), 'Camera'), ('Kamera_vedle', m @ mathutils.Vector((0, -d * 3, -d)), ''), ('Svetlo_pocatek', L.location.copy(), 'Light'), ('Svetlo_vedle', L.location + mathutils.Vector((3, 0, 0)), '')]
def pick():
    w, a, r = view(); rv = a.spaces[0].region_3d
    for name, co, want in TARGETS + _cam_targets():
        p = view3d_utils.location_3d_to_region_2d(r, rv, co)
        with bpy.context.temp_override(window=w, area=a, region=r):
            bpy.ops.view3d.select(location=(int(p.x), int(p.y)), deselect_all=True)
        sel = sorted(o.name for o in bpy.data.objects if o.select_get())
        out('PICK', name, 'chci=' + (want or '-'), 'je=' + (','.join(sel) or '-'))
    # Box select: obdélník 20 px kolem bodu, vybírá se přes prázdný roh AABB jen na webu se starým kódem.
    for name, co, want in [('Box_Tyc_stred', (15, 0, 0), 'Bar'), ('Box_Tyc_roh', (19.5, 0, -4), ''), ('Box_prazdno', (9, 0, 12), '')]:
        p = view3d_utils.location_3d_to_region_2d(r, rv, co)
        with bpy.context.temp_override(window=w, area=a, region=r):
            bpy.ops.object.select_all(action='DESELECT')
            bpy.ops.view3d.select_box(xmin=int(p.x) - 10, xmax=int(p.x) + 10, ymin=int(p.y) - 10, ymax=int(p.y) + 10, mode='SET')
        sel = sorted(o.name for o in bpy.data.objects if o.select_get())
        out('PICK', name, 'chci=' + (want or '-'), 'je=' + (','.join(sel) or '-'))
    a.spaces[0].shading.type = 'WIREFRAME'
    for name, co, want in WIRE:
        p = view3d_utils.location_3d_to_region_2d(r, rv, co)
        with bpy.context.temp_override(window=w, area=a, region=r):
            bpy.ops.view3d.select(location=(int(p.x), int(p.y)), deselect_all=True)
        sel = sorted(o.name for o in bpy.data.objects if o.select_get())
        out('PICK', name, 'chci=' + (want or '-'), 'je=' + (','.join(sel) or '-'))
    a.spaces[0].shading.type = 'SOLID'
    out('PICK_DONE')
def main():
    build(); bpy.app.timers.register(lambda: (pick(), None)[1], first_interval=3.0)
