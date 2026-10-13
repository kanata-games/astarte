# アスターテ ―月鐘の廃墟― (prototype)
2D side-scrolling soulslike (Salt and Sanctuary-like). HTML/Canvas, all art drawn by script. Credits: 清掃員工房 / カナタゲームズ.
- Edit `src/*`, then `python3 tools/build.py` → `index.html`
- Play: `node tools/serve.js 8000` → http://127.0.0.1:8000/
- Test: `node tools/test.js`   Screenshots: `node tools/shots.js`
- Add weapon: new entry in `WEAPONS` (src/02_config.js) + draw style in `drawWeapon` (src/04_art.js)
