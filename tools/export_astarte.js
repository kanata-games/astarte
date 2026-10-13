// Renders the script-drawn アスターテ sheets -> assets/astarte_<weapon>.png/.json + screenshots/alpha_astarte_sheet.png
const { chromium } = require('playwright'); const S = require('./serve.js'); const path = require('path'); const fs = require('fs');
(async () => { const ROOT = path.resolve(__dirname, '..'), srv = await S.start(ROOT), b = await chromium.launch(), p = await b.newPage();
  await p.goto(srv.url + 'index.html?test');
  const out = await p.evaluate(() => { const r = {}; for (const w of ['scythe', 'pan']) { const s = ASTA.build(w); r[w] = { png: s.canvas.toDataURL('image/png'), meta: s.meta }; }
    // contact sheet: both weapons, every animation row, frames at 2x, labelled
    const SC = 2, cw = AC_W, ch = AC_H, rows = ASTA.ORDER.length, W = 140 + 8 * cw * SC / 1.6, rowH = ch * SC / 1.6 + 6;
    const c = document.createElement('canvas'); c.width = Math.round(W * 2 + 20); c.height = Math.round(60 + rows * rowH); const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#15122a'); gr.addColorStop(1, '#0a0814'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.font = 'bold 22px serif'; g.fillStyle = '#ffe08a'; g.fillText('アスターテ  animation set  (scythe / frying pan)', 16, 34);
    ['scythe', 'pan'].forEach((w, wi) => { const s = ASTA.build(w), ox = wi * (W + 20);
      g.font = 'bold 15px serif'; g.fillStyle = '#d9b45a'; g.fillText(w === 'scythe' ? '星詠みの大鎌' : 'ミャオのフライパン', ox + 16, 54);
      ASTA.ORDER.forEach((n, r) => { const a = s.meta.anims[n], y = 60 + r * rowH; g.fillStyle = r % 2 ? 'rgba(255,255,255,.03)' : 'rgba(120,110,200,.06)'; g.fillRect(ox, y, W, rowH - 2);
        g.font = '13px monospace'; g.fillStyle = '#c8c4e8'; g.fillText(n + ' (' + a.n + ')', ox + 10, y + rowH / 2);
        for (let i = 0; i < a.n; i++) g.drawImage(s.canvas, i * cw, a.row * ch, cw, ch, ox + 130 + i * cw * SC / 1.6, y, cw * SC / 1.6, ch * SC / 1.6); }); });
    r.contact = c.toDataURL('image/png'); return r; });
  for (const w of ['scythe', 'pan']) { fs.writeFileSync(path.join(ROOT, 'assets', 'astarte_' + w + '.png'), Buffer.from(out[w].png.split(',')[1], 'base64')); fs.writeFileSync(path.join(ROOT, 'assets', 'astarte_' + w + '.json'), JSON.stringify(out[w].meta)); }
  fs.writeFileSync(path.join(ROOT, 'screenshots', 'alpha_astarte_sheet.png'), Buffer.from(out.contact.split(',')[1], 'base64'));
  console.log('exported'); await b.close(); srv.close(); })();
