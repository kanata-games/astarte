#!/usr/bin/env python3
"""ROCKSIDE GAIDEN layered sprite-strip builder (2026-10-12). Same idea as work/body_sheet.py (one scale per sheet,
raw anchor -> fixed frame point (cx, base), sample "mode"), plus what the gaiden characters need:
  * layers: a frame is composited in RAW space from several raw cut-outs (back to front), each with its own
    box / exclude / shift (dx, dy) / extra scale k (about the layer's own pivot) / optional mirror -> e.g. Chronoa idle + clock mimic.
  * body squash ("chibi"): rows between the chin line and the feet are compressed by kb toward the feet, the head
    keeps the sheet scale. Makes the less-chibi raws match Kanata's head:body proportions (big head, short body).
  * eyeboxes: raw rects where a strict green key is used (keeps green eyes / glows that the normal key removes).
usage: gaiden_sheet.py spec.json out.png   -> also writes out.png.meta.json (per-frame info + mapped points)
spec: {fw, fh, cx, base, scale, kb, colors, groups:[[func,n]], mode_opts, median, erode, raws:{id:path},
       frames:[{name, anchor:[ax,ay] (raw, feet), chin: y (raw, null = no squash), base?, warp?:[[loff,lk],[roff,rk]],
                layers:[{src, box, exclude?, dx?, dy?, k?, pivot?, body?:true (apply squash), eyebox?:[[..]], minpx?, keep_all?,
                         paint?:[{poly:[[x,y],..] | line:[[x,y],[x,y]], w, rgb}]}],
                points:{name:[x,y,layerIndex]} (raw coords of that layer, before shift)}]}"""
import sys, os, json; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_lib import *
import sprite_lib

