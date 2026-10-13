"""ROCKSIDE sprite helpers (2026-10-03): green key, connected components, body-anchored fixed-scale framing."""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

def load_raw(path, median=0, thr=40, erode=2, holes=0, return_holes=False):
    im = Image.open(path).convert("RGB")
    if median: im = im.filter(ImageFilter.MedianFilter(median))
    a = np.asarray(im).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gr = g - np.maximum(r, b)
    mask = gr < thr
    mask = ndimage.binary_opening(mask, iterations=1)
    rgb = a.copy(); rgb[..., 1] = np.minimum(g, np.maximum(r, b) + 4)   # despill
    if holes:   # small enclosed non-background holes = green details (e.g. green eyes): keep them, original colour
        hl = ndimage.binary_fill_holes(mask) & ~mask
        lab, n = ndimage.label(hl)
        bgl = (g > 215) & (r < 70) & (b < 70)
        hm = np.zeros_like(mask)
        for i, sl in enumerate(ndimage.find_objects(lab)):
            h = lab[sl] == i + 1; sz = h.sum()
            if sz <= holes and bgl[sl][h].mean() < 0.35:
                hm[sl] |= h
        mask |= hm; rgb[hm] = a[hm]
    if erode: mask = ndimage.binary_erosion(mask, iterations=erode)
    if return_holes:
        hm = hm if holes else np.zeros_like(mask)
        return rgb, mask & ~hm, hm & mask
    return rgb, mask

def comps(mask, box=None, minpx=30):
    x0, y0, x1, y1 = box if box else (0, 0, mask.shape[1], mask.shape[0])
    lab, n = ndimage.label(mask[y0:y1, x0:x1])
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        sz = int((lab[sl] == i + 1).sum())
        if sz >= minpx: out.append((sz, sl[1].start + x0, sl[0].start + y0, sl[1].stop + x0, sl[0].stop + y0))
    return sorted(out, reverse=True)

def select(mask, box, minfrac=0.002, minpx=40):
    """mask restricted to box, keeping components with >= minpx pixels (drops JPEG specks)."""
    x0, y0, x1, y1 = box
    m = np.zeros_like(mask); sub = mask[y0:y1, x0:x1]
    lab, n = ndimage.label(sub)
    if n:
        sz = ndimage.sum(sub, lab, range(1, n + 1))
        ok = sz >= max(minpx, sz.max() * minfrac)
        big = int(np.argmax(sz))
        for i, sl in enumerate(ndimage.find_objects(lab)):   # drop non-main blobs touching the box edge (neighbour pose)
            if i != big and (sl[0].start == 0 or sl[1].start == 0 or sl[0].stop == sub.shape[0] or sl[1].stop == sub.shape[1]): ok[i] = False
        keep = np.isin(lab, 1 + np.nonzero(ok)[0])
        m[y0:y1, x0:x1] = sub & keep
    return m

def auto_anchor(rgb, m, box, headfrac=0.30, skin=True):
    """(head_x, feet_y, top_y): head x = centroid of skin pixels in head band (fallback: all opaque);
    feet = lowest row with >=4 dark non-red pixels."""
    x0, y0, x1, y1 = box
    sub = m[y0:y1, x0:x1]; c = rgb[y0:y1, x0:x1]
    ys, xs = np.nonzero(sub); top = ys.min(); bot = ys.max()
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    band = np.zeros_like(sub); band[top:top + int((bot - top) * headfrac)] = True
    sk = sub & band & (R > 170) & (G > 120) & (B > 90) & (R > G) & (G > B) & (R - B < 120)
    if skin and sk.sum() > 30: hx = np.nonzero(sk)[1].mean()
    else: hx = np.nonzero(sub & band)[1].mean()
    dark = sub & (np.maximum(np.maximum(R, G), B) < 90) & (R < B + 30)
    rows = np.nonzero(dark.sum(1) >= 4)[0]
    fy = rows.max() if len(rows) else bot
    return hx + x0, fy + y0 + 1, top + y0, int(sk.sum())

def masked_rgba(rgb, m):
    return np.dstack([np.clip(rgb, 0, 255), m * 255]).astype(np.uint8)

