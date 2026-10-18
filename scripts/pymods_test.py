# Stdlib moduly, které v web buildu chybí/visí: import musí buď fungovat, nebo rychle vyhodit ImportError (ne zavěsit).
import sys
def out(*a):
    print(*a); sys.stdout.flush()
mods = ['sqlite3', 'ssl', 'ctypes', 'lzma', 'fcntl', 'multiprocessing', 'bz2', 'zlib', 'json', 'csv', 'decimal', 'hashlib', 'socket', 'select', 'asyncio', 'urllib.request', 'xml.etree.ElementTree', 'zipfile', 'tarfile', 'sqlite3.dbapi2', 'curses', 'readline', 'tkinter', 'numpy', 'mathutils', 'bmesh']
st = {'i': 0}
import bpy
def tick():
    i = st['i']
    if i >= len(mods):
        out('OPS_DONE'); return None
    m = mods[i]; st['i'] += 1
    out('OPS pymod try', m)
    try:
        __import__(m); out('OPS pymod ok', m)
    except ImportError as e:
        out('OPS pymod ImportError', m, str(e)[:60])
    except BaseException as e:
        out('OPS pymod ERR', m, type(e).__name__, str(e)[:60])
    return 0.1
bpy.app.timers.register(tick, first_interval=1.5)
