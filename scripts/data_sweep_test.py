# Lov chyb kolo 66: bpy.data kolekce — vytvořit/odebrat/zkopírovat každý typ ID (pád/zamrznutí = nedoběhne).
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
names = [n for n in dir(bpy.data) if not n.startswith('_') and hasattr(getattr(bpy.data, n), 'new') and hasattr(getattr(bpy.data, n), 'remove')]
out('OPS_INFO data collections', len(names), ','.join(names)[:300])
ARGS = {'objects': lambda c: c.new('O', None), 'meshes': lambda c: c.new('M'), 'curves': lambda c: c.new('C', 'CURVE'), 'lights': lambda c: c.new('L', 'POINT'), 'cameras': lambda c: c.new('Cam'),
        'materials': lambda c: c.new('Mat'), 'textures': lambda c: c.new('T', 'CLOUDS'), 'images': lambda c: c.new('I', 8, 8), 'node_groups': lambda c: c.new('NG', 'GeometryNodeTree'),
        'actions': lambda c: c.new('A'), 'armatures': lambda c: c.new('Arm'), 'brushes': lambda c: c.new('B', mode='SCULPT'), 'collections': lambda c: c.new('Col'), 'fonts': lambda c: c.new('F') if False else None,
        'grease_pencils': lambda c: c.new('GP'), 'hair_curves': lambda c: c.new('H'), 'lattices': lambda c: c.new('Lat'), 'lightprobes': lambda c: c.new('LP', 'SPHERE'), 'linestyles': lambda c: c.new('LS'),
        'masks': lambda c: c.new('Mk'), 'metaballs': lambda c: c.new('Mb'), 'palettes': lambda c: c.new('P'), 'particles': lambda c: c.new('Pa'), 'pointclouds': lambda c: c.new('Pc'),
        'scenes': lambda c: c.new('S2'), 'speakers': lambda c: c.new('Sp'), 'texts': lambda c: c.new('Tx'), 'volumes': lambda c: c.new('V'), 'worlds': lambda c: c.new('W2'), 'workspaces': lambda c: None,
        'cache_files': lambda c: None, 'libraries': lambda c: None, 'sounds': lambda c: None, 'movieclips': lambda c: None, 'screens': lambda c: None, 'window_managers': lambda c: None, 'paint_curves': lambda c: c.new('PC'), 'curves_': lambda c: None}
state = {'i': 0}
def tick():
    i = state['i']
    if i >= len(names):
        out('OPS_DONE'); return None
    n = names[i]; state['i'] += 1
    out('OPS data try', n)
    try:
        c = getattr(bpy.data, n); f = ARGS.get(n)
        if f is None:
            try: idb = c.new(n[:-1] + '_x')
            except TypeError: out('OPS data skip', n); return 0.05
        else:
            idb = f(c)
        if idb is None: out('OPS data skip', n); return 0.05
        cp = idb.copy() if hasattr(idb, 'copy') else None
        for d in (cp, idb):
            if d is not None: c.remove(d)
        out('OPS data ok', n)
    except BaseException as e:
        out('OPS data ERR', n, type(e).__name__, str(e)[:100])
    return 0.1
bpy.app.timers.register(tick, first_interval=1.5)
