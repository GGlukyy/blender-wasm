# H25/T5: Rigify meta-rig → Generate → Pose → bone rotation → Ctrl+P automatic weights → deform
import bpy, sys, traceback, addon_utils
def out(*a):
    print(*a); sys.stdout.flush()
def step(name, fn):
    try:
        r = fn(); out('OPS PASS', name, '' if r is None else r); return True
    except Exception as e:
        out('OPS FAIL', name, repr(e)[:200]); out('OPS info tb', traceback.format_exc()[-400:].replace('\n', ' | ')); return False
def tick():
    ov = None
    def en():
        import rigify  # noqa
        r = addon_utils.enable('rigify', default_set=True, persistent=True)
        return str(r)
    step('enable rigify', en)
    def meta():
        bpy.ops.object.select_all(action='DESELECT')
        bpy.ops.object.armature_human_metarig_add()
        return bpy.context.object.name
    step('add human metarig', meta)
    def gen():
        bpy.ops.pose.rigify_generate()
        return [o.name for o in bpy.data.objects]
    ok = step('rigify generate', gen)
    rig = bpy.data.objects.get('rig')
    def mesh():
        bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=1.7, location=(0, 0, 0.95), vertices=16)
        c = bpy.context.object
        bpy.ops.object.modifier_add(type='SUBSURF') if False else None
        return c.name
    step('add body mesh', mesh)
    def skin():
        c = bpy.context.object
        target = rig or bpy.data.objects['metarig']
        bpy.ops.object.select_all(action='DESELECT')
        c.select_set(True); target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        return 'groups=%d' % len(c.vertex_groups)
    step('parent automatic weights', skin)
    def pose():
        target = rig or bpy.data.objects['metarig']
        bpy.context.view_layer.objects.active = target
        bpy.ops.object.mode_set(mode='POSE')
        b = target.pose.bones[0]
        names = [p.name for p in target.pose.bones][:3]
        for pb in target.pose.bones:
            if 'upper_arm' in pb.name and pb.name.endswith('.L') and not pb.name.startswith(('ORG', 'DEF', 'MCH')):
                pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0.0, 0.0, 1.0); out('OPS info rotated', pb.name); break
        else:
            b.rotation_mode = 'XYZ'; b.rotation_euler = (0.5, 0, 0)
        bpy.context.view_layer.update()
        return 'bones=%d' % len(target.pose.bones)
    step('pose mode rotate bone', pose)
    def back():
        bpy.ops.object.mode_set(mode='OBJECT')
    step('back to object', back)
    def wp():
        c = [o for o in bpy.data.objects if o.type == 'MESH' and o.vertex_groups][0]
        bpy.context.view_layer.objects.active = c
        bpy.ops.object.mode_set(mode='WEIGHT_PAINT'); bpy.ops.object.mode_set(mode='OBJECT')
    step('weight paint toggle', wp)
    out('OPS_DONE')
bpy.app.timers.register(lambda: (tick(), None)[1], first_interval=8.0)
