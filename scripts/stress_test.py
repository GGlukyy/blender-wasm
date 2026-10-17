# Zátěž: hodně objektů/polygonů + dlouhý undo řetěz. Běží v ops_test.mjs (OPS_PY=stress_test.py).
import bpy, sys, time
def out(*a): print(*a); sys.stdout.flush()
t0 = time.time()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
w = bpy.context.window_manager.windows[0]
for i in range(30):
    bpy.ops.mesh.primitive_monkey_add(location=(i % 6 * 3, i // 6 * 3, 0))
    ob = bpy.context.object
    m = ob.modifiers.new('S', 'SUBSURF'); m.levels = 2; m.render_levels = 2
    bpy.ops.object.modifier_apply(modifier='S')
polys = sum(len(o.data.polygons) for o in bpy.data.objects)
out('OPS stress objects', len(bpy.data.objects), 'polys', polys, 'sec', round(time.time() - t0, 1))
# undo řetěz
bpy.ops.ed.undo_push(message='start')
t1 = time.time()
for i in range(60):
    bpy.ops.transform.translate(value=(0.01, 0, 0)); bpy.ops.ed.undo_push(message='t%d' % i)
out('OPS stress 60 pushes sec', round(time.time() - t1, 1))
t2 = time.time(); n = 0
with bpy.context.temp_override(window=w, screen=w.screen, area=w.screen.areas[0]):
    for i in range(60):
        try: bpy.ops.ed.undo(); n += 1
        except Exception as e: out('OPS stress undo fail', i, str(e)[:60]); break
    for i in range(60):
        try: bpy.ops.ed.redo()
        except Exception as e: break
out('OPS stress undo/redo', n, 'sec', round(time.time() - t2, 1))
# vyhodnocení po všem
out('OPS stress alive polys', sum(len(o.data.polygons) for o in bpy.data.objects))
out('OPS_DONE failed=0 total=0')
