# H28: mění se parametry GP Airbrush po přepnutí štětce a zpět? (jen data; vzhled porovná Lukáš s desktopem)
import bpy, sys
def out(*a):
    print(*a); sys.stdout.flush()
def tick():
    try:
        bpy.ops.object.grease_pencil_add(type='EMPTY')
        ob = bpy.context.object
        bpy.ops.object.mode_set(mode='PAINT_GREASE_PENCIL')
        ts = bpy.context.tool_settings
        gp = ts.gpencil_paint
        names = [b.name for b in bpy.data.brushes if getattr(b, 'use_paint_grease_pencil', False)]
        out('OPS brushes', names[:20])
        def snap(tag):
            b = gp.brush
            out('OPS snap %s brush=%s size=%s strength=%s color=%s' % (tag, b.name if b else None,
                b.size if b else None, round(b.strength, 3) if b else None,
                tuple(round(c, 3) for c in b.color) if b and hasattr(b, 'color') else None))
        def setb(n):
            br = bpy.data.brushes.get(n)
            if br: gp.brush = br
        setb('Airbrush'); snap('airbrush1')
        setb('Pencil'); snap('pencil')
        setb('Airbrush'); snap('airbrush2')
    except BaseException as e:
        import traceback; out('OPS ERR', traceback.format_exc()[-400:])
    out('OPS_DONE')
    return None
bpy.app.timers.register(tick, first_interval=6.0)
