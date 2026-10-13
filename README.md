# アスターテ ―月鐘の廃墟― (prototype)
2D side-scrolling soulslike (Salt and Sanctuary-like). HTML/Canvas, all art drawn by script. Credits: 清掃員工房 / カナタゲームズ.
- Edit `src/*`, then `python3 tools/build.py` → `index.html`
- Play: `node tools/serve.js 8000` → http://127.0.0.1:8000/
- Test: `node tools/test.js`   Screenshots: `node tools/shots.js`
- Add weapon: new entry in `WEAPONS` (src/02_config.js) + draw style in `drawWeapon` (src/04_art.js)

## Alpha systems
- Astarte sprites: `src/04b_astarte.js` (parametric pixel-art poses). Per-weapon motion sets in `ASTA.MOTIONS.<weapon>`; frames tagged `wu/act/rec` are time-mapped onto the move timings in `WEAPONS`. Export sheets: `node tools/export_astarte.js` → `assets/astarte_<weapon>.png/.json` + `screenshots/alpha_astarte_sheet.png`.
- Scenery: `src/05b_scenery.js`. `THEMES` (parallax layers, stone palette, darkness, fog, motes), `PROPS` (script-drawn decor + lights/flames/moon shafts), per-room `decor: [[prop, col, row, {fg, light, flip, ...}]]` in `src/05_world.js`. Drop-in art: add `{img:'assets/bg/x.png', speed, y, alpha}` to a theme's `layers` or a room's `layers`/`imgLayers`.

## v0.1.1-alpha
- Scythe Astarte uses the hooded 48x48 sheet (`assets/art/astarte48.png`) at native 1x, about 46px tall, a bit smaller than Kanata's 68px. 2x would be about 92px, which is too large. A non-integer scale of about 1.3x gives uneven pixels, so we chose crisp 1x. `?ascale=` is there for testing.
- The hitbox is 14x42, fitted to the sprite. The trail and flash scale with the body height.
- The pan stance still uses the 96x80 sheet, which has no hood, so its size changes on swap. It will be replaced when a hooded pan sheet arrives.
