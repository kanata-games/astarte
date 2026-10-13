#!/usr/bin/env python3
"""h48_build.py -> tmp/h48_raw.png + tmp/h48_meta.json : hooded Astarte 48x48 pixel sheet, step 1 (sampling).
Method (no blur): raw (green key) -> every raw pixel mapped to the FIXED palette PAL (modelled on the Rockside
astarte colours + design sheet) -> body-anchored fixed-scale grid -> per output pixel weighted vote of palette
indices (eye blue / gold / pink / skin / outline boosted so 1-px features survive) -> auto x/y warp only for
frames that would clip. Step 2 (h48_post.py) adds outline + hand fixes. Frame list / scales: FRAMES below."""
import sys, os, json; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from sprite_lib import load_raw, select, xwarp, ywarp_top
from scipy import ndimage
import numpy as np; from PIL import Image
FW = FH = 48; CX = 24; BASE = 46          # feet line (outline row below the boots = 46, last boot row 45)
S = 43.5 / 204                            # out px per raw-move px (idle raw ears..feet 204 -> ~44 px + outline)
PAL = {'OUT': (8, 10, 20), 'N0': (14, 30, 58), 'N1': (24, 48, 92), 'N2': (36, 64, 118), 'N3': (62, 96, 156),
       'W0': (246, 245, 240), 'W1': (222, 220, 218), 'W2': (180, 176, 180), 'W3': (128, 124, 132), 'H': (198, 204, 222),
       'S0': (248, 220, 186), 'S1': (222, 174, 138), 'P': (232, 150, 162), 'M': (196, 104, 104),
       'G0': (252, 216, 118), 'G1': (220, 168, 76), 'G2': (150, 104, 56), 'E0': (74, 144, 232), 'E1': (34, 72, 156),
       'K0': (28, 28, 36), 'K1': (50, 50, 62), 'K2': (84, 84, 100), 'Y': (255, 250, 206)}
NAMES = list(PAL); P = np.array([PAL[n] for n in NAMES], float); IDX = {n: i for i, n in enumerate(NAMES)}
BOOST = {'E0': 6, 'E1': 4, 'P': 3, 'G0': 3, 'G1': 2.5, 'S0': 1.6, 'S1': 1.4, 'OUT': 1.3, 'M': 2, 'Y': 3}
W = np.array([BOOST.get(n, 1.0) for n in NAMES])
RAWS = {'move': 'raw/hood_move.jpg', 'attack': 'raw/hood_attack.jpg', 'misc': 'raw/hood_misc.jpg'}
K = {'move': 1.0, 'attack': 204 / 179, 'misc': 204 / 190}   # standing ears..feet: idle 204, roll-recovery 179, potion 190
M = json.load(open('frames_hood_measured.json'))
SEQ = [('move', 'idle', range(4), ['idle'] * 4), ('move', 'run', range(6), ['run'] * 6),
       ('move', 'jump', range(4), ['jump_rise', 'jump_apex', 'fall', 'land']),
       ('attack', 'roll', range(6), ['roll'] * 6), ('attack', 'light', range(7), ['light1'] * 2 + ['light2'] * 2 + ['light3'] * 3),
       ('attack', 'heavy', range(6), ['heavy'] * 6), ('misc', 'parryhurt', range(6), ['parry'] * 4 + ['hurt'] * 2),
       ('misc', 'death', range(5), ['death'] * 5), ('misc', 'restpot', range(6), ['rest'] * 2 + ['potion'] * 4)]
EXTRA = json.load(open('h48_extra.json')) if os.path.exists('h48_extra.json') else {}

def classify(rgb):
    d = ((rgb[..., None, :].astype(float) - P[None, None]) ** 2 * np.array([0.35, 0.45, 0.2])).sum(-1)
    return d.argmin(-1)

def vote(cls, op, ax, ay, s, fw=FW, fh=FH, cx=CX, base=BASE):
    """cls: raw palette index map (-1 = transparent). raw (ax, ay) -> out (cx, base)."""
    out = np.full((fh, fw), -1, int); x0 = ax - cx / s; y0 = ay - base / s; H_, W_ = cls.shape
    for j in range(fh):
        ya, yb = int(round(y0 + j / s)), int(round(y0 + (j + 1) / s))
        for i in range(fw):
            xa, xb = int(round(x0 + i / s)), int(round(x0 + (i + 1) / s))
            area = max(1, (yb - ya) * (xb - xa))
            blk = cls[max(ya, 0):max(min(yb, H_), 0), max(xa, 0):max(min(xb, W_), 0)].ravel(); blk = blk[blk >= 0]
            if len(blk) < 0.45 * area: continue
            out[j, i] = int(np.argmax(np.bincount(blk, minlength=len(NAMES)) * W))
    return out

