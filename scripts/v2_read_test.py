# V2h: čtení obrázků, které Blender sám nezapíše (PNG paleta / šedá 16bit / šedá+alfa / tRNS, PSD RGB+RGBA, BMP 32bit, PPM).
# Soubory vyrobí čistý Python (zlib/struct) → stejné bajty na desktopu (DESK=1) i webu. 'OPS v2r <id> <size> <ch> <px(1,1)>'.
import bpy, os, sys, zlib, struct
def out(*a): print(*a); sys.stdout.flush()
D = 'C:/Users/lukil/p2win/out/v2r' if os.environ.get('DESK') == '1' else '/tmp/v2r'
os.makedirs(D, exist_ok=True)
W, H = 4, 3
def png(name, ctype, depth, rows, extra=b''):
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\0' + r for r in rows)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, depth, ctype, 0, 0, 0)) + extra + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
    open('%s/%s.png' % (D, name), 'wb').write(data)
def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
pal = chunk(b'PLTE', bytes([255, 0, 0, 0, 255, 0, 0, 0, 255, 200, 200, 200]))
png('pal', 3, 8, [bytes([(x + y) % 4 for x in range(W)]) for y in range(H)], pal)
png('pal_trns', 3, 8, [bytes([(x + y) % 4 for x in range(W)]) for y in range(H)], pal + chunk(b'tRNS', bytes([255, 128, 0, 255])))
png('gray16', 0, 16, [b''.join(struct.pack('>H', (x * 20000 + y * 1000) % 65536) for x in range(W)) for y in range(H)])
png('graya', 4, 8, [bytes(v for x in range(W) for v in (x * 60, 255 - y * 100)) for y in range(H)])
png('rgb_trns', 2, 8, [bytes(v for x in range(W) for v in ((10, 20, 30) if x == 1 else (x * 60, y * 80, 100))) for y in range(H)], chunk(b'tRNS', struct.pack('>HHH', 10, 20, 30)))
png('gray1', 0, 1, [bytes([0b10100000]) for y in range(H)])
def psd(name, ch):
    hdr = b'8BPS' + struct.pack('>H6xHIIHH', 1, ch, H, W, 8, 3)
    img = b''.join(bytes(((c * 70 + x * 40 + y * 30) % 256) for y in range(H) for x in range(W)) for c in range(ch))
    open('%s/%s.psd' % (D, name), 'wb').write(hdr + struct.pack('>I', 0) + struct.pack('>I', 0) + struct.pack('>I', 0) + struct.pack('>H', 0) + img)
psd('psd_rgb', 3); psd('psd_rgba', 4)
def bmp32(name):
    px = b''.join(bytes([x * 60, y * 80, 100, 255 - x * 50]) for y in range(H) for x in range(W))
    hdr = struct.pack('<2sIHHI', b'BM', 14 + 40 + len(px), 0, 0, 54) + struct.pack('<IiiHHIIiiII', 40, W, H, 1, 32, 0, len(px), 2835, 2835, 0, 0)
    open('%s/bmp32.bmp' % D, 'wb').write(hdr + px)
bmp32('bmp32')
open('%s/ppm.ppm' % D, 'wb').write(b'P6\n%d %d\n255\n' % (W, H) + bytes(v for y in range(H) for x in range(W) for v in (x * 60, y * 80, 200)))
for f in sorted(os.listdir(D)):
    p = D + '/' + f
    try:
        im = bpy.data.images.load(p); px = list(im.pixels); w, h = im.size
        i = (1 * w + 1) * 4
        out('OPS v2r', f, '%dx%d' % (w, h), 'ch=%d' % im.channels, [round(x, 3) for x in px[i:i + 4]] if px else 'nopix')
    except Exception as e:
        out('OPS v2r', f, 'LOADERR', str(e).strip()[:50])
out('OPS_DONE')
