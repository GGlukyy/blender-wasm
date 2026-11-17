# Cycles Rendered: pozadí světa (oranžová) musí být ve viewportu vidět (ne černé). Screenshot dělá ops_test.mjs (OPS_SHOT).
import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
import addon_utils
addon_utils.enable('cycles', default_set=False)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.preview_samples = 16; sc.cycles.use_preview_denoising = False
win = bpy.context.window_manager.windows[0]
v3d = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0].spaces.active
v3d.shading.type = 'RENDERED'; v3d.overlay.show_overlays = False
v3d.shading.use_scene_world_render = True
state = {'t0': time.time()}
def tick():
    if time.time() - state['t0'] < 15:
        return 1.0
    w=sc.world; out('OPS cycles bg_ready world=%s col=%s strength=%s nodes=%s' % (w, tuple(w.node_tree.nodes['Background'].inputs[0].default_value) if w and w.node_tree else None, w.node_tree.nodes['Background'].inputs[1].default_value if w and w.node_tree else None, w.use_nodes if w else None)); out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
