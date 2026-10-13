// ===== scenery: data-driven themes (parallax layers, wall, tiles, fog, darkness) + per-room decor props + lighting =====
// Room defs (05_world.js) pick a theme and list decor: [propName, col, row, opts]. opts: {flip, light:1|2, fg:true (foreground), h}
// Hand-made art can be dropped in later: a theme/room layer {img:'assets/bg/foo.png', speed:.3, y:0, alpha:1} draws once the file exists.
const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const THEMES = {
  court:  { sky: ['#0a0c22', '#25234a', '#3a2e50'], moon: [300, 58, 26], dark: .32, fog: ['#8a90c0', .16], mote: '#b8c0ff',
            stone: ['#3a3848', '#46425a', '#2c2a3a', '#58526e'], moss: '#3e5a40', wall: 'ruin',
            layers: [{ k: 'sky' }, { k: 'spires', speed: .08 }, { k: 'clouds', speed: .14 }, { k: 'ruins', speed: .3 }] },
  nave:   { sky: ['#08081a', '#181838', '#241c38'], moon: [120, 50, 18], dark: .5, fog: ['#7a7cb0', .12], mote: '#ffd8a0',
            stone: ['#34304a', '#403a56', '#262236', '#504868'], moss: '#384a3a', wall: 'nave',
            layers: [{ k: 'sky' }, { k: 'spires', speed: .1 }, { k: 'arches', speed: .35 }] },
  crypt:  { sky: ['#06060e', '#0e0c1a', '#14101e'], dark: .68, fog: ['#5a9a9a', .2], mote: '#8af0e0',
            stone: ['#2e3236', '#3a3e42', '#22252a', '#4a4e52'], moss: '#2e4a3c', wall: 'crypt',
            layers: [{ k: 'cryptfar', speed: .3 }] },
  tower:  { sky: ['#0a0818', '#20183a', '#3a2440'], moon: [80, 40, 22], dark: .52, fog: ['#9a80b0', .12], mote: '#ffcf8a',
            stone: ['#3a3244', '#463c52', '#2a2434', '#5a4e66'], moss: '#3a4a3a', wall: 'nave',
            layers: [{ k: 'sky' }, { k: 'spires', speed: .06 }, { k: 'clouds', speed: .12 }, { k: 'arches', speed: .3 }] },
  belfry: { sky: ['#12060e', '#3a1420', '#5a2430'], moon: [192, 70, 34, '#ffd0c0'], dark: .42, fog: ['#c08090', .14], mote: '#ffb0a0',
            stone: ['#3a2c36', '#483642', '#2a2028', '#5e4652'], moss: '#4a3a3a', wall: 'belfry',
            layers: [{ k: 'sky' }, { k: 'clouds', speed: .1 }, { k: 'bellfar', speed: .2 }] },
};
for (const k in THEMES) THEMES[k].name = k;
const SCN = { layerCache: {}, imgs: {} };
function scnImg(src) { let im = SCN.imgs[src]; if (im !== undefined) return im && im.complete && im.naturalWidth ? im : null; im = new Image(); im.onerror = () => { SCN.imgs[src] = null; }; im.src = src; SCN.imgs[src] = im; return null; }
// ---------- parallax layers (pre-rendered, horizontally tileable 768px) ----------
function buildLayer(th, L) {
  const key = th.name + ':' + L.k; if (SCN.layerCache[key]) return SCN.layerCache[key];
  const W = 768, c = mk(W, VH), g = c.getContext('2d'), S = th.sky;
  if (L.k === 'sky') { const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, S[0]); gr.addColorStop(.6, S[1]); gr.addColorStop(1, S[2]); g.fillStyle = gr; g.fillRect(0, 0, W, VH);
    for (let i = 0; i < 140; i++) { const x = hsh(i, 1) * W, y = hsh(i, 2) * 170, b = hsh(i, 3); R(g, x, y, 1, 1, b > .9 ? '#ffffff' : b > .6 ? '#9a98c8' : '#4a4870'); if (b > .97) { R(g, x - 1, y, 3, 1, '#c8c8ff'); R(g, x, y - 1, 1, 3, '#c8c8ff'); } }
    if (th.moon) { const [mx, my, mr, mc] = th.moon; for (let r = mr * 3; r > mr; r -= 4) { g.globalAlpha = .035; g.fillStyle = mc || '#c8d0ff'; g.beginPath(); g.arc(mx, my, r, 0, 7); g.fill(); } g.globalAlpha = 1;
      g.fillStyle = mc || '#e8ecff'; g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill(); g.fillStyle = 'rgba(120,120,170,.25)'; for (const [a, b, r] of [[-6, -4, 5], [5, 6, 4], [8, -8, 3], [-3, 9, 2]]) { g.beginPath(); g.arc(mx + a * mr / 26, my + b * mr / 26, r * mr / 26, 0, 7); g.fill(); } } }
  else if (L.k === 'clouds') { for (let i = 0; i < 14; i++) { const x = hsh(i, 7) * W, y = 40 + hsh(i, 8) * 110, w = 60 + hsh(i, 9) * 140; g.fillStyle = `rgba(${th.name === 'belfry' ? '90,40,60' : '50,50,90'},${.18 + hsh(i, 5) * .15})`;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + k * w / 6, y + Math.sin(k) * 3, w / 5, 6 + hsh(i, k) * 5, 0, 0, 7); g.fill(); } } }
  else if (L.k === 'spires') { // distant cathedral silhouettes with tiny lit windows
    let x = 0; while (x < W) { const w = 30 + hsh(x, 1) * 50, h = 60 + hsh(x, 2) * 110, base = VH - 40; g.fillStyle = '#100e20'; g.fillRect(x, base - h, w, h + 40);
      g.beginPath(); g.moveTo(x - 2, base - h); g.lineTo(x + w / 2, base - h - 30 - hsh(x, 3) * 40); g.lineTo(x + w + 2, base - h); g.fill();
      for (let k = 0; k < 4; k++) if (hsh(x, k + 9) > .55) R(g, x + 6 + hsh(x, k + 20) * (w - 12), base - h + 14 + k * 22, 2, 4, hsh(x, k) > .5 ? '#ffcf6a' : '#5a5a9a');
      x += w + hsh(x, 4) * 40; } }
  else if (L.k === 'ruins') { let x = 0; while (x < W) { const w = 40 + hsh(x, 5) * 80, h = 50 + hsh(x, 6) * 90; g.fillStyle = '#181628'; g.fillRect(x, VH - 30 - h, w, h + 30);
      for (let k = 0; k < 6; k++) g.fillRect(x + hsh(x, k) * w, VH - 34 - h - hsh(k, x) * 14, 8, 14); // broken crenels
      g.fillStyle = '#0e0c1a'; g.beginPath(); g.moveTo(x + w * .3, VH - 30); g.lineTo(x + w * .3, VH - 30 - h * .6); g.arc(x + w * .5, VH - 30 - h * .6, w * .2, Math.PI, 0); g.lineTo(x + w * .7, VH - 30); g.fill();
      x += w + 20 + hsh(x, 9) * 60; } }
  else if (L.k === 'arches') { for (let k = 0; k < 4; k++) { const x = k * 192; g.fillStyle = '#141224'; g.fillRect(x, 0, 192, VH); g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.moveTo(x + 40, VH - 40); g.lineTo(x + 40, 100); g.arc(x + 96, 100, 56, Math.PI, 0); g.lineTo(x + 152, VH - 40); g.fill(); g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1c1930'; g.fillRect(x + 34, 96, 6, VH); g.fillRect(x + 152, 96, 6, VH); g.fillRect(x + 30, VH - 44, 132, 6); for (let y = 0; y < VH; y += 12) R(g, x + 4, y, 26, 1, '#100e1c'); } }
  else if (L.k === 'cryptfar') { g.fillStyle = '#0c0b14'; g.fillRect(0, 0, W, VH); // rows of burial niches with faint skulls
    for (let y = 40; y < VH - 40; y += 34) for (let x = (y / 34 % 2) * 24; x < W; x += 48) { g.fillStyle = '#16151f'; g.fillRect(x, y, 34, 24); g.fillStyle = '#07070c'; g.beginPath(); g.moveTo(x + 4, y + 22); g.lineTo(x + 4, y + 10); g.arc(x + 17, y + 10, 13, Math.PI, 0); g.lineTo(x + 30, y + 22); g.fill();
      if (hsh(x, y) > .5) { R(g, x + 13, y + 13, 8, 7, '#3a3a40'); R(g, x + 14, y + 15, 2, 2, '#07070c'); R(g, x + 18, y + 15, 2, 2, '#07070c'); } } }
  else if (L.k === 'bellfar') { g.fillStyle = '#1a0c16'; for (let k = 0; k < 2; k++) { const x = 140 + k * 384; g.fillRect(x - 4, 0, 8, 60); g.beginPath(); g.moveTo(x - 40, 160); g.quadraticCurveTo(x - 40, 60, x, 56); g.quadraticCurveTo(x + 40, 60, x + 40, 160); g.lineTo(x + 50, 172); g.lineTo(x - 50, 172); g.fill(); }
    g.fillStyle = '#140a12'; for (let x = 0; x < W; x += 64) { g.fillRect(x, 180, 10, VH); } g.fillRect(0, 176, W, 8); }
  return SCN.layerCache[key] = c;
}
// ---------- tiles per theme ----------
function buildTiles(th) {
  if (th.tiles) return th.tiles; const [b, l, d, hi] = th.stone, c = mk(T * 8, T), g = c.getContext('2d');
  for (let v = 0; v < 6; v++) { const ox = v * T; R(g, ox, 0, T, T, d);
    const rows = v < 4 ? 2 : 1; for (let r = 0; r < rows; r++) { const off = (r + v) % 2 ? 8 : 0, bh = T / rows;
      for (let bx = -8; bx < T; bx += v < 4 ? 8 : 16) { const x0 = Math.max(0, bx + off), x1 = Math.min(T, bx + off + (v < 4 ? 7 : 15)); if (x1 <= x0) continue;
        const col = hsh(v * 9 + bx, r) > .5 ? b : l; R(g, ox + x0, r * bh, x1 - x0, bh - 1, col); R(g, ox + x0, r * bh, x1 - x0, 1, hi); R(g, ox + x0, r * bh, 1, bh - 1, hi);
        R(g, ox + x1 - 1, r * bh + 1, 1, bh - 2, d); if (hsh(v, bx + r) > .7) R(g, ox + x0 + 2, r * bh + 3, 2, 1, d); } }
    if (v === 2) { R(g, ox + 5, 6, 1, 4, d); R(g, ox + 6, 9, 1, 3, d); }                       // crack
    if (v === 3) { R(g, ox + 2, 11, 4, 2, th.moss); R(g, ox + 10, 4, 3, 1, th.moss); } }   // moss
  // top cap (6) and platform (7)
  R(g, 6 * T, 0, T, T, d); R(g, 6 * T, 0, T, 5, hi); R(g, 6 * T, 1, T, 3, l); R(g, 6 * T, 5, T, 1, '#141220'); for (let x = 0; x < T; x += 8) { R(g, 6 * T + x + 1, 6, 6, 9, b); R(g, 6 * T + x + 1, 6, 6, 1, hi); }
  R(g, 6 * T + 3, 0, 4, 1, th.moss); R(g, 6 * T + 11, 0, 3, 1, th.moss);
  R(g, 7 * T, 0, T, 5, '#5a4636'); R(g, 7 * T, 0, T, 1, '#8a6c50'); R(g, 7 * T, 4, T, 1, '#2a2018'); R(g, 7 * T + 2, 5, 2, 6, '#3a2c22'); R(g, 7 * T + 12, 5, 2, 6, '#3a2c22'); R(g, 7 * T + 7, 1, 1, 3, '#3a2c22');
  return th.tiles = c;
}
// ---------- props (script pixel art). draw(c, x=center, y=bottom, o) ----------
const PROPS = {
  window: { h: 120, light: [0, -60, 70, 'cool'], shaft: true, draw(c, x, y, o, th) { // tall gothic stained-glass window
    const w = 44, top = y - 120; c.fillStyle = '#1a1828'; c.fillRect(x - w / 2 - 6, top - 6, w + 12, 126);
    c.fillStyle = '#0c0c1c'; c.beginPath(); c.moveTo(x - w / 2, y); c.lineTo(x - w / 2, top + 22); c.arc(x, top + 22, w / 2, Math.PI, 0); c.lineTo(x + w / 2, y); c.fill();
    const cols = ['#2a3a8a', '#3a5ab0', '#6a3a8a', '#8a2a4a', '#2a6a8a', '#c8a040'];
    for (let yy = top + 4; yy < y - 4; yy += 6) for (let xx = x - w / 2 + 2; xx < x + w / 2 - 2; xx += 6) { const dx = xx + 3 - x, dy = yy + 3 - (top + 22); if (yy < top + 22 && dx * dx + dy * dy > (w / 2 - 3) ** 2) continue; R(c, xx, yy, 5, 5, cols[(hsh(xx, yy) * cols.length) | 0]); }
    c.fillStyle = 'rgba(200,210,255,.18)'; c.beginPath(); c.arc(x, top + 26, 9, 0, 7); c.fill(); R(c, x - 1, top + 2, 2, 116, '#1a1828'); R(c, x - w / 2, top + 60, w, 2, '#1a1828');
    R(c, x - w / 2 - 8, y, w + 16, 5, th.stone[3]); R(c, x - w / 2 - 8, y + 4, w + 16, 1, '#100e1a'); } },
  rosewin: { h: 90, light: [0, -45, 80, 'cool'], draw(c, x, y, o, th) { const cy = y - 45; c.fillStyle = '#1a1626'; c.beginPath(); c.arc(x, cy, 44, 0, 7); c.fill();
    for (let r = 38; r > 4; r -= 6) for (let a = 0; a < 6.28; a += .4) R(c, x + Math.cos(a + r) * r - 2, cy + Math.sin(a + r) * r - 2, 4, 4, ['#8a2a4a', '#3a5ab0', '#c8a040', '#6a3a8a'][((r + a * 3) | 0) % 4]);
    for (let a = 0; a < 6.28; a += .785) { c.strokeStyle = '#1a1626'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, cy); c.lineTo(x + Math.cos(a) * 42, cy + Math.sin(a) * 42); c.stroke(); } c.fillStyle = '#d9b45a'; c.beginPath(); c.arc(x, cy, 5, 0, 7); c.fill(); } },
  candelabra: { h: 44, flames: [[-8, -42], [0, -46], [8, -42]], light: [0, -42, 80, 'warm'], draw(c, x, y) { R(c, x - 6, y - 3, 12, 3, '#5a4628'); R(c, x - 1, y - 40, 3, 38, '#7a6034'); R(c, x - 10, y - 36, 20, 2, '#7a6034');
    for (const dx of [-9, 0, 8]) { R(c, x + dx - 1, y - (dx ? 38 : 42) - 4, 3, 5, '#e8e0d0'); R(c, x + dx - 2, y - (dx ? 34 : 38), 5, 2, '#9a7a40'); } R(c, x - 3, y - 20, 6, 3, '#9a7a40'); } },
  sconce: { h: 30, flames: [[0, -26]], light: [0, -26, 64, 'warm'], draw(c, x, y) { R(c, x - 5, y - 8, 10, 8, '#4a3a2a'); R(c, x - 3, y - 20, 6, 12, '#5a4630'); R(c, x - 6, y - 22, 12, 3, '#7a6034'); R(c, x - 1, y - 24, 3, 3, '#e8e0d0'); } },
  banner: { h: 80, draw(c, x, y, o) { const top = y - 80; R(c, x - 16, top, 32, 3, '#5a4628'); c.fillStyle = o.col || '#3a1830'; c.beginPath(); c.moveTo(x - 13, top + 3); c.lineTo(x + 13, top + 3); c.lineTo(x + 13, y - 10); c.lineTo(x + 6, y - 2); c.lineTo(x + 2, y - 12); c.lineTo(x - 5, y - 4); c.lineTo(x - 13, y - 14); c.fill();
    R(c, x - 13, top + 6, 26, 1, '#d9b45a'); c.strokeStyle = '#d9b45a'; c.lineWidth = 2; c.beginPath(); c.arc(x, top + 30, 8, .9, 5.4); c.stroke(); R(c, x + 4, top + 22, 2, 2, '#d9b45a'); for (const [a, b] of [[-8, 50], [6, 56], [-2, 62]]) R(c, x + a, top + b, 1, 1, '#d9b45a'); } },
  chain: { h: 0, draw(c, x, y, o) { for (let yy = 32; yy < y; yy += 4) R(c, x + ((yy / 4) % 2 ? 0 : 1), yy, 2, 3, '#3a3446'); if (o.hook) { R(c, x - 2, y, 6, 2, '#3a3446'); R(c, x + 2, y + 2, 2, 4, '#3a3446'); } } },
  cage: { h: 40, draw(c, x, y) { for (let yy = 32; yy < y - 40; yy += 4) R(c, x, yy, 2, 3, '#3a3446'); c.strokeStyle = '#3a3446'; c.lineWidth = 2; for (let k = -12; k <= 12; k += 6) { c.beginPath(); c.moveTo(x + k * .5, y - 40); c.quadraticCurveTo(x + k * 1.3, y - 20, x + k, y); c.stroke(); } R(c, x - 13, y - 2, 26, 3, '#3a3446'); R(c, x - 4, y - 14, 8, 6, '#c8c0b0'); R(c, x - 2, y - 12, 2, 2, '#111'); } },
  statue: { h: 76, draw(c, x, y, o, th) { R(c, x - 14, y - 12, 28, 12, th.stone[1]); R(c, x - 14, y - 12, 28, 2, th.stone[3]); c.fillStyle = '#4a4658'; c.beginPath(); c.moveTo(x - 10, y - 12); c.lineTo(x - 7, y - 54); c.arc(x, y - 58, 8, Math.PI, 0); c.lineTo(x + 10, y - 12); c.fill();
    c.fillStyle = '#5a566a'; c.beginPath(); c.arc(x, y - 60, 7, 0, 7); c.fill(); R(c, x - 4, y - 48, 8, 10, '#5a566a'); c.fillStyle = '#3a3648'; c.beginPath(); c.moveTo(x - 7, y - 50); c.lineTo(x - 26, y - 70); c.lineTo(x - 18, y - 40); c.fill(); c.beginPath(); c.moveTo(x + 7, y - 50); c.lineTo(x + 26, y - 70); c.lineTo(x + 18, y - 40); c.fill();
    R(c, x - 5, y - 63, 10, 2, '#2a2638'); if (o.broken) { c.clearRect(x + 2, y - 70, 12, 10); } } },
  grave: { h: 26, draw(c, x, y, o, th) { c.fillStyle = th.stone[1]; c.beginPath(); c.moveTo(x - 9, y); c.lineTo(x - 9, y - 18); c.arc(x, y - 18, 9, Math.PI, 0); c.lineTo(x + 9, y); c.fill(); R(c, x - 9, y - 18, 1, 18, th.stone[3]); R(c, x - 1, y - 22, 2, 10, th.stone[2]); R(c, x - 4, y - 19, 8, 2, th.stone[2]); R(c, x - 10, y - 2, 20, 2, th.moss); } },
  deadtree: { h: 110, draw(c, x, y) { c.strokeStyle = '#141220'; c.lineCap = 'round'; const br = (x0, y0, a, l, w) => { if (l < 6) return; const x1 = x0 + Math.cos(a) * l, y1 = y0 + Math.sin(a) * l; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); br(x1, y1, a - .45 + hsh(x0 | 0, l | 0) * .2, l * .7, w * .65); br(x1, y1, a + .5, l * .62, w * .6); }; br(x, y, -1.57, 34, 7); } },
  rubble: { h: 10, draw(c, x, y, o, th) { for (let k = 0; k < 7; k++) { const w = 4 + hsh(x, k) * 8; R(c, x - 16 + hsh(k, x) * 28, y - 3 - hsh(x + k, 1) * 6, w, 4 + hsh(k, 3) * 3, k % 2 ? th.stone[1] : th.stone[0]); } } },
  coffin: { h: 18, draw(c, x, y) { c.fillStyle = '#2a1e1a'; c.beginPath(); c.moveTo(x - 20, y); c.lineTo(x - 24, y - 10); c.lineTo(x - 14, y - 18); c.lineTo(x + 22, y - 16); c.lineTo(x + 24, y); c.fill(); R(c, x - 14, y - 18, 36, 2, '#4a3a2a'); R(c, x - 2, y - 14, 2, 10, '#9a7a40'); R(c, x - 5, y - 11, 8, 2, '#9a7a40'); } },
  bones: { h: 8, draw(c, x, y) { for (let k = 0; k < 5; k++) { const bx = x - 12 + k * 6, a = hsh(x, k) * 3; c.save(); c.translate(bx, y - 2); c.rotate(a); R(c, -5, -1, 10, 2, '#c8c0a8'); R(c, -6, -2, 2, 4, '#c8c0a8'); R(c, 4, -2, 2, 4, '#c8c0a8'); c.restore(); } R(c, x + 6, y - 8, 8, 7, '#d8d0b8'); R(c, x + 7, y - 6, 2, 2, '#111'); R(c, x + 11, y - 6, 2, 2, '#111'); } },
  niche: { h: 40, light: [0, -16, 36, 'warm'], flames: [[-6, -10]], draw(c, x, y, o, th) { R(c, x - 16, y - 40, 32, 40, th.stone[2]); c.fillStyle = '#08070c'; c.beginPath(); c.moveTo(x - 12, y - 2); c.lineTo(x - 12, y - 26); c.arc(x, y - 26, 12, Math.PI, 0); c.lineTo(x + 12, y - 2); c.fill();
    R(c, x - 2, y - 14, 10, 9, '#d0c8b0'); R(c, x, y - 11, 2, 3, '#111'); R(c, x + 4, y - 11, 2, 3, '#111'); R(c, x + 1, y - 7, 5, 1, '#8a8270'); R(c, x - 7, y - 8, 2, 6, '#e8e0d0'); R(c, x - 16, y - 2, 32, 2, th.stone[3]); } },
  web: { h: 0, draw(c, x, y, o) { c.strokeStyle = 'rgba(200,200,220,.35)'; c.lineWidth = 1; const s = o.flip ? -1 : 1; for (let k = 0; k < 5; k++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + s * (30 - k * 6), y + k * 7); c.stroke(); } for (let r = 8; r < 30; r += 7) { c.beginPath(); c.arc(x, y, r, o.flip ? Math.PI / 2 : 0, o.flip ? Math.PI : Math.PI / 2); c.stroke(); } } },
  bigbell: { h: 100, draw(c, x, y) { R(c, x - 3, 32, 6, y - 132, '#2a2028'); c.fillStyle = '#6a5228'; c.beginPath(); c.moveTo(x - 46, y); c.quadraticCurveTo(x - 44, y - 96, x, y - 100); c.quadraticCurveTo(x + 44, y - 96, x + 46, y); c.fill();
    R(c, x - 50, y - 6, 100, 8, '#8a6c34'); R(c, x - 36, y - 60, 72, 3, '#9a7a40'); c.fillStyle = 'rgba(255,230,160,.18)'; c.fillRect(x - 30, y - 92, 10, 84); R(c, x - 6, y + 2, 12, 10, '#4a3a20'); } },
  pillar: { h: 0, draw(c, x, y, o, th) { R(c, x - 12, 32, 24, y - 32, th.stone[2]); R(c, x - 10, 32, 6, y - 32, th.stone[0]); R(c, x - 4, 32, 2, y - 32, th.stone[3]); R(c, x - 16, 32, 32, 8, th.stone[1]); R(c, x - 16, y - 10, 32, 10, th.stone[1]); R(c, x - 16, y - 10, 32, 1, th.stone[3]);
    for (let yy = 50; yy < y - 12; yy += 18) R(c, x - 12, yy, 24, 1, '#141220'); if (o.ivy) for (let yy = 40; yy < y - 20; yy += 3) R(c, x - 12 + Math.round(Math.sin(yy * .3) * 4) + 6, yy, 3, 2, th.moss); } },
  ivy: { h: 0, draw(c, x, y, o, th) { for (let yy = 32; yy < y; yy += 2) { R(c, x + Math.round(Math.sin(yy * .2 + x) * 3), yy, 2, 2, th.moss); if (hsh(x, yy) > .7) R(c, x + Math.round(Math.sin(yy * .2 + x) * 3) - 2, yy, 2, 2, '#4e7a50'); } } },
};
const PROP_FLAME_COL = ['#fff6d0', '#ffcf6a', '#ff9a3a'];
// ---------- room bake ----------
function bakeRoom(room) {
  const d = room.def, th = THEMES[d.theme || 'nave']; room.theme = th;
  const W = room.w, c = mk(W, VH), g = c.getContext('2d'), tiles = buildTiles(th), [b, l, dk, hi] = th.stone;
  // back wall: large blocks, cut arches show the parallax behind
  const wc = mk(W, VH), w = wc.getContext('2d'); w.fillStyle = dk; w.fillRect(0, 0, W, VH);
  for (let y = 32; y < VH; y += 24) for (let x = ((y / 24) % 2) * 20 - 20; x < W; x += 40) { w.fillStyle = hsh(x, y) > .5 ? '#1e1b2c' : '#221f32'; if (th.name === 'crypt') w.fillStyle = hsh(x, y) > .5 ? '#1a1c20' : '#1e2024'; if (th.name === 'belfry') w.fillStyle = hsh(x, y) > .5 ? '#22161e' : '#281a22'; w.fillRect(x + 1, y + 1, 38, 22); w.fillStyle = 'rgba(255,255,255,.03)'; w.fillRect(x + 1, y + 1, 38, 1); }
  w.globalCompositeOperation = 'destination-out'; w.fillStyle = '#000';
  const cut = th.wall === 'ruin' ? 'ruin' : th.wall === 'crypt' ? null : 'arch';
  if (cut === 'arch') for (let x = (d.archOff || 64); x < W - 40; x += (d.archGap || 176)) { w.beginPath(); w.moveTo(x, 236); w.lineTo(x, 110); w.arc(x + 36, 110, 36, Math.PI, 0); w.lineTo(x + 72, 236); w.fill(); }
  if (cut === 'ruin') { w.beginPath(); w.moveTo(0, 0); for (let x = 0; x <= W; x += 16) w.lineTo(x, 110 + Math.round(hsh(x >> 5, 3) * 3) * 16 + (hsh(x >> 4, 9) > .75 ? 50 : 0)); w.lineTo(W, 0); w.fill(); }
  w.globalCompositeOperation = 'source-over';
  if (cut === 'arch') for (let x = (d.archOff || 64); x < W - 40; x += (d.archGap || 176)) { w.strokeStyle = l; w.lineWidth = 4; w.beginPath(); w.moveTo(x - 1, 236); w.lineTo(x - 1, 110); w.arc(x + 36, 110, 37, Math.PI, 0); w.lineTo(x + 73, 236); w.stroke(); R(w, x + 34, 70, 4, 6, hi); }
  g.drawImage(wc, 0, 0);
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, 'rgba(5,3,12,.5)'); gr.addColorStop(.5, 'rgba(5,3,12,.05)'); gr.addColorStop(1, 'rgba(5,3,12,.35)'); g.fillStyle = gr; g.globalCompositeOperation = 'source-atop'; g.fillRect(0, 0, W, VH); g.globalCompositeOperation = 'source-over';
  // crown molding under the ceiling + wainscot above floors
  if (cut !== 'ruin') for (let x = 0; x < W; x += 16) { R(g, x, 32, 16, 4, l); R(g, x, 32, 16, 1, hi); R(g, x + 2, 36, 12, 3, b); R(g, x + 7, 39, 2, 3, dk); }
  for (let col = 0; col < d.w; col++) for (let r = 3; r < ROWS; r++) if (room.grid[r][col] === 1 && room.grid[r - 1][col] !== 1) { const y = r * T; R(g, col * T, y - 14, T, 14, dk); R(g, col * T, y - 14, T, 2, l); R(g, col * T + (col % 2 ? 2 : 10), y - 11, 4, 9, b); }
  // decor (background props)
  room.lights = []; room.flames = []; room.shafts = []; room.fgDecor = [];
  for (const [name, col, row, o = {}] of d.decor || []) { const P0 = PROPS[name]; if (!P0) continue; const x = col * T + 8, y = row * T;
    if (o.fg) { room.fgDecor.push([name, x, y, o]); continue; }
    g.save(); if (o.flip && name !== 'web') { g.translate(x * 2, 0); g.scale(-1, 1); } P0.draw(g, x, y, o, th); g.restore();
    if (P0.light && o.light !== 0) room.lights.push({ x: x + P0.light[0], y: y + P0.light[1], r: P0.light[2] * (o.light === 2 ? 1.4 : 1), [P0.light[3]]: 1 });
    for (const [fx, fy] of P0.flames || []) room.flames.push({ x: x + fx, y: y + fy, k: hsh(x, fx) * 6 });
    if (P0.shaft) room.shafts.push({ x: x - 20, y: y - 110, w: 40, h: 110 }); }
  // tiles with depth shading
  for (let r = 0; r < ROWS; r++) for (let col = 0; col < d.w; col++) { const t = room.grid[r][col], x = col * T, y = r * T; if (!t) continue;
    if (t === 2) { g.drawImage(tiles, 7 * T, 0, T, T, x, y, T, T); continue; }
    const top = r > 0 && room.grid[r - 1][col] !== 1, hv = hsh(col, r), v = hv < .35 ? 0 : hv < .6 ? 1 : hv < .72 ? 2 : hv < .82 ? 3 : hv < .92 ? 4 : 5;
    g.drawImage(tiles, (top ? 6 : v) * T, 0, T, T, x, y, T, T);
    let depth = 9; for (let k = 1; k <= 3; k++) for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) { const rr = r + dy, cc = col + dx; if (rr >= 0 && rr < ROWS && cc >= 0 && cc < d.w && room.grid[rr][cc] !== 1) depth = Math.min(depth, k); }
    if (depth >= 3) { g.fillStyle = 'rgba(8,6,16,.6)'; g.fillRect(x, y, T, T); } else if (depth === 2) { g.fillStyle = 'rgba(8,6,16,.3)'; g.fillRect(x, y, T, T); }
    g.fillStyle = 'rgba(6,4,12,.6)'; if (r + 1 < ROWS && room.grid[r + 1][col] !== 1) g.fillRect(x, y + T - 2, T, 2); if (col > 0 && room.grid[r][col - 1] !== 1) g.fillRect(x, y, 1, T); if (col + 1 < d.w && room.grid[r][col + 1] !== 1) g.fillRect(x + T - 1, y, 1, T);
    if (top && hsh(col, r + 50) > .7) { R(g, x + 3, y - 2, 2, 2, th.moss); R(g, x + 9, y - 1, 3, 1, th.moss); } }
  // hand-made image layers dropped in for this room (drawn into the bake when loaded)
  room.canvas = c; room.motes = []; for (let i = 0; i < 26; i++) room.motes.push({ x: hsh(i, 31) * W, y: 40 + hsh(i, 32) * 190, s: .3 + hsh(i, 33) * .7, p: hsh(i, 34) * 6 });
}
// ---------- per-frame drawing ----------
const FOG = (() => { const c = mk(256, 80), g = c.getContext('2d'); for (let i = 0; i < 40; i++) { const x = hsh(i, 1) * 256, y = 30 + hsh(i, 2) * 40, r = 14 + hsh(i, 3) * 26, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr;
  for (const ox of [-256, 0, 256]) g.fillRect(x - r + ox, y - r, r * 2, r * 2); } return c; })();
