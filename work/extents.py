"""extents.py spec.json -> per-frame L/R/up extents rendered on a large canvas (to find clipping / height jumps)"""
import json,subprocess,sys,numpy as np; from PIL import Image
s=json.load(open(sys.argv[1])); s.update(fw=170,fh=110,cx=85,base=108); json.dump(s,open('_big.json','w'))
subprocess.run(['python3','lib/gaiden_sheet.py','_big.json','tmp/_big.png'],capture_output=True); import os; os.remove('_big.json')
a=np.array(Image.open('tmp/_big.png'))[...,3]
for i in range(a.shape[1]//170):
  f=a[:,i*170:(i+1)*170]; ys,xs=np.nonzero(f); print(i,s['frames'][i]['name'],'L',85-xs.min(),'R',xs.max()-85,'up',108-ys.min())
