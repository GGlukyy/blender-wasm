# Lov chyb kolo 66: vytvořit každý typ Compositor/Texture/Shader-AOV uzlu ve stromu a projít jejich sockety (pád/zamrznutí = nedoběhne).
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
groups = [('CompositorNodeTree', 'CompositorNode'), ('TextureNodeTree', 'TextureNode')]
st = {'i': 0}; todo = []
for tree, prefix in groups:
    for n in sorted(dir(bpy.types)):
        if n.startswith(prefix) and n != prefix:
            todo.append((tree, n))
out('OPS_INFO nodetypes', len(todo))
def tick():
    for _ in range(10):
        i = st['i']
        if i >= len(todo):
            out('OPS_DONE'); return None
        tree, tn = todo[i]; st['i'] += 1
        try:
            ng = bpy.data.node_groups.new('t', tree); nd = ng.nodes.new(tn)
            _ = [(s.name, s.type) for s in nd.inputs] + [(s.name, s.type) for s in nd.outputs]
            ng.nodes.remove(nd); bpy.data.node_groups.remove(ng)
        except RuntimeError as e:
            pass   # „undefined“ / experimentální
        except BaseException as e:
            out('OPS nodetypes ERR', tn, type(e).__name__, str(e)[:80])
    return 0.05
bpy.app.timers.register(tick, first_interval=1.5)