const FOGT = {}; function fogTex(col) { if (FOGT[col]) return FOGT[col]; const c = mk(256, 80), g = c.getContext('2d'); g.drawImage(FOG, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, 256, 80); return FOGT[col] = c; }
function drawLayers(g, room, cam) {
  const th = room.theme, layers = (room.def.layers || th.layers);
  for (const L of layers) { const sp = L.speed || 0;
    if (L.img) { const im = scnImg(L.img); if (!im) continue; g.globalAlpha = L.alpha || 1; const w = im.width; for (let x = -((cam * sp) % w); x < VW; x += w) g.drawImage(im, Math.round(x), L.y || 0); g.globalAlpha = 1; continue; }
    const c = buildLayer(th, L), off = Math.round((cam * sp) % 768); g.drawImage(c, -off, 0); g.drawImage(c, 768 - off, 0); }
  for (const L of room.def.imgLayers || []) { const im = scnImg(L.img); if (im) { g.globalAlpha = L.alpha || 1; g.drawImage(im, Math.round(-cam * (L.speed || 1)), L.y || 0); g.globalAlpha = 1; } }
}
function drawFlames(g, room, cam, t) { for (const f of room.flames) { const x = Math.round(f.x - cam), y = Math.round(f.y), k = Math.floor(t * 10 + f.k) % 3; if (x < -10 || x > VW + 10) continue;
  R(g, x - 1, y - 4 - k, 3, 5 + k, PROP_FLAME_COL[2]); R(g, x - 1, y - 3 - k, 2, 4 + k, PROP_FLAME_COL[1]); R(g, x, y - 2, 1, 2, PROP_FLAME_COL[0]); } }
