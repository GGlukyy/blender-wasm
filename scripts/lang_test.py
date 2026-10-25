import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
p = bpy.context.preferences.view
langs = [e.identifier for e in p.bl_rna.properties['language'].enum_items]
out('OPS lang count', len(langs), 'cs_CZ' in langs, langs[:6])
try:
    p.language = 'cs_CZ'; p.use_translate_interface = True; p.use_translate_tooltips = True
    out('OPS lang set', p.language)
    t = bpy.app.translations.pgettext_iface('Object')
    out('OPS lang translated', repr(t), repr(bpy.app.translations.pgettext_iface('Render')))
    out('OPS lang_cs', 'PASS' if t != 'Object' else 'FAIL (bez překladu)')
except Exception as e: out('OPS lang_cs FAIL', str(e)[:100])
out('OPS_DONE')
