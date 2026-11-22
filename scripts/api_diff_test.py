# Lov chyb: seznam registrovaných bpy.types a operátorů (web vs desktop 5.3.0). Řádky APIDIFF types|ops|props <json>; OPS_DONE.
import bpy, sys, json
def out(*a):
    print(*a); sys.stdout.flush()
types = sorted(n for n in dir(bpy.types) if not n.startswith('_'))
ops = sorted(f'{m}.{o}' for m in dir(bpy.ops) if not m.startswith('_') for o in dir(getattr(bpy.ops, m)) if not o.startswith('_'))
# enum položky vybraných důležitých enumů (render engine, shading, node tree types)
enums = {}
for k, (cls, prop) in {'engine': ('RenderSettings', 'engine'), 'shading': ('View3DShading', 'type'), 'tool_settings': ('ToolSettings', 'snap_elements')}.items():
    try: enums[k] = sorted(i.identifier for i in getattr(bpy.types, cls).bl_rna.properties[prop].enum_items)
    except Exception as e: enums[k] = str(e)
addons = sorted(m for m in __import__('addon_utils').modules() and [x.__name__ for x in __import__('addon_utils').modules()])
out('APIDIFF types ' + json.dumps(types)); out('APIDIFF ops ' + json.dumps(ops)); out('APIDIFF enums ' + json.dumps(enums)); out('APIDIFF addons ' + json.dumps(addons))
out('OPS_DONE')