const lightCv = mk(VW, VH), lcx = lightCv.getContext('2d');
function drawLighting(g, room, cam, extra, t) {
  const th = room.theme, d = room.def.dark !== undefined ? room.def.dark : th.dark, all = room.lights.concat(extra);
  lcx.globalCompositeOperation = 'source-over'; lcx.clearRect(0, 0, VW, VH); lcx.fillStyle = `rgba(6,4,18,${d})`; lcx.fillRect(0, 0, VW, VH); lcx.globalCompositeOperation = 'destination-out';
  for (const L of all) { const x = L.x - cam, y = L.y, r = L.r * (1 + Math.sin(t * 7 + L.x) * .04); if (x < -r || x > VW + r) continue;
    const gr = lcx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${L.s || .95})`); gr.addColorStop(.55, `rgba(0,0,0,${(L.s || .95) * .5})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); lcx.fillStyle = gr; lcx.fillRect(x - r, y - r, r * 2, r * 2); }
  g.drawImage(lightCv, 0, 0); g.globalCompositeOperation = 'lighter';
  for (const L of all) { if (!L.warm && !L.cool && !L.blue && !L.red) continue; const x = L.x - cam, y = L.y, r = L.r * .75; if (x < -r || x > VW + r) continue;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, L.warm ? 'rgba(255,150,60,.17)' : L.blue ? 'rgba(80,200,255,.18)' : L.red ? 'rgba(255,60,60,.2)' : 'rgba(110,130,255,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (const s of room.shafts) { const x = s.x - cam; if (x > VW || x + s.w + 80 < 0) continue; g.fillStyle = 'rgba(120,140,255,.07)'; g.beginPath(); g.moveTo(x, s.y); g.lineTo(x + s.w, s.y); g.lineTo(x + s.w + 70, s.y + s.h + 110); g.lineTo(x + 30, s.y + s.h + 110); g.closePath(); g.fill(); }
  // dust motes drifting in the light
  for (const m of room.motes) { const x = ((m.x + Math.sin(t * .5 + m.p) * 14 - cam * (1 - m.s * .2)) % room.w + room.w) % room.w - 0, sx = Math.round(x), sy = Math.round(m.y + Math.sin(t * .7 + m.p * 2) * 8); if (sx < 0 || sx > VW) continue; g.globalAlpha = .25 + .25 * Math.sin(t * 2 + m.p); R(g, sx, sy, 1, 1, th.mote); }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
function drawFog(g, room, cam, t) { const th = room.theme, [col, a] = room.def.fogCol || th.fog; if (!a) return; const tx = fogTex(col);
  for (const [sp, yo, al, dir] of [[.6, 0, 1, 1], [1.1, 14, .7, -1]]) { g.globalAlpha = a * al; const off = ((cam * sp + t * 8 * dir) % 256 + 256) % 256; for (let x = -off; x < VW; x += 256) g.drawImage(tx, Math.round(x), VH - 96 + yo); } g.globalAlpha = 1; }
function drawForeground(g, room, cam) { for (const [name, x, y, o] of room.fgDecor) { const sp = o.par || 1.25, sx = (x - cam * sp); if (sx < -80 || sx > VW + 80) continue;
  const near = Math.abs(sx - (P.x + P.w / 2 - cam)) < 34; g.save(); g.translate(Math.round(sx - x), 0); g.filter = 'brightness(.22)'; g.globalAlpha = near ? .35 : .92; PROPS[name].draw(g, x, y, o, room.theme); g.restore(); g.filter = 'none'; g.globalAlpha = 1; } }
