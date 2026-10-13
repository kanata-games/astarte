"""measure.py -> frames_measured.json: per raw frame box (connected component bbox), face centroid / chin (largest
skin cluster nearest the top), feet-band centre and bottom. Used by make_spec.py."""
import sys, json, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from sprite_lib import *
ORDER = {'move': [('idle', 4), ('run', 6), ('jump', 4)],
         'attack': [('roll', 6), ('light', 7), ('heavy', 6)],
         'misc': [('parry', 3), ('hurt', 2), ('death', 4), ('restpot', 6)]}
out = []
for raw, rows in ORDER.items():
    rgb, m = load_raw(f'raw/raw_{raw}.jpg', median=3, erode=1)
    cs = [c for c in comps(m, minpx=4000) if not (raw == "misc" and 160 < c[1] < 180 and c[2] > 570)]
    # rows by y-centre clustering
    cs.sort(key=lambda c: (c[2] + c[4]) / 2)
    groups = []; 
    for c in cs:
        cy = (c[2] + c[4]) / 2
        if groups and abs(cy - groups[-1][-1][5]) < 70: groups[-1].append(c + (cy,))
        else: groups.append([c + (cy,)])
    assert len(groups) == len(rows), (raw, len(groups))
    R, Gc, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    skin = m & (R > 195) & (Gc > 150) & (B > 120) & (R - B > 30) & (R - B < 110) & (R >= Gc)
    for (name, n), grp in zip(rows, groups):
        grp.sort(key=lambda c: c[1]); assert len(grp) == n, (name, len(grp))
        for i, c in enumerate(grp):
            _, x0, y0, x1, y1, _ = c; box = [x0 - 2, y0 - 2, x1 + 2, y1 + 2]
            sel = select(m, box); ys, xs = np.nonzero(sel)
            sk = np.zeros_like(sel); sk[box[1]:box[3], box[0]:box[2]] = skin[box[1]:box[3], box[0]:box[2]] & sel[box[1]:box[3], box[0]:box[2]]
            lab, k = ndimage.label(ndimage.binary_dilation(sk, iterations=2))
            best = None
            for j in range(1, k + 1):
                yy, xx = np.nonzero((lab == j) & sk)
                if len(xx) < 60: continue
                key = yy.mean()
                if best is None or key < best[0]: best = (key, xx.mean(), yy.max(), len(xx))
            bot = ys.max(); band = ys >= bot - (bot - ys.min()) * 0.12
            out.append({'raw': raw, 'anim': name, 'i': i, 'box': [int(v) for v in box], 'top': int(ys.min()), 'bottom': int(bot) + 1,
                        'face_x': round(float(best[1]), 1) if best else None, 'chin': int(best[2]) if best else None,
                        'feet_x': round(float(xs[band].mean()), 1), 'xmin': int(xs.min()), 'xmax': int(xs.max())})
            print(out[-1])
json.dump(out, open('frames_measured.json', 'w'), indent=0)
