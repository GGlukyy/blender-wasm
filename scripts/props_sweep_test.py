# Lov chyb kolo 66: Properties editor — všechny záložky pro každý typ objektu; chyby v UI skriptech = Traceback v konzoli.
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
objs = []
def add(fn, name):
    fn(); ob = bpy.context.view_layer.objects.active; ob.name = name; objs.append(ob)
add(lambda: bpy.ops.mesh.primitive_monkey_add(), 'MESH')
add(lambda: bpy.ops.curve.primitive_bezier_curve_add(), 'CURVE')
add(lambda: bpy.ops.object.text_add(), 'FONT')
add(lambda: bpy.ops.object.armature_add(), 'ARMATURE')
add(lambda: bpy.ops.object.light_add(type='SPOT'), 'LIGHT')
add(lambda: bpy.ops.object.camera_add(), 'CAMERA')
add(lambda: bpy.ops.object.empty_add(), 'EMPTY')
add(lambda: bpy.ops.object.metaball_add(), 'META')
add(lambda: bpy.ops.object.lightprobe_add(type='SPHERE'), 'PROBE')
add(lambda: bpy.ops.object.grease_pencil_add(type='MONKEY'), 'GP')
add(lambda: bpy.context.collection.objects.link(bpy.data.objects.new('H', bpy.data.hair_curves.new('H'))) or bpy.context.view_layer.objects.__setattr__('active', bpy.data.objects['H']), 'HAIR')
add(lambda: bpy.ops.object.add(type='LATTICE'), 'LATTICE')
add(lambda: bpy.ops.object.speaker_add(), 'SPEAKER')
add(lambda: bpy.ops.object.volume_add(), 'VOLUME')
add(lambda: bpy.ops.object.add(type='POINTCLOUD'), 'PC')
m = bpy.data.objects['MESH']; m.modifiers.new('S', 'SUBSURF'); m.modifiers.new('B', 'BEVEL'); mt = bpy.data.materials.new('M'); mt.use_nodes = True; m.data.materials.append(mt)
bpy.ops.object.select_all(action='DESELECT')
def props():
    win = bpy.context.window_manager.windows[0]
    a = next(a for a in win.screen.areas if a.type == 'PROPERTIES'); return a.spaces.active
tabs = ['TOOL', 'RENDER', 'OUTPUT', 'VIEW_LAYER', 'SCENE', 'WORLD', 'COLLECTION', 'OBJECT', 'MODIFIERS', 'EFFECTS', 'PARTICLES', 'PHYSICS', 'CONSTRAINTS', 'DATA', 'BONE', 'BONE_CONSTRAINTS', 'MATERIAL', 'TEXTURE', 'SHADERFX']
steps = [(o, t) for o in objs for t in tabs]
out('OPS_INFO props steps', len(steps))
state = {'i': 0, 'last': None}
def tick():
    i = state['i']
    if i >= len(steps):
        out('OPS_DONE'); return None
    ob, t = steps[i]; state['i'] += 1
    try:
        if state['last'] != ob.name:
            bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob; state['last'] = ob.name
            out('OPS props object', ob.name)
        sp = props()
        try: sp.context = t
        except TypeError: pass
    except BaseException as e:
        out('OPS props ERR', ob.name, t, type(e).__name__, str(e)[:100])
    return 0.12
bpy.app.timers.register(tick, first_interval=1.5)
