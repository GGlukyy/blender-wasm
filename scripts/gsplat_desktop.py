# N1a: Gaussian splat PLY (syntetický, N bodů) → wm.ply_import → PointCloud → Solid a Material Preview, screenshot (ops_test OPS_SHOT).
import bpy, sys, time, struct, random, math
def out(*a):
    print(*a); sys.stdout.flush()
N = 30000
random.seed(3)
props = ['x','y','z','nx','ny','nz','f_dc_0','f_dc_1','f_dc_2','opacity','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3']
hdr = 'ply\nformat binary_little_endian 1.0\nelement vertex %d\n' % N + ''.join('property float %s\n' % p for p in props) + 'end_header\n'
buf = bytearray(hdr.encode())
for i in range(N):
    u, v = random.random() * 2 * math.pi, math.acos(2 * random.random() - 1); r = 1.0
    x, y, z = r * math.sin(v) * math.cos(u), r * math.sin(v) * math.sin(u), r * math.cos(v)
    c = [(x + 1) / 2 - 0.5, (y + 1) / 2 - 0.5, (z + 1) / 2 - 0.5]
    buf += struct.pack('<17f', x, y, z, 0, 0, 0, c[0] / 0.282, c[1] / 0.282, c[2] / 0.282, 2.0, math.log(0.03), math.log(0.03), math.log(0.03), 1, 0, 0, 0)
open('C:/Users/lukil/p2win/gs.ply', 'wb').write(bytes(buf))
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
t0 = time.time()
try:
    r = bpy.ops.wm.ply_import(filepath='C:/Users/lukil/p2win/gs.ply')
except Exception as e:
    r = ('EXC', str(e)[:200])
obs = list(bpy.data.objects)
out('OPS gsplat import', r, [(o.name, o.type) for o in obs], 'dt=%.2f' % (time.time() - t0))
if obs and obs[0].type == 'POINTCLOUD':
    pc = obs[0].data
    out('OPS gsplat pointcloud points=%d attrs=%s' % (len(pc.attributes['position'].data) if 'position' in pc.attributes else -1, [a.name for a in pc.attributes][:12]))
out_path = sys.argv[sys.argv.index('--') + 1]
mode = sys.argv[sys.argv.index('--') + 2]
st = {'n': 0}
def tick():
    st['n'] += 1
    win = bpy.context.window_manager.windows[0]
    v3d = [a for a in win.screen.areas if a.type == 'VIEW_3D'][0].spaces.active
    if st['n'] == 1:
        v3d.shading.type = mode; return 6.0
    with bpy.context.temp_override(window=win, area=win.screen.areas[0]):
        bpy.ops.screen.screenshot(filepath=out_path)
    print('SHOT_DONE'); sys.stdout.flush(); bpy.ops.wm.quit_blender(); return None
bpy.app.timers.register(tick, first_interval=3.0)
