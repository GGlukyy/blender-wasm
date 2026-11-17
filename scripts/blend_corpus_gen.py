# D1a: generuje sadu scén v desktop Blenderu (5.3.0) pro měření kolizí adres. blender.exe -b --factory-startup --python blend_corpus_gen.py -- <výstupní složka>
import bpy, sys, os, random, bmesh
out = sys.argv[sys.argv.index('--') + 1]
random.seed(1)
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def save(name):
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, name + '.blend'), compress=False)
    print('SAVED', name)
def mat(i):
    m = bpy.data.materials.new('M%d' % i); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (random.random(), random.random(), random.random(), 1)
    return m
def many_objects(n, name, mats=True):
    reset()
    for i in range(n):
        me = bpy.data.meshes.new('Me%d' % i)
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('Ob%d' % i, me); bpy.context.scene.collection.objects.link(ob)
        ob.location = (i % 50, i // 50, 0)
        if mats: me.materials.append(mat(i))
    save(name)
def dense(level, name):
    reset()
    bpy.ops.mesh.primitive_monkey_add()
    ob = bpy.context.active_object
    ob.modifiers.new('s', 'SUBSURF').levels = level
    bpy.ops.object.modifier_apply(modifier='s')
    save(name)
def sculpt_layers(name):
    reset()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=256, ring_count=128)
    for i in range(30):
        bpy.context.active_object.shape_key_add(name='k%d' % i)
    save(name)
def images(n, size, name):
    reset()
    for i in range(n):
        im = bpy.data.images.new('I%d' % i, size, size); im.pixels = [random.random()] * (size * size * 4) if size <= 256 else im.pixels
        im.pack()
    save(name)
def curves_particles(name):
    reset()
    bpy.ops.mesh.primitive_plane_add(size=10)
    ob = bpy.context.active_object
    ob.modifiers.new('p', 'PARTICLE_SYSTEM')
    ps = ob.particle_systems[0].settings; ps.count = 20000; ps.type = 'HAIR'
    save(name)
def collections(n, name):
    reset()
    for i in range(n):
        c = bpy.data.collections.new('C%d' % i); bpy.context.scene.collection.children.link(c)
        for j in range(5):
            o = bpy.data.objects.new('E%d_%d' % (i, j), None); c.objects.link(o)
    save(name)
def geonodes(name):
    reset()
    bpy.ops.mesh.primitive_cube_add()
    ob = bpy.context.active_object
    ng = bpy.data.node_groups.new('G', 'GeometryNodeTree')
    for i in range(300): ng.nodes.new('GeometryNodeSetPosition')
    save(name)
many_objects(50, 'obj50'); many_objects(500, 'obj500'); many_objects(2000, 'obj2000'); many_objects(5000, 'obj5000_nomat', mats=False)
many_objects(1000, 'obj1000')
dense(5, 'monkey_l5'); dense(7, 'monkey_l7'); sculpt_layers('shapekeys')
images(20, 256, 'img20'); images(8, 2048, 'img8_big'); collections(2000, 'coll2000'); geonodes('gn300')
curves_particles('hair')
print('GEN_DONE')
