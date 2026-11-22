# Video Sequence Editor bez filmů (desktop 5.3.0, journey `vse`): `_VS`. Color/Text/Cross/Wipe/Transform/Speed pásy + render snímku.
import bpy
r = lambda x, n=3: round(x, n)
_VS = {}
sc = bpy.context.scene
sc.render.resolution_x = 96; sc.render.resolution_y = 54; sc.render.resolution_percentage = 100
sc.render.use_sequencer = True; sc.render.engine = 'BLENDER_WORKBENCH'
sc.frame_start = 1; sc.frame_end = 40
if sc.sequence_editor: sc.sequence_editor_clear()
se = sc.sequence_editor_create(); S = se.strips
def t(name, fn):
    try: _VS[name] = fn()
    except Exception as e: _VS[name] = 'ERR ' + str(e)[:80]
a = S.new_effect(name='A', type='COLOR', channel=1, frame_start=1, length=20); a.color = (1, 0, 0)
b = S.new_effect(name='B', type='COLOR', channel=2, frame_start=15, length=26); b.color = (0, 0, 1)
t('colors', lambda: [a.frame_final_start, a.frame_final_end, b.frame_final_start, b.frame_final_end])
cr = S.new_effect(name='X', type='CROSS', channel=3, frame_start=15, length=6, input1=a, input2=b)
t('cross', lambda: [cr.frame_final_start, cr.frame_final_end, cr.type])
tx = S.new_effect(name='T', type='TEXT', channel=4, frame_start=5, length=10); tx.text = 'Hi'; tx.font_size = 20
t('text', lambda: [tx.text, tx.frame_final_duration, tx.type])
w = S.new_effect(name='W', type='WIPE', channel=5, frame_start=30, length=5, input1=b, input2=a)
t('wipe', lambda: [w.frame_final_start, w.frame_final_end, w.transition_type])
t('nstrips', lambda: len(se.strips_all))
t('meta', lambda: (lambda m: [m.type, len(m.sequences)])(S.new_meta(name='M', channel=6, frame_start=1) if False else a) if False else 0)
import os
_D = '/opfs/home' if os.path.isdir('/opfs/home') else os.environ.get('TEMP', '/tmp')
def mean(frame):
    sc.frame_set(frame); p = os.path.join(_D, 'vse_%d.png' % frame); sc.render.filepath = p; sc.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    im = bpy.data.images.load(p, check_existing=False); px = list(im.pixels); n = len(px) // 4
    return [r(sum(px[c::4]) / n, 2) for c in (0, 1, 2)]
for f in (3, 10, 18, 30):
    t('render%d' % f, lambda f=f: mean(f))
t('mute', lambda: (setattr(a, 'mute', True), mean(3))[1])
