# Render animace (Ctrl+F12 / render.render(animation=True)) → každý snímek má opravdové pixely (kolo 65).
# Běží přes ops_test.mjs (OPS_PY). Po operátoru se čeká timery na doběhnutí asynchronního čtení z GPU.
import bpy, os, glob, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
cube = bpy.context.object
bpy.ops.object.light_add(type='POINT', location=(2, -2, 3)); bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.resolution_x = 64; sc.render.resolution_y = 64; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.frame_start, sc.frame_end = 1, 3
cube.location.x = 0; cube.keyframe_insert('location', frame=1); cube.location.x = 1; cube.keyframe_insert('location', frame=3)
D = '/tmp/ra/'
state = {'step': 0, 'waited': 0}
def frames(): return sorted(glob.glob(D + 'f_*.png'))
def check(f):
    im = bpy.data.images.load(f, check_existing=False); px = list(im.pixels)
    return max(px[3::4]) > 0.5 and max(px[0::4]) > 0.02 and os.path.getsize(f) > 100
def tick():
    s = state['step']
    if s in (0, 2, 4):   # 4 = INVOKE (jako Ctrl+F12 z menu)
        eng = 'BLENDER_EEVEE' if s == 2 else 'BLENDER_WORKBENCH'; sc.render.engine = eng
        os.makedirs(D, exist_ok=True)
        for f in glob.glob(D + '*'): os.remove(f)
        sc.render.filepath = D + 'f_'
        if s == 4: bpy.ops.render.render('INVOKE_DEFAULT', animation=True)
        else: bpy.ops.render.render(animation=True)
        state['step'] = s + 1; state['waited'] = 0; return 2.0
    if s in (1, 3, 5):
        tag = ('workbench', 'eevee', 'workbench_invoke')[s // 2]
        if len(frames()) < 3 and state['waited'] < 40:
            state['waited'] += 1; return 1.0
        fs = frames(); ok = len(fs) == 3 and all(check(f) for f in fs)
        out('OPS render_anim %s %s files=%d' % (tag, 'PASS' if ok else 'FAIL', len(fs)))
        state['step'] = s + 1; return 0.5
    out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