def xwarp(rgba, ax, left=None, right=None):
    """piecewise-linear horizontal squash of the raw (raw coords). left=(off,k): pixels further than off px left of
    anchor x are compressed by k toward it. right=(off,k) likewise on the right."""
    H, W, _ = rgba.shape
    X = np.arange(W, dtype=np.float64); u = X - ax; src = u.copy()
    if right: o, k = right; sel = u > o; src[sel] = o + (u[sel] - o) / k
    if left: o, k = left; sel = u < -o; src[sel] = -o + (u[sel] + o) / k
    sx = np.round(src + ax).astype(int); ok = (sx >= 0) & (sx < W)
    out = np.zeros_like(rgba); out[:, ok] = rgba[:, sx[ok]]
    return out

def render(rgba, ax, ay, s, fw, fh, tx, ty, sample="box"):
    """sample raw rgba so raw point (ax,ay) lands on frame point (tx,ty) (frame px edges), scale s (out px per raw px).
    returns float RGBA (alpha 0..255)."""
    x0 = ax - tx / s; y0 = ay - ty / s; x1 = x0 + fw / s; y1 = y0 + fh / s
    H, W, _ = rgba.shape
    pad = int(max(0, -x0, -y0, x1 - W, y1 - H)) + 2
    if pad:
        rgba = np.pad(rgba, ((pad, pad), (pad, pad), (0, 0))); x0 += pad; x1 += pad; y0 += pad; y1 += pad
    if sample == "box":
        pre = rgba.astype(np.float32); pre[..., :3] *= pre[..., 3:4] / 255
        im = Image.fromarray(pre.round().astype(np.uint8), "RGBA").resize((fw, fh), Image.BOX, box=(x0, y0, x1, y1))
        f = np.asarray(im).astype(np.float32); al = f[..., 3:4]
        f[..., :3] = np.where(al > 0, f[..., :3] * 255 / np.maximum(al, 1), 0)
        return f
    if sample == "mode":
        return render_mode(rgba, x0, y0, s, fw, fh)
    im = Image.fromarray(rgba, "RGBA").resize((fw, fh), Image.NEAREST, box=(x0, y0, x1, y1))
    return np.asarray(im).astype(np.float32)

MODE_OPTS = {"ncol": 28, "dark_w": 1.6, "dark_lum": 70, "athr": 0.5}
def render_mode(rgba, x0, y0, s, fw, fh):
    """(2026-10-03, shiranui) majority-colour downsampling: the raw is quantized to MODE_OPTS['ncol'] colours, each
    output pixel takes the most frequent colour of its footprint (dark line colours weighted by dark_w so outlines
    survive). Gives flat, crisp pixel-art colour areas instead of box-averaged mud. Opaque if opaque fraction>=athr."""
    o = MODE_OPTS; H, W, _ = rgba.shape
    ix0, iy0 = int(np.floor(x0)), int(np.floor(y0)); ix1 = int(np.ceil(x0 + fw / s)) + 1; iy1 = int(np.ceil(y0 + fh / s)) + 1
    sub = rgba[max(0, iy0):min(H, iy1), max(0, ix0):min(W, ix1)]
    op = sub[..., 3] >= 128
    out = np.zeros((fh, fw, 4), np.float32)
    if not op.any(): return out
    px = sub[..., :3][op].reshape(-1, 1, 3).astype(np.uint8)
    q = Image.fromarray(px, "RGB").quantize(colors=o["ncol"], method=Image.Quantize.MEDIANCUT)
    pal = np.array(q.getpalette()[:3 * o["ncol"]]).reshape(-1, 3)
    idx = np.full(op.shape, -1, np.int32); idx[op] = np.asarray(q).ravel()
    lum = pal @ np.array([0.3, 0.55, 0.15]); w = np.where(lum < o["dark_lum"], o["dark_w"], 1.0)
    for fn, bw in o.get("boost", []):   # (diceroll) e.g. [["accent_gold", 2.5]]: thin gold trim / red eye survive the vote
        w = np.where(globals()[fn](pal[None].astype(int))[0], bw, w)
    oy, ox = max(0, iy0), max(0, ix0)
    for j in range(fh):
        ya = int(round(y0 + j / s)) - oy; yb = int(round(y0 + (j + 1) / s)) - oy
        for i in range(fw):
            xa = int(round(x0 + i / s)) - ox; xb = int(round(x0 + (i + 1) / s)) - ox
            ya_, yb_, xa_, xb_ = max(ya, 0), max(min(yb, idx.shape[0]), 0), max(xa, 0), max(min(xb, idx.shape[1]), 0)
            area = max(1, (yb - ya) * (xb - xa))
            blk = idx[ya_:yb_, xa_:xb_].ravel(); blk = blk[blk >= 0]
            if len(blk) < o["athr"] * area: continue
            cnt = np.bincount(blk, minlength=len(pal)) * w
            out[j, i, :3] = pal[int(np.argmax(cnt))]; out[j, i, 3] = 255
    return out

