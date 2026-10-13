#!/usr/bin/env python3
"""h48_post.py -> ../assets/art/astarte48.png + astarte48.json (step 2 after h48_build.py).
Hand fixes, in this order: (1) clean blue eye pixels stamped at the detected iris (E1 over E0, far eye 1px E1),
(2) orphan clean-up (1-px specks that match none of their 4 neighbours, except accent colours), (3) idle frames get a
pixel-drawn scythe held in the front hand like the Rockside sprite, (4) 1px dark outline outside the silhouette,
(5) JSON: animations / ms / loop / active / hitbox (bbox of scythe gold + slash white in front of cx)."""
import json, os, numpy as np; from PIL import Image
from scipy import ndimage
mt = json.load(open('tmp/h48_meta.json')); idx = np.load('tmp/h48_idx.npy'); NAMES = mt['names']; I = {n: i for i, n in enumerate(NAMES)}
P = np.array([mt['pal'][n] for n in NAMES]); FW, FH, CX, BASE = mt['fw'], mt['fh'], mt['cx'], mt['base']; N = idx.shape[1] // FW
ACC = {I[n] for n in ('E0', 'E1', 'G0', 'G1', 'P', 'M', 'Y', 'S0', 'OUT')}
FIX = json.load(open('h48_fix.json')) if os.path.exists('h48_fix.json') else {}   # per-frame pixel edits {"i": [[x,y,"COL"],..]}
SCY = [(x, y, 'G0') for x, y in [(0, -1), (1, -2), (2, -3), (3, -3), (4, -3), (5, -3), (6, -3), (7, -2), (8, -1), (9, 0), (9, 1), (10, 2), (10, 3)]] + \
      [(x, y, 'G1') for x, y in [(1, -1), (2, -2), (3, -2), (4, -2), (5, -2), (6, -2), (7, -1), (8, 0), (8, 1), (9, 2), (9, 3), (9, 4), (10, 4)]] + \
      [(x, y, 'G2') for x, y in [(3, -1), (4, -1), (5, -1), (6, -1), (7, 0), (8, 2), (9, 5)]] + [(0, 0, 'G1'), (-1, 0, 'G2')]   # Rockside-style gold crescent
frames = []
for k in range(N):
    f = idx[:, k * FW:(k + 1) * FW].copy(); m = mt['frames'][k]
    # (2) orphan specks
    for _ in range(2):
        g = np.pad(f, 1, constant_values=-2); nb = np.stack([g[:-2, 1:-1], g[2:, 1:-1], g[1:-1, :-2], g[1:-1, 2:]])
        lone = (f >= 0) & (nb != f).all(0) & ~np.isin(f, list(ACC))
        for y, x in zip(*np.nonzero(lone)):
            v = nb[:, y, x]; v = v[v >= 0]
            if len(v) >= 3: f[y, x] = np.bincount(v).argmax()
    # (1) eyes
    eyes = sorted(m['eyes'], key=lambda e: -e[2])
    for j, (x, y, n) in enumerate(eyes[:2]):
        if not (0 <= x < FW and 1 <= y < FH) or f[y, x] < 0: continue
        if j == 0:   # 2x2 eye glyph: deep blue top, bright iris bottom-left, dark lash above where it sits on skin
            for dx, dy, c in ((0, -1, 'E1'), (1, -1, 'E1'), (0, 0, 'E0'), (1, 0, 'E1')):
                if 0 <= x + dx < FW and f[y + dy, x + dx] >= 0: f[y + dy, x + dx] = I[c]
            for dx in (0, 1):
                if f[y - 2, x + dx] in (I['S0'], I['S1']): f[y - 2, x + dx] = I['OUT']
            mm = np.argwhere(f == I['M'])   # stray mouth-red pixels: keep only just below/in front of the eye
            for yy, xx in mm:
                if not (y + 2 <= yy <= y + 4 and x - 1 <= xx <= x + 3): f[yy, xx] = I['S0'] if f[yy, xx] == I['M'] else f[yy, xx]
        elif n >= 6: f[y, x] = I['E1']
    # (3) idle scythe
    if m['name'] == 'idle':
        hy = BASE - 19; top = BASE - 40
        hx = int(max(np.nonzero(f[y] >= 0)[0].max() for y in range(hy - 2, hy + 3))) + 1   # just outside the front hand
        for y in range(top + 1, BASE): f[y, hx] = I['N1']
        f[BASE - 1, hx] = I['G1']
        for dx, dy, c in SCY: f[top + dy, hx + dx] = I[c]
        f[top + 1, hx] = I['G1']; f[hy, hx - 1] = I['S0']; f[hy, hx] = I['S0']; f[hy + 1, hx] = I['S1']
    for x, y, c in FIX.get(str(k), []): f[y, x] = I[c] if c != 'CLEAR' else -1
    # (4) outline
    op = f >= 0; n4 = np.zeros_like(op); n4[1:] |= op[:-1]; n4[:-1] |= op[1:]; n4[:, 1:] |= op[:, :-1]; n4[:, :-1] |= op[:, 1:]
    f[n4 & ~op] = I['OUT']
    t = [s for s, v in (('T', f[0]), ('B', f[-1]), ('L', f[:, 0]), ('R', f[:, -1])) if (v >= 0).any()]
    if t: print('EDGE', k, m['name'], t)
    frames.append(f)
