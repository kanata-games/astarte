"""hood_measure.py -> frames_hood_measured.json. Like measure.py, but each frame box = main body component + nearby
small components (stars, impact sparks, pan pieces) within PAD px. Rows ordered top->bottom, frames left->right."""
import sys, json, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from sprite_lib import *
ROWS = {'hood_move': [('idle', 4), ('run', 6), ('jump', 4)],
        'hood_attack': [('roll', 6), ('light', 7), ('heavy', 6)],
        'hood_misc': [('parryhurt', 6), ('death', 5), ('restpot', 6)]}
PAD = 30
out = []
for raw, rows in ROWS.items():
    rgb, m = load_raw(f'raw/{raw}.jpg', median=3, erode=1)
    allc = comps(m, minpx=20); main = [c for c in allc if c[0] >= 3000]; small = [c for c in allc if c[0] < 3000]
    main.sort(key=lambda c: (c[2] + c[4]) / 2); groups = []
    for c in main:
        cy = (c[2] + c[4]) / 2
        if groups and abs(cy - np.mean([(g[2] + g[4]) / 2 for g in groups[-1]])) < 80: groups[-1].append(c)
        else: groups.append([c])
    assert [len(g) for g in groups] == [n for _, n in rows], (raw, [len(g) for g in groups])
    R, Gc, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    skin = m & (R > 195) & (Gc > 150) & (B > 120) & (R - B > 30) & (R - B < 110) & (R >= Gc)
    for (name, n), grp in zip(rows, groups):
        grp.sort(key=lambda c: c[1])
        for i, c in enumerate(grp):
            x0, y0, x1, y1 = c[1:]
            for s in small:   # attach small comps closest to this frame
                sx, sy = (s[1] + s[3]) / 2, (s[2] + s[4]) / 2
                if c[1] - PAD < sx < c[3] + PAD and c[2] - PAD - 40 < sy < c[4] + 10:
                    d = min(abs(sx - (g[1] + g[3]) / 2) for g in grp)
                    if abs(sx - (c[1] + c[3]) / 2) <= d + 1: x0, y0, x1, y1 = min(x0, s[1]), min(y0, s[2]), max(x1, s[3]), max(y1, s[4])
            bb = [c[1], c[2], c[3], c[4]]; ys, xs = np.nonzero(m[bb[1]:bb[3], bb[0]:bb[2]]); ys += bb[1]; xs += bb[0]
            sk = np.zeros_like(m); sk[bb[1]:bb[3], bb[0]:bb[2]] = skin[bb[1]:bb[3], bb[0]:bb[2]]
            lab, k = ndimage.label(ndimage.binary_dilation(sk, iterations=2)); best = None
            for j in range(1, k + 1):
                yy, xx = np.nonzero((lab == j) & sk)
                if len(xx) < 60: continue
                if best is None or yy.mean() < best[0]: best = (yy.mean(), xx.mean(), yy.max())
            bot = ys.max(); band = ys >= bot - (bot - ys.min()) * 0.12
            out.append({'raw': raw, 'anim': name, 'i': i, 'box': [x0 - 2, y0 - 2, x1 + 2, y1 + 2], 'body': bb, 'top': int(ys.min()), 'bottom': int(bot) + 1,
                        'face_x': round(float(best[1]), 1) if best else None, 'chin': int(best[2]) if best else None, 'feet_x': round(float(xs[band].mean()), 1)})
            print(out[-1])
json.dump(out, open('frames_hood_measured.json', 'w'), indent=0)
