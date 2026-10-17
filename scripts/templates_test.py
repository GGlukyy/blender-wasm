# File ▸ New ▸ šablony (2D Animation, Sculpting, Storyboarding, VFX, Video Editing) + zpět na General. OPS_PY=templates_test.py
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
T = ['', '2D_Animation', 'Sculpting', 'Storyboarding', 'VFX', 'Video_Editing', '']
st = {'i': -1}
def tick():
    try:
        if st['i'] >= 0:
            name = T[st['i']] or 'General'
            wss = [w.name for w in bpy.data.workspaces]
            obs = len(bpy.data.objects)
            wins = len(bpy.context.window_manager.windows)
            areas = sum(len(w.screen.areas) for w in bpy.context.window_manager.windows)
            ok = wins >= 1 and areas >= 3 and len(wss) >= 1
            sig = ','.join(wss) + '|%d' % obs
            if name != 'General' and sig == st.get('general'): ok = False   # šablona se nepoužila
            if name == 'General' and 'general' not in st: pass
            if name == 'General' and 'general' not in st: st['general'] = sig
            out('OPS tmpl', name, 'PASS' if ok else 'FAIL', 'ws=%s objs=%d areas=%d' % (','.join(wss)[:80], obs, areas))
        st['i'] += 1
        if st['i'] >= len(T):
            out('OPS_DONE failed=0 total=%d' % len(T)); return None
        out('OPS load', T[st['i']] or 'General')
        bpy.ops.wm.read_homefile(app_template=T[st['i']])
    except Exception as e:
        out('OPS tmpl', T[st['i']] or 'General', 'FAIL EXC', str(e)[:200])
    return 8.0
bpy.app.timers.register(tick, first_interval=1.0, persistent=True)