A = np.concatenate(frames, 1); img = np.zeros(A.shape + (4,), np.uint8); ok = A >= 0; img[ok, :3] = P[A[ok]]; img[ok, 3] = 255
out = os.path.join('..', 'assets', 'art'); Image.fromarray(img, 'RGBA').save(os.path.join(out, 'astarte48.png'))
names = [fm['name'] for fm in mt['frames']]; ix = {}; [ix.setdefault(n, []).append(i) for i, n in enumerate(names)]
T = {'idle': (160, True), 'run': (80, True), 'jump_rise': (100, True), 'jump_apex': (120, False), 'fall': (100, True), 'land': (80, False),
     'roll': ([60, 60, 60, 60, 90, 110], False), 'light1': ([90, 70], False), 'light2': ([80, 70], False), 'light3': ([70, 70, 120], False),
     'heavy': ([240, 140, 80, 90, 110, 140], False), 'parry': ([60, 140, 120, 100], False), 'hurt': (110, False),
     'death': ([120, 140, 160, 200, 600], False), 'rest': ([250, 600], False), 'potion': ([140, 220, 220, 180], False)}
ACTIVE = {'light1': [1], 'light2': [0, 1], 'light3': [0, 1], 'heavy': [2, 3], 'parry': [1, 2]}
def hitbox(i, parry):
    f = A[:, i * FW:(i + 1) * FW]; m = np.isin(f, [I['G0'], I['G1'], I['W0'], I['Y']] if not parry else [I['G0'], I['G1'], I['Y'], I['W0']]); m[:, :CX + 4] = False
    m[BASE - 30:BASE + 1, :CX + 8] = False
    ys, xs = np.nonzero(m)
    if len(xs) < 3: return None
    return {'x': int(xs.min() - CX), 'y': int(ys.min() - BASE), 'w': int(xs.max() - xs.min() + 1), 'h': int(ys.max() - ys.min() + 1)}
anims = []
for an, (ms, loop) in T.items():
    fr = ix[an]; ms = ms if isinstance(ms, list) else [ms] * len(fr); assert len(ms) == len(fr), an
    e = {'name': an, 'frames': fr, 'ms': ms, 'loop': loop}
    if an in ACTIVE: e['active'] = [fr[j] for j in ACTIVE[an]]; e['hitbox'] = {str(fr[j]): hitbox(fr[j], an == 'parry') for j in ACTIVE[an]}
    anims.append(e)
J = {'image': 'astarte48.png', 'frame_w': FW, 'frame_h': FH, 'frames': N, 'columns': N, 'cx': CX, 'feet_y': BASE, 'facing': 'right',
     'hitbox_note': 'x/y relative to (cx, feet_y), facing right (mirror x for left). Rough: bbox of scythe blade + slash in front of the body.',
     'warped_frames': {str(i): fm['warp'] for i, fm in enumerate(mt['frames']) if any(fm['warp'])}, 'animations': anims}
json.dump(J, open(os.path.join(out, 'astarte48.json'), 'w'), indent=1)
print('frames', N, 'colours', len({tuple(c) for c in img[ok][:, :3]}))
for e in anims: print(e['name'], e['frames'][0], '-', e['frames'][-1], e.get('hitbox', ''))
