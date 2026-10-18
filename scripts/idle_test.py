# Nečinnost: po načtení nechat Blender 20 s bez vstupu; kolik GPU snímků/submitů se přitom udělá? (baterie na iPadu)
import bpy, sys, time
def out(*a):
    print(*a); sys.stdout.flush()
st = {'n': 0, 't0': None}
def tick():
    st['n'] += 1
    if st['n'] == 1:
        out('OPS idle begin'); return 20.0
    out('OPS idle end'); out('OPS_DONE'); return None
bpy.app.timers.register(tick, first_interval=8.0)
