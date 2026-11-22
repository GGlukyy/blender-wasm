import bpy, sys, json
def out(*a):
    print(*a); sys.stdout.flush()
it = [i.identifier for i in bpy.types.ImageFormatSettings.bl_rna.properties['file_format'].enum_items]
out('FMT ' + json.dumps(it))
s = bpy.context.scene
for f in ('FFMPEG', 'AVI_JPEG'):
    try: s.render.image_settings.file_format = f; out('FMT set', f, 'OK ->', s.render.image_settings.file_format)
    except Exception as e: out('FMT set', f, 'ERR', str(e)[:80])
out('OPS_DONE')
