# Lov chyb: vlastnosti (RNA) všech typů, web vs desktop. Řádky APIP <typ> <json seznam>; OPS_DONE.
import bpy, sys, json
def out(*a):
    print(*a); sys.stdout.flush()
for n in sorted(dir(bpy.types)):
    t = getattr(bpy.types, n, None)
    try: props = sorted(p.identifier for p in t.bl_rna.properties)
    except Exception: continue
    out('APIP', n, json.dumps(props))
out('OPS_DONE')
