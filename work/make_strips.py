"""make_strips.py -> work/strip_<anim>.png (4x, cx/feet guide) for a few animations"""
import json; from PIL import Image, ImageDraw
J = json.load(open('../assets/art/astarte.json')); sh = Image.open('../assets/art/' + J['image']).convert('RGBA'); FW, FH, S = J['frame_w'], J['frame_h'], 4
A = {a['name']: a['frames'] for a in J['animations']}
for nm, fr in {'idle_run': A['idle'] + A['run'], 'jump': A['jump_rise'] + A['jump_apex'] + A['fall'] + A['land'], 'light_combo': A['light1'] + A['light2'] + A['light3'],
               'heavy': A['heavy'], 'roll': A['roll'], 'misc': A['parry'] + A['hurt'] + A['death'] + A['rest'] + A['potion']}.items():
    im = Image.new('RGBA', (len(fr) * FW * S, FH * S), (110, 120, 130, 255)); d = ImageDraw.Draw(im)
    for j, i in enumerate(fr):
        im.alpha_composite(sh.crop((i * FW, 0, i * FW + FW, FH)).resize((FW * S, FH * S), Image.NEAREST), (j * FW * S, 0))
        d.line([(j * FW * S + J['cx'] * S, 0), (j * FW * S + J['cx'] * S, FH * S)], fill=(255, 0, 255, 120))
        hb = next((a.get('hitbox', {}).get(str(i)) for a in J['animations'] if str(i) in a.get('hitbox', {})), None)
        if hb: x0 = j * FW * S + (J['cx'] + hb['x']) * S; y0 = (J['feet_y'] + hb['y']) * S; d.rectangle([x0, y0, x0 + hb['w'] * S, y0 + hb['h'] * S], outline=(255, 40, 40))
    d.line([(0, (J['feet_y'] + 1) * S), (im.width, (J['feet_y'] + 1) * S)], fill=(255, 0, 255, 160)); im.save(f'strip_{nm}.png')
