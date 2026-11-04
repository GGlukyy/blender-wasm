# M1b: nepovolená URL (http://, cizí ws://) se odmítne se stavem error; bez tokenu taky
import bpy, sys, time, json, addon_utils
def out(*a):
    print(*a); sys.stdout.flush()
st = {'n': 0}
CASES = [('http://example.com', 'tok'), ('ws://evil.example.com:8765', 'tok'), ('ws://127.0.0.1:8765', '')]
def tick():
    if st['n'] == 0:
        addon_utils.modules_refresh(); bpy.ops.preferences.addon_enable(module='blender_web_mcp')
    if st['n'] < len(CASES):
        p = bpy.context.preferences.addons['blender_web_mcp'].preferences
        p.url, p.token = CASES[st['n']]; bpy.ops.webmcp.connect(); st['n'] += 1
        return 1.5
    return None
def check():
    return None
bpy.app.timers.register(tick, first_interval=6.0)
def report():
    try: s = json.load(open('/tmp/mcp_status.json'))
    except Exception as e: s = repr(e)
    out('OPS status', s)
    if st['n'] >= len(CASES): out('OPS_DONE'); return None
    return 1.5
bpy.app.timers.register(report, first_interval=7.0)