def finalize(frames, colors=24, athr=128, despeck=True, palette_img=None):
    """frames: list of float RGBA (fh,fw,4). shared palette quantization, alpha 0/255, drop isolated pixels."""
    strip = np.concatenate(frames, axis=1)
    alpha = strip[..., 3] >= athr
    if despeck:
        n = ndimage.convolve(alpha.astype(int), np.ones((3, 3), int), mode="constant") - alpha
        alpha &= n > 0
    op = strip[..., :3][alpha].round().astype(np.uint8).reshape(-1, 1, 3)
    pal = palette_img or Image.fromarray(op, "RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    q = np.asarray(Image.fromarray(strip[..., :3].round().astype(np.uint8), "RGB").quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
    out = np.dstack([q, alpha * 255]).astype(np.uint8); out[~alpha] = 0
    return out, pal

def check(out, fw, fh, name="", allow_bottom=True):
    n = out.shape[1] // fw; msgs = []
    for i in range(n):
        a = out[:, i * fw:(i + 1) * fw, 3] > 0
        e = []
        if a[:, 0].any(): e.append("L")
        if a[:, -1].any(): e.append("R")
        if a[0].any(): e.append("T")
        if not allow_bottom and a[-1].any(): e.append("B")
        if e: msgs.append(f"f{i}:{''.join(e)}")
    rgb = out[..., :3][out[..., 3] > 0].astype(int)
    green = ((rgb[:, 1] > rgb[:, 0] + 25) & (rgb[:, 1] > rgb[:, 2] + 25)).sum()
    ncol = len(np.unique(rgb, axis=0)); al = np.unique(out[..., 3]).tolist()
    print(f"[check {name}] edge-touch: {msgs or 'none'}  greenish px: {green}  colours: {ncol}  alpha: {al}")

def fx_red(rgb):
    """bright saturated red / hot pink-white effect pixels (magic, weapons, slash trails)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return ((r > 150) & (r - np.maximum(g, b) > 70)) | ((r > 225) & (g > 120) & (b > 120) & (r - b > 40) & (g - b < 25) & (r - g > 50))

def make_palette(pix_groups):
    """pix_groups: list of (Nx3 uint8 array, ncolours). returns a P-mode palette image for Image.quantize"""
    cols = []
    for px, n in pix_groups:
        if len(px) == 0 or n <= 0: continue
        q = Image.fromarray(px.reshape(-1, 1, 3), "RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT)
        p = q.getpalette()[:3 * len(q.getcolors())] if q.getcolors() else q.getpalette()[:3 * n]
        used = sorted(set(np.asarray(q).ravel().tolist()))
        cols += [tuple(q.getpalette()[3 * i:3 * i + 3]) for i in used]
    cols = list(dict.fromkeys(cols))
    pal = Image.new("P", (1, 1)); flat = [c for t in cols for c in t]
    pal.putpalette(flat + flat[:3] * (256 - len(cols)))
    return pal, len(cols)

def finalize2(frames, colors=24, fx=8, athr=128, despeck=True, fxfunc=fx_red):
    strip = np.concatenate(frames, axis=1)
    alpha = strip[..., 3] >= athr
    if despeck:
        n = ndimage.convolve(alpha.astype(int), np.ones((3, 3), int), mode="constant") - alpha
        alpha &= n > 0
    rgb8 = strip[..., :3].round().clip(0, 255).astype(np.uint8)
    isfx = fxfunc(rgb8.astype(int)) & alpha
    pal, n = make_palette([(rgb8[alpha & ~isfx], colors - fx), (rgb8[isfx], fx)] if fx else [(rgb8[alpha], colors)])
    q = np.asarray(Image.fromarray(rgb8, "RGB").quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
    out = np.dstack([q, alpha * 255]).astype(np.uint8); out[~alpha] = 0
    return out, pal

def eye_mask(rgb, sel, ax, top, band, halfw):
    """bright red eye pixels inside the head band (raw coords)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    m = sel & (r > 170) & (g < 80) & (b < 90)
    keep = np.zeros_like(m); y0 = int(top); y1 = int(top + band); x0 = int(ax - halfw); x1 = int(ax + halfw)
    keep[max(0, y0):y1, max(0, x0):x1] = True
    return m & keep

def fx_purple(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return ((b > 140) & (r > 100) & (g < np.minimum(r, b) - 35)) | ((b > 215) & (r > 190) & (b - g > 25))

def fx_cyan(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return ((b > 170) & (g > 150) & (r < g - 40)) | ((b > 225) & (g > 220) & (r > 170) & (b - r > 15))

def accent_eyes(rgb):
    """saturated red (eyes/horns) and saturated green (green eye) accents"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return ((r > 150) & (r - np.maximum(g, b) > 90)) | ((g > 110) & (g - np.maximum(r, b) > 45))

def finalize3(frames, colors=24, groups=(), athr=128, despeck=True):
    """groups: [(func, ncolours), ...] reserved palette slots for pixel classes (effects/accents); rest gets the remainder"""
    strip = np.concatenate(frames, axis=1)
    alpha = strip[..., 3] >= athr
    if despeck:
        n = ndimage.convolve(alpha.astype(int), np.ones((3, 3), int), mode="constant") - alpha
        alpha &= n > 0
    rgb8 = strip[..., :3].round().clip(0, 255).astype(np.uint8)
    used = np.zeros_like(alpha); pg = []
    for func, n in groups:
        m = func(rgb8.astype(int)) & alpha & ~used; used |= m; pg.append((rgb8[m], n))
    pg.append((rgb8[alpha & ~used], colors - sum(n for _, n in groups)))
    pal, n = make_palette(pg)
    q = np.asarray(Image.fromarray(rgb8, "RGB").quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB"))
    out = np.dstack([q, alpha * 255]).astype(np.uint8); out[~alpha] = 0
    return out, pal

def ywarp_top(rgba, ay, off, k):
    """squash rows more than off px above anchor y by factor k (toward the anchor)"""
    H = rgba.shape[0]; Y = np.arange(H, dtype=np.float64); u = ay - Y; src = u.copy()
    sel = u > off; src[sel] = off + (u[sel] - off) / k
    sy = np.round(ay - src).astype(int); ok = (sy >= 0) & (sy < H)
    out = np.zeros_like(rgba); out[ok] = rgba[sy[ok]]
    return out

def eye_masks(rgb, sel, headbox, near_skin=10):
    """{'red': mask, 'green': mask, 'cyan':...} of iris pixels inside headbox that are close to face skin (excludes horns)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    x0, y0, x1, y1 = [int(v) for v in headbox]
    box = np.zeros_like(sel); box[max(0, y0):y1, max(0, x0):x1] = True
    skin = sel & box & (r > 170) & (g > 120) & (b > 90) & (r > g) & (g > b) & (r - b < 130)
    near = ndimage.binary_dilation(skin, iterations=near_skin)
    base = sel & box & near
    return {"red": base & (r > 150) & (g < 90) & (b < 100) & (r - g > 90),
            "green": base & (g > 90) & (g - np.maximum(r, b) > 40),
            "gold": base & (r > 150) & (g > 95) & (b < 110) & (r - b > 80) & (g - b > 45) & (r - g < 120)}

def accent_green(rgb):
    """saturated green accent only (green eyes) – for characters with red clothing"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (g > 90) & (g - np.maximum(r, b) > 35)

def accent_gold(rgb):
    """saturated gold / amber accent (golden eyes, fan ribs, obi cord, fire core) – (2026-10-03, shiranui)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 170) & (g > 105) & (b < 120) & (g - b > 55) & (r - g < 120)

def accent_white(rgb):
    """near-white low-saturation px (fox mask, white fur, inner kimono) – (2026-10-03, shiranui)"""
    mx = rgb.max(-1); mn = rgb.min(-1)
    return (mn > 180) & (mx - mn < 45)

def skin_pale(rgb):
    """very pale pinkish skin (kanata: ~(253,240,236)) – kept as its own palette group so it doesn't merge into lavender whites (2026-10-03, kanata)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (r > 225) & (r - b >= 8) & (r - b < 70) & (g >= b - 4) & (r - g < 60)