def accent_teal(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (g > 120) & (b > 110) & (r < 90) & (g - r > 60)
def accent_green_eye(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (g > 90) & (g - np.maximum(r, b) > 45)
def skin_warm(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 200) & (g > 160) & (b > 130) & (r - b > 25) & (r - b < 90) & (r >= g)
def pink_ear(rgb):   # inner cat ear pink (keeps it from merging into gold/star yellow in the shared palette)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 180) & (g > 100) & (g < 190) & (b > 100) & (b < 195) & (r - g > 35) & (np.abs(g - b) < 35)
sprite_lib.pink_ear = pink_ear
sprite_lib.accent_teal = accent_teal; sprite_lib.accent_green_eye = accent_green_eye; sprite_lib.skin_warm = skin_warm
G = dict(globals())

def strict_fg(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return ~((g > 215) & (r < 60) & (b < 60) & (g - np.maximum(r, b) > 170))

def body_map_y(y, ay, chin, kb):
    """forward map of a raw y (pre-squash) to the squashed raw y"""
    if chin is None: return y
    D = ay - chin; u = ay - y
    u2 = u * kb if u <= D else D * kb + (u - D)
    return ay - u2

def squash(rgba, ay, chin, kb):
    H = rgba.shape[0]; Y = np.arange(H, dtype=np.float64); u2 = ay - Y; D = ay - chin
    u = np.where(u2 <= D * kb, u2 / kb, u2 - D * kb + D)
    sy = np.round(ay - u).astype(int); ok = (sy >= 0) & (sy < H)
    out = np.zeros_like(rgba); out[ok] = rgba[sy[ok]]
    return out

def build(spec, base_dir='.'):
    g = lambda k, d: spec.get(k, d)
    FW, FH, CX, BASE, S, KB = spec['fw'], spec['fh'], spec['cx'], spec['base'], spec['scale'], g('kb', 1.0)
    if 'mode_opts' in spec: MODE_OPTS.update(spec['mode_opts'])
    cache = {}; frames = []; meta = []
    for f in spec['frames']:
        ax, ay = f['anchor']; chin = f.get('chin'); base = f.get('base', BASE); kb = f.get('kb', KB)
        canvas = None; lmeta = []
        for li, L in enumerate(f['layers']):
            src = L['src']
            if src not in cache:
                p = os.path.join(base_dir, spec['raws'][src])
                rgb, m = load_raw(p, median=g('median', 3), erode=g('erode', 1))
                orig = np.asarray(Image.open(p).convert('RGB')).astype(np.int32)
                cache[src] = (rgb, m, orig)
            rgb, m, orig = cache[src]
            rgb = rgb.copy(); m = m.copy()
            for eb in L.get('eyebox', []):   # strict key inside the box, original colours
                x0, y0, x1, y1 = eb; sf = strict_fg(orig[y0:y1, x0:x1])
                sf = ndimage.binary_fill_holes(ndimage.binary_opening(sf, iterations=1))
                m[y0:y1, x0:x1] |= sf; rgb[y0:y1, x0:x1][sf] = orig[y0:y1, x0:x1][sf]
            for P in L.get('paint', []):   # raw-space hand paint (e.g. Vel's hair strand over one eye): poly / line
                from PIL import ImageDraw
                pm = Image.new('L', (m.shape[1], m.shape[0]), 0); d = ImageDraw.Draw(pm)
                if 'poly' in P: d.polygon([tuple(p) for p in P['poly']], fill=255)
                if 'line' in P: d.line([tuple(p) for p in P['line']], fill=255, width=P.get('w', 3))
                pk = np.asarray(pm) > 0; m[pk] = True; rgb[pk] = P['rgb']
            if L.get('keep_all'):   # keep every component in the box (sparkles, debris)
                sel = np.zeros_like(m); x0, y0, x1, y1 = L['box']; sel[y0:y1, x0:x1] = m[y0:y1, x0:x1]
            else: sel = select(m, L['box'], minpx=L.get('minpx', 40))
            for ex in L.get('exclude', []): sel[ex[1]:ex[3], ex[0]:ex[2]] = False
            rgba = masked_rgba(rgb, sel)
            k = L.get('k', 1.0)
            if k != 1.0 or L.get('mirror'):
                px, py = L.get('pivot', [(L['box'][0] + L['box'][2]) / 2, (L['box'][1] + L['box'][3]) / 2])
                x0, y0, x1, y1 = L['box']; crop = rgba[y0:y1, x0:x1]
                im = Image.fromarray(crop, 'RGBA')
                if L.get('mirror'): im = im.transpose(Image.FLIP_LEFT_RIGHT)
                nw, nh = max(1, int(round(crop.shape[1] * k))), max(1, int(round(crop.shape[0] * k)))
                im = im.resize((nw, nh), Image.NEAREST)
                rgba = np.zeros_like(rgba); nx0 = int(round(px - (px - x0) * k)); ny0 = int(round(py - (py - y0) * k))
                a = np.asarray(im); H, W = rgba.shape[:2]
                xs0, ys0 = max(0, nx0), max(0, ny0); xs1, ys1 = min(W, nx0 + nw), min(H, ny0 + nh)
                rgba[ys0:ys1, xs0:xs1] = a[ys0 - ny0:ys1 - ny0, xs0 - nx0:xs1 - nx0]
            if L.get('body', True) and chin is not None: rgba = squash(rgba, ay, chin, kb)
            dx, dy = L.get('dx', 0), L.get('dy', 0)
            if dx or dy:
                sh = np.zeros_like(rgba); H, W = rgba.shape[:2]
                sh[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = rgba[max(0, -dy):H - max(0, dy), max(0, -dx):W - max(0, dx)]
                rgba = sh
            if canvas is None: canvas = rgba.copy()
            else:
                top = rgba[..., 3] > 0; canvas[top] = rgba[top]
            lmeta.append(L)
        LW = RW = None
        if f.get('warp'):
            LW = tuple(f['warp'][0]) if f['warp'][0] else None; RW = tuple(f['warp'][1]) if f['warp'][1] else None
            canvas = xwarp(canvas, ax, LW, RW)
        if f.get('ywarp'):   # compress rows higher than off (raw px above the feet) by k toward the head (tall scythe raise)
            off, kk = f['ywarp']; H = canvas.shape[0]; Y = np.arange(H, dtype=np.float64); u2 = ay - Y
            u = np.where(u2 <= off, u2, off + (u2 - off) / kk); sy = np.round(ay - u).astype(int); ok = (sy >= 0) & (sy < H)
            c2 = np.zeros_like(canvas); c2[ok] = canvas[sy[ok]]; canvas = c2
        fr = render(canvas, ax, ay, S, FW, FH, CX, base, g('sample', 'mode'))
        frames.append(fr)
        pts = {}
        for nm, (px, py, li) in f.get('points', {}).items():
            L = f['layers'][li]; k = L.get('k', 1.0)
            if k != 1.0 or L.get('mirror'):
                pvx, pvy = L.get('pivot', [(L['box'][0] + L['box'][2]) / 2, (L['box'][1] + L['box'][3]) / 2])
                if L.get('mirror'): px = L['box'][0] + L['box'][2] - px
                px = pvx + (px - pvx) * k; py = pvy + (py - pvy) * k
            if L.get('body', True) and chin is not None: py = body_map_y(py, ay, chin, kb)
            px += L.get('dx', 0); py += L.get('dy', 0)
            u = px - ax
            for side, W_ in (('R', RW), ('L', LW)):
                if W_ and ((side == 'R' and u > W_[0]) or (side == 'L' and u < -W_[0])):
                    o, kk = W_; u = (o + (u - o) * kk) if side == 'R' else (-o + (u + o) * kk)
            pts[nm] = [int(np.floor(CX + u * S)), int(np.floor(base + (py - ay) * S))]
        meta.append({'name': f['name'], 'points': pts})
    out, pal = finalize3(frames, colors=g('colors', 32), groups=[(G[fn] if fn in G else getattr(sprite_lib, fn), n) for fn, n in g('groups', [])], despeck=g('despeck', True))
    return out, meta

if __name__ == '__main__':
    spec = json.load(open(sys.argv[1])); out, meta = build(spec, os.path.dirname(os.path.abspath(sys.argv[1])))
    Image.fromarray(out, 'RGBA').save(sys.argv[2]); json.dump(meta, open(sys.argv[2] + '.meta.json', 'w'), indent=1)
    check(out, spec['fw'], spec['fh'], os.path.basename(sys.argv[2]))
    for mt in meta: print(mt)
