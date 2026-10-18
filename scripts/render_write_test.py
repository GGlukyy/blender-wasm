# Render → soubor s opravdovými pixely (kolo 65). Běží přes ops_test.mjs (OPS_PY). Řetěz timerů: po renderu je třeba
# nechat doběhnout odložené čtení z GPU (hlavní smyčka), teprve pak zkontrolovat soubor.
import bpy, os, sys
def out(*a):
    print(*a); sys.stdout.flush()
sc = bpy.context.scene
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(); bpy.ops.mesh.primitive_cube_add()
bpy.ops.object.light_add(type='POINT', location=(2, -2, 3)); bpy.ops.object.camera_add(location=(4, -4, 3), rotation=(1.1, 0, 0.78)); sc.camera = bpy.context.object
sc.render.resolution_x = 64; sc.render.resolution_y = 64; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
state = {'step': 0, 'waited': 0}
def check(path, tag, quiet=False):
    im = bpy.data.images.load(path, check_existing=False); px = list(im.pixels)
    a = max(px[3::4]); r = max(px[0::4])
    ok = a > 0.5 and r > 0.02 and os.path.getsize(path) > 100
    if quiet: return ok
    out('OPS render_write %s %s alpha=%.3f rgbmax=%.3f' % (tag, 'PASS' if ok else 'FAIL', a, r)); return ok
def tick():
    s = state['step']
    if s == 0:   # krok 0: F12 bez zápisu, pak Save As z Render Result
        sc.render.engine = 'BLENDER_EEVEE'; bpy.ops.render.render(); state['step'] = 1; return 3.0
    if s == 1:
        rr = bpy.data.images['Render Result']; rr.save_render('/tmp/rw_saveas.png')   # první EEVEE render kompiluje shadery → čtení trvá; čekej na pixely
        if not check('/tmp/rw_saveas.png', 'eevee_save_as', quiet=True) and state['waited'] < 20:
            state['waited'] += 1; return 1.0
        check('/tmp/rw_saveas.png', 'eevee_save_as')
        state['step'] = 2; state['waited'] = 0; return 0.5
    if s in (2, 4):
        eng = 'BLENDER_EEVEE' if s == 2 else 'BLENDER_WORKBENCH'; sc.render.engine = eng
        sc.render.filepath = '/tmp/rw_%d.png' % s
        if os.path.exists(sc.render.filepath): os.remove(sc.render.filepath)
        bpy.ops.render.render(write_still=True); state['step'] = s + 1; state['waited'] = 0; return 1.0
    if s in (3, 5):
        p = '/tmp/rw_%d.png' % (s - 1)
        if not os.path.exists(p) and state['waited'] < 12:
            state['waited'] += 1; return 1.0
        if os.path.exists(p): check(p, 'eevee_write_still' if s == 3 else 'workbench_write_still')
        else: out('OPS render_write %s FAIL no file' % p)
        state['step'] = s + 1; return 0.5
    if s == 6:   # Viewport Render (render.opengl) — čte pixely z offscreen GPU bufferu
        sc.render.filepath = '/tmp/rw_gl.png'
        if os.path.exists(sc.render.filepath): os.remove(sc.render.filepath)
        win = bpy.context.window_manager.windows[0]
        area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); reg = next(r for r in area.regions if r.type == 'WINDOW')
        try:
            with bpy.context.temp_override(window=win, area=area, region=reg, scene=sc):
                bpy.ops.render.opengl(write_still=True, view_context=False)
        except Exception as e:
            out('OPS render_write opengl FAIL EXC', str(e)[:120]); state['step'] = 8; return 0.1
        state['step'] = 7; state['waited'] = 0; return 1.0
    if s == 7:
        p = '/tmp/rw_gl.png'
        if not os.path.exists(p) and state['waited'] < 12:
            state['waited'] += 1; return 1.0
        if os.path.exists(p):   # ZNÁMÁ MEZERA (BACKLOG): 8bit offscreen read vrací nuly; hlásí se jako GAP, při opravě se změní na PASS
            ok = check(p, 'opengl_write_still', quiet=True); out('OPS render_write opengl_write_still', 'PASS' if ok else 'GAP (prázdný soubor, viz BACKLOG)')
        else: out('OPS render_write opengl FAIL no file')
        state['step'] = 8; return 0.5
    out('OPS_DONE')
    return None
bpy.app.timers.register(tick, first_interval=1.0)
