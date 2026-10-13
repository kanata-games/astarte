# gridcrop.py raw x0 y0 x1 y1 out [zoom] : crop with grid every 10px (labels every 50), green keyed to grey
import sys; import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from sprite_lib import *
from PIL import ImageDraw
raw=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; z=float(sys.argv[7]) if len(sys.argv)>7 else 2
rgb,m=load_raw(raw)
c=rgb[y0:y1,x0:x1].copy(); mm=m[y0:y1,x0:x1]
c[~mm]=(150,150,150)
im=Image.fromarray(c.astype(np.uint8)).resize((int((x1-x0)*z),int((y1-y0)*z)),Image.NEAREST)
d=ImageDraw.Draw(im)
for x in range((x0//10+1)*10,x1,10):
    X=(x-x0)*z; d.line([X,0,X,im.height],fill=(0,255,255) if x%50==0 else (90,90,110),width=1)
    if x%50==0: d.text((X+2,2),str(x),fill=(255,255,0))
for y in range((y0//10+1)*10,y1,10):
    Y=(y-y0)*z; d.line([0,Y,im.width,Y],fill=(0,255,255) if y%50==0 else (90,90,110),width=1)
    if y%50==0: d.text((2,Y+2),str(y),fill=(255,255,0))
im.save(out)
