# VSE 2 (desktop 5.3.0, journey `vse2`): scene strip (Workbench), image strip, Transform, Gaussian Blur, Multiply, Speed: `_V2`.
import bpy, os
r = lambda x, n=3: round(x, n)
_V2 = {}
def t(name, fn):
    try: _V2[name] = fn()
    except Exception as e: _V2[name] = 'ERR ' + str(e)[:80]
_D = '/opfs/home' if os.path.isdir('/opfs/home') else os.environ.get('TEMP', '/tmp')
main = bpy.context.scene
cube = bpy.data.objects.get('Cube'); cam = bpy.data.objects.get('Camera')
s2 = bpy.data.scenes.new('S2'); s2.collection.objects.link(cube); s2.collection.objects.link(cam); s2.camera = cam
s2.frame_start = 1; s2.frame_end = 10; s2.render.engine = 'BLENDER_WORKBENCH'; s2.render.resolution_x = 96; s2.render.resolution_y = 54; s2.render.resolution_percentage = 100
s2.display.shading.light = 'FLAT'; s2.display.shading.color_type = 'SINGLE'; s2.display.shading.single_color = (0.2, 0.9, 0.3)
img2 = bpy.data.images.new('chk2', 32, 32); img2.pixels[:] = [0.2, 0.4, 1.0, 1.0] * (32 * 32); img2.filepath_raw = os.path.join(_D, 'vse2_img2.png'); img2.file_format = 'PNG'; img2.save()
img = bpy.data.images.new('chk', 32, 32); img.pixels[:] = [1.0, 0.5, 0.0, 1.0] * (32 * 32); img.filepath_raw = os.path.join(_D, 'vse2_img.png'); img.file_format = 'PNG'; img.save()
main.render.resolution_x = 96; main.render.resolution_y = 54; main.render.resolution_percentage = 100
main.render.use_sequencer = True; main.render.engine = 'BLENDER_WORKBENCH'; main.frame_start = 1; main.frame_end = 20
if main.sequence_editor: main.sequence_editor_clear()
se = main.sequence_editor_create(); S = se.strips
import time
_STEPS = []
_GRID = {}
def mean(frame, tag):
    main.frame_set(frame); p = os.path.join(_D, 'vse2_out_%s.png' % tag); main.render.filepath = p; main.render.image_settings.file_format = 'PNG'
    if os.path.exists(p): os.remove(p)
    bpy.ops.render.render(write_still=True)
    return p
def _read(p):
    im = bpy.data.images.load(p, check_existing=False); px = list(im.pixels); n = len(px) // 4
    w, h = im.size; G = []
    for gy in range(3):
        for gx in range(6):
            x0, x1, y0, y1 = gx * w // 6, (gx + 1) * w // 6, gy * h // 3, (gy + 1) * h // 3
            G.append(tuple(round(sum(px[(y * w + x) * 4 + c] for y in range(y0, y1) for x in range(x0, x1)) / ((x1 - x0) * (y1 - y0)), 1) for c in (0, 1, 2)))
    _GRID[p] = G
    return [r(sum(px[c::4]) / n, 2) for c in (0, 1, 2)]
def rd(key, frame, tag, setup=None):
    _STEPS.append((key, frame, tag, setup))
def fresh():
    global se, S
    main.sequence_editor_clear(); se = main.sequence_editor_create(); S = se.strips
def mk_scene(ch=1): return S.new_scene(name='SC', scene=s2, channel=ch, frame_start=1)
def mk_img(ch=2, f='vse2_img.png'):
    i = S.new_image(name='IM' + str(ch), filepath=os.path.join(_D, f), channel=ch, frame_start=1); i.frame_final_duration = 10; return i
fresh(); _a = mk_scene(); _b = mk_img()
t('scene_strip', lambda: [_a.type, _a.frame_final_duration])
t('image_strip', lambda: [_b.type, _b.frame_final_duration, _b.elements[0].filename])
_c = S.new_effect(name='SP', type='SPEED', channel=5, frame_start=11, length=10, input1=_b)
t('speed', lambda: [_c.type, _c.frame_final_duration])
def s_scene(): fresh(); mk_scene()
rd('scene_render', 3, 'scene', s_scene)
def s_img(): fresh(); mk_img(1)
rd('image_render', 3, 'img', s_img)
def s_tr(): fresh(); mk_img(1); i = mk_img(2, 'vse2_img2.png'); i.transform.scale_x = 0.5; i.transform.scale_y = 0.5
rd('transform_render', 3, 'tr', s_tr)
def s_bl(): fresh(); i = mk_img(1); b = S.new_effect(name='BL', type='GAUSSIAN_BLUR', channel=2, frame_start=1, length=10, input1=i); b.size_x = 6; b.size_y = 6
rd('blur_render', 3, 'bl', s_bl)
def s_mu(): fresh(); i = mk_img(1); j = mk_img(2, 'vse2_img2.png'); S.new_effect(name='MU', type='MULTIPLY', channel=3, frame_start=1, length=10, input1=i, input2=j)
rd('multiply_render', 3, 'mu', s_mu)
def s_scx(): fresh(); sc_ = mk_scene(); i = mk_img(2); i.transform.scale_x = 0.5; i.transform.scale_y = 0.5
rd('scene_effect_render', 3, 'scx', s_scx)
# Kroky renderu: desktop (-b) synchronně, web přes timer (F12 s Workbench zapisuje soubor asynchronně, po příchodu filmu z GPU).
_ST = {'i': 0, 'p': None, 't0': 0, 'stage': 0}
def _step():
    if _ST['i'] >= len(_STEPS): _V2['grid'] = {k.split('_out_')[-1]: v for k, v in _GRID.items()}; _V2['done'] = 1; return None
    key, frame, tag, setup = _STEPS[_ST['i']]
    if _ST['stage'] == 0:
        try:
            if setup: setup()
            _ST['p'] = mean(frame, tag)
        except Exception as e: _V2[key] = 'ERR ' + str(e)[:80]; _ST['i'] += 1; return 0.2
        _ST['stage'] = 1; _ST['t0'] = time.time(); return 0.5
    if os.path.exists(_ST['p']) and os.path.getsize(_ST['p']) > 100 or time.time() - _ST['t0'] > 90:
        try: _V2[key] = _read(_ST['p'])
        except Exception as e: _V2[key] = 'ERR ' + str(e)[:80]
        _ST['i'] += 1; _ST['stage'] = 0; return 0.2
    return 0.5
if bpy.app.background:
    while _step() is not None: pass
else:
    bpy.app.timers.register(_step, first_interval=0.5)