cache = {}; frames = []; meta = []
for raw, anim, rng, names in SEQ:
    if raw not in cache:
        rgb, m = load_raw(RAWS[raw], median=3, erode=1); cache[raw] = (rgb, m, classify(rgb))
    rgb, m, cls0 = cache[raw]
    fl = [f for f in M if f['raw'] == 'hood_' + raw and f['anim'] == anim]
    for i, nm in zip(rng, names):
        f = fl[i]; key = f'{anim}_{i}'; ex = EXTRA.get(key, {})
        box = ex.get('box', f['box']); sel = select(m, box) if not ex.get('keep_all', True) else np.zeros_like(m)
        if ex.get('keep_all', True): sel[box[1]:box[3], box[0]:box[2]] = m[box[1]:box[3], box[0]:box[2]]
        for e in ex.get('exclude', []): sel[e[1]:e[3], e[0]:e[2]] = False
        ys_, xs_ = np.nonzero(sel); bot = ys_.max(); hgt = bot - ys_.min()
        boot = sel & np.isin(cls0, [IDX[n] for n in ('K0', 'K1', 'K2', 'N0', 'N1', 'N2', 'OUT')]); boot[:int(bot - max(8, 0.07 * hgt))] = False
        bx = np.nonzero(boot)[1]
        hx = float(np.nonzero(sel[ys_.min():int(ys_.min() + 0.3 * hgt)])[1].mean())   # hood/head centre
        ax = float(np.median(bx)) if len(bx) > 20 else f['feet_x']
        if anim == 'jump': ax = hx - HEAD_OFF   # airborne: legs dangle, anchor from the head with the idle head->boots offset
        if anim == 'idle' and i == 0: HEAD_OFF = hx - ax
        ax = ex.get('ax', ax); ay = f['bottom']   # body anchor = boots centre
        s = S * K[raw]
        cls = np.where(sel, cls0, -1)
        # auto fit: measure extents on a big canvas, then warp in raw space where it would clip
        big = vote(cls, sel, ax, ay, s, 96, 72, 48, 70); ys, xs = np.nonzero(big >= 0)
        L, R, U = 48 - xs.min(), xs.max() - 48 + 1, 70 - ys.min()
        roomL, roomR, roomU = CX - 2, FW - CX - 2, BASE - 2   # 1px outline + 1px air
        if L > roomL or R > roomR or U > roomU:
            rgba = np.dstack([np.where(sel[..., None], (cls[..., None] + 1) * np.ones(3, int), 0), sel * 255]).astype(np.uint8)
            lw = rw = None
            if L > roomL: o = min(L - 1, 12); lw = (o / s, (roomL - o) / (L - o))
            if R > roomR: o = min(R - 1, 14); rw = (o / s, (roomR - o) / (R - o))
            rgba = xwarp(rgba, ax, lw, rw)
            if U > roomU: o = 40; rgba = ywarp_top(rgba, ay, o / s, (roomU - o) / (U - o))
            sel = rgba[..., 3] > 0; cls = np.where(sel, rgba[..., 0].astype(int) - 1, -1)
            print('warp', key, 'L', L, 'R', R, 'U', U, lw and round(lw[1], 2), rw and round(rw[1], 2))
        else: lw = rw = None
        # raw eye clusters (saturated blue iris) in the head zone -> mapped out coords (post step stamps clean eye pixels)
        R_, G_, B_ = [rgb[..., c].astype(int) for c in range(3)]
        top_ = ys_.min(); hz = np.zeros_like(sel); hz[top_:int(top_ + 0.42 * hgt)] = True
        eye = sel & hz & (B_ > 128) & (B_ - R_ > 85) & (B_ - G_ > 45)
        if nm == 'potion': eye[:] = False   # eyes shut while drinking
        lab, n = ndimage.label(ndimage.binary_dilation(eye, iterations=1)); eyes = []
        for j in range(1, n + 1):
            yy, xx = np.nonzero((lab == j) & eye)
            if 6 <= len(xx) <= 300:
                u = xx.mean() - ax
                for wv, sg in ((rw, 1), (lw, -1)):
                    if wv and sg * u > wv[0]: u = sg * (wv[0] + (sg * u - wv[0]) * wv[1])
                eyes.append([int(np.floor(CX + u * s)), int(np.floor(BASE + (yy.mean() - ay) * s)), len(xx)])
        fr = vote(cls, sel, ax, ay, s); frames.append(fr)
        meta.append({'name': nm, 'key': key, 'raw': raw, 'ax': ax, 'ay': ay, 's': s, 'L': int(L), 'R': int(R), 'U': int(U), 'eyes': eyes, 'warp': [lw, rw]})
idx = np.concatenate(frames, 1); np.save('tmp/h48_idx.npy', idx)
json.dump({'pal': PAL, 'names': NAMES, 'frames': meta, 'fw': FW, 'fh': FH, 'cx': CX, 'base': BASE}, open('tmp/h48_meta.json', 'w'), indent=1)
img = np.zeros(idx.shape + (4,), np.uint8); ok = idx >= 0; img[ok, :3] = P[idx[ok]]; img[ok, 3] = 255
Image.fromarray(img, 'RGBA').save('tmp/h48_raw.png'); print(len(frames), 'frames')
