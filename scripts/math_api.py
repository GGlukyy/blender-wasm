# mathutils / noise / geometry (desktop 5.3.0, journey `mathapi`): `_MA`.
import mathutils, math
from mathutils import Vector, Matrix, Euler, Quaternion, noise, kdtree, bvhtree, geometry
_MA = {}
def t(name, fn):
    try: _MA[name] = fn()
    except Exception as e: _MA[name] = 'ERR ' + str(e)[:80]
r = lambda x, n=4: round(x, n)
t('noise', lambda: [r(noise.noise(Vector((1.3, 2.7, 0.4)))), r(noise.turbulence(Vector((1.3, 2.7, 0.4)), 4, False)), r(noise.fractal(Vector((.5, .5, .5)), 1.0, 2.0, 4)), r(noise.cell(Vector((.3, .8, 1.1))))])
t('voronoi', lambda: [r(x) if not hasattr(x, '__len__') else [r(y) for y in x] for x in noise.voronoi(Vector((.3, .8, 1.1)))[0][:2]])
t('euler', lambda: [r(x) for x in Euler((.3, 1.1, -.7)).to_quaternion()])
t('slerp', lambda: [r(x) for x in Quaternion((1, 0, 0, 0)).slerp(Euler((1, 2, 3)).to_quaternion(), .37)])
t('matinv', lambda: [r(x) for row in Matrix(((2, 1, 0, 3), (0, 1, 4, 1), (1, 0, 1, 0), (5, 1, 0, 1))).inverted() for x in row])
t('decomp', lambda: [r(x) for v in Matrix.LocRotScale((1, 2, 3), Euler((.4, .5, .6)), (1, 2, 3)).decompose() for x in v])
t('isect_tri', lambda: [r(x) for x in geometry.intersect_ray_tri(Vector((0, 0, 0)), Vector((1, 1, 0)), Vector((-1, -1, 1)), Vector((3, 0, 1)), Vector((0, 3, 1)))] if False else 0)
t('area_poly', lambda: r(geometry.area_tri(Vector((0, 0, 0)), Vector((3, 0, 0)), Vector((0, 4, 0)))))
t('barycentric', lambda: [r(x) for x in geometry.barycentric_transform(Vector((.3, .3, 0)), Vector((0, 0, 0)), Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 0)), Vector((2, 0, 0)), Vector((0, 2, 1)))])
t('delaunay', lambda: [len(x) for x in geometry.delaunay_2d_cdt([Vector((math.cos(i * 2.399) * i ** .5, math.sin(i * 2.399) * i ** .5)) for i in range(40)], [], [], 0, 1e-6)[:4]])
t('convex2d', lambda: geometry.convex_hull_2d([Vector((math.cos(i * 2.399) * i ** .5, math.sin(i * 2.399) * i ** .5)) for i in range(40)]).__len__())
t('kd', lambda: (lambda k: ([k.insert(Vector((math.cos(i * 2.399) * i ** .5, math.sin(i * 2.399) * i ** .5, i * .1)), i) for i in range(60)], k.balance(), [i for _, i, _ in k.find_n(Vector((1, 1, 1)), 5)], r(k.find(Vector((3, 0, 1)))[2]))[2:])(kdtree.KDTree(60)))
t('bvh', lambda: (lambda b: [r(x) for x in b.ray_cast(Vector((0, 0, 5)), Vector((.1, .05, -1)))[:2][0]] + [b.ray_cast(Vector((0, 0, 5)), Vector((.1, .05, -1)))[2]])(bvhtree.BVHTree.FromPolygons([Vector(v) for v in ((-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0), (0, 0, 1))], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)])))
t('pow', lambda: [r(math.pow(1.0000001, 1e7), 6), r(math.sin(1e6), 6), r(math.atan2(3, -4), 6), r(math.exp(-3.3), 6)])
t('color', lambda: [r(x) for x in __import__('mathutils').Color((.8, .3, .1)).from_scene_linear_to_srgb()] if hasattr(__import__('mathutils').Color, 'from_scene_linear_to_srgb') else 0)
