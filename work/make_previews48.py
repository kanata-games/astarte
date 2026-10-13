"""make_previews48.py -> preview48_6x.png (labelled), compare48.png (Rockside 32x32 vs idle 0, both 6x), strip48_*.png (6x)"""
import json, subprocess; from PIL import Image, ImageDraw
subprocess.run(['python3', 'preview48.py', '../assets/art/astarte48.png', 'tmp/h48_meta.json', 'preview48_6x.png', '6', '10'], check=True)
a = Image.open('../assets/art/astarte48.png').convert('RGBA'); r = Image.open('/workspace/rockside/assets/astarte.png').convert('RGBA')
S = 6; im = Image.new('RGBA', ((32 + 48 + 48 + 24) * S, (48 + 4) * S), (150, 160, 170, 255)); d = ImageDraw.Draw(im)
im.alpha_composite(r.crop((0, 0, 32, 32)).resize((32 * S, 32 * S), Image.NEAREST), (4 * S, 20 * S - 4 * S))
im.alpha_composite(a.crop((0, 0, 48, 48)).resize((48 * S, 48 * S), Image.NEAREST), (44 * S, 2 * S))
im.alpha_composite(a.crop((48 * 4, 0, 48 * 5, 48)).resize((48 * S, 48 * S), Image.NEAREST), (96 * S, 2 * S))
d.text((8, 4), 'Rockside astarte 32x32 (6x)', fill=(0, 0, 0)); d.text((44 * S, 4), 'astarte48 idle 0 (6x)', fill=(0, 0, 0)); d.text((96 * S, 4), 'run 0 (6x)', fill=(0, 0, 0))
im.save('compare48.png')
J = json.load(open('../assets/art/astarte48.json')); A = {x['name']: x['frames'] for x in J['animations']}
for nm, fr in {'idle_run': A['idle'] + A['run'], 'roll_jump': A['roll'] + A['jump_rise'] + A['jump_apex'] + A['fall'] + A['land'],
               'light': A['light1'] + A['light2'] + A['light3'], 'heavy_parry': A['heavy'] + A['parry'],
               'misc': A['hurt'] + A['death'] + A['rest'] + A['potion']}.items():
    st = Image.new('RGBA', (len(fr) * 48, 48), (150, 160, 170, 255))
    for j, i in enumerate(fr): st.alpha_composite(a.crop((i * 48, 0, i * 48 + 48, 48)), (j * 48, 0))
    st.resize((st.width * S, st.height * S), Image.NEAREST).save(f'strip48_{nm}.png')
