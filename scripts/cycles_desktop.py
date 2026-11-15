# C1: desktop reference for cycles_test.py (stejná scéna, Cycles CPU, 64 samples 960x540). Spuštění: blender.exe -b --factory-startup --python cycles_desktop.py
import bpy, time, sys
exec(open('cycles_test.py').read().split("state = {")[0].split("sc = bpy.context.scene")[0])
sc = bpy.context.scene
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 64; sc.cycles.use_denoising = False
sc.render.resolution_x = 960; sc.render.resolution_y = 540; sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'; sc.render.filepath = 'out/cyc_desktop.png'
src = open('cycles_test.py').read(); ns = {'bpy': bpy, 'sys': sys}
exec(src[src.index("def stats"):src.index("def tick")], ns)
t = time.time(); bpy.ops.render.render(write_still=True); dt = time.time() - t
w, h, r, g, b, a = ns['stats']('out/cyc_desktop.png')
print('OPS cycles desktop size=%dx%d mean=%.4f,%.4f,%.4f alpha=%.2f render_s=%.1f' % (w, h, r, g, b, a, dt))
print('OPS cycles grid', ns['grid']('out/cyc_desktop.png'))
