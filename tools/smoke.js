const { chromium } = require('playwright'); const S = require('./serve.js'); const path = require('path');
(async () => { const srv = await S.start(path.resolve(__dirname, '..')); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 768, height: 576 } });
  const errs = []; p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
  await p.goto(srv.url + 'index.html?test'); await p.screenshot({ path: 'screenshots/s_title.png' });
  await p.evaluate(() => { G.startGame(); G.step(30); }); await p.screenshot({ path: 'screenshots/s_room0.png' });
  await p.evaluate(() => { G.enterRoom(1); G.P.x = 200; G.press('right'); G.step(90); G.release('right'); G.step(20); }); await p.screenshot({ path: 'screenshots/s_room1.png' });
  await p.evaluate(() => { G.enterRoom(4, 'left'); G.step(150); }); await p.screenshot({ path: 'screenshots/s_boss.png' });
  console.log(JSON.stringify(errs)); await b.close(); srv.close(); })();
