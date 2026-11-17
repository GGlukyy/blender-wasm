# Cycles Rendered: pozadí světa (oranžová) musí být ve viewportu vidět (ne černé). Screenshot dělá ops_test.mjs (OPS_SHOT).
import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
import addon_utils
addon_utils.enable('cycles', default_set=False)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.preview_samples = 16; sc.cycles.use_preview_denoising = False
w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (1.0, 0.4, 0.05, 1); bg.inputs['Strength'].default_value = 1.0
win = bpy.context.window_manager.windows[0]
v3d = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0].spaces.active
v3d.shading.type = 'RENDERED'; v3d.overlay.show_overlays = False
v3d.shading.use_scene_world_render = True
state = {'t0': time.time()}
def tick():
    if time.time() - state['t0'] < 15:
        return 1.0
    out('OPS cycles bg_ready'); out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=1.0)
