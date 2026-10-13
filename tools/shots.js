// gameplay screenshots -> screenshots/*.png   (node tools/shots.js)
const { chromium } = require('playwright'); const S = require('./serve.js'); const path = require('path');
(async () => { const ROOT = path.resolve(__dirname, '..'), srv = await S.start(ROOT), b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 768, height: 576 } });
  await p.goto(srv.url + 'index.html?test'); await p.evaluate(`window.installBot = ${require('./bot.js').toString()}`);
  const shot = n => p.screenshot({ path: path.join(ROOT, 'screenshots', n + '.png') });
  await p.evaluate(() => { G.t = 1.2; G.step(1); }); await shot('01_title');
  await p.evaluate(() => { G.startGame(); G.enterRoom(1, 'left'); const P = G.P; P.x = 230; G.step(30); G.enemies.forEach(e => e.cd = 0); G.areaT = 0; G.toasts = [];
    for (let i = 0; i < 300; i++) { const e = G.enemies[0]; if (e.state === 'windup' && e.st > .35) break; G.step(1); } });
  await shot('02_corridor_husk_telegraph');
  await p.evaluate(() => { const P = G.P, e = G.enemies[0]; for (let i = 0; i < 200 && !e.parried; i++) { if (e.state === 'windup' && e.atk.wu - e.st < .1 && P.state === 'free') G.press('parry'); G.step(1); G.release('parry'); }
    G.step(4); G.press('light'); G.step(1); G.release('light'); G.step(20); });
  await shot('03_parry_riposte');
  await p.evaluate(() => { G.enterRoom(2, 'left'); const P = G.P; P.x = 600; P.souls = 640; G.step(60); G.areaT = 0; G.toasts = []; for (let i = 0; i < 400 && !G.shots.length; i++) G.step(1); G.step(25); });
  await shot('04_crypt_acolyte_orb');
  await p.evaluate(() => { G.enterRoom(4, 'left'); installBot({ fight: true }); G.boss.hp = BOSS.hp * .45; G.boss.phase2 = true; G.boss.n = 3; G.toasts = [];
    for (let i = 0; i < 2000; i++) { G.step(1); if (G.shots.some(s => s.kind === 'pillar' && s.t > .6)) break; } G.bot = null; });
  await shot('05_boss_toll');
  await p.evaluate(() => { for (let i = 0; i < 400; i++) { G.step(1); if (G.boss.state === 'windup' && G.boss.atkId === 'cleave' && G.boss.st > .5) break; } });
  await shot('06_boss_cleave');
  await p.evaluate(() => { G.bot = null; G.boss = null; G.enterRoom(0); const P = G.P; P.x = 230; P.face = 1; G.areaT = 0; G.toasts = []; G.press('heavy'); G.step(1); G.release('heavy'); G.step(40); });
  await shot('07_court_heavy');
  await p.evaluate(() => { G.enterRoom(3, 'left'); G.enemies = []; const P = G.P; P.weapons = ['scythe', 'pan']; P.wi = 1; P.x = 300; P.y = 13 * 16 - 60; G.areaT = 0; G.toasts = []; G.step(30); G.press('heavy'); G.step(1); G.release('heavy'); G.step(34); });
  await shot('08_tower_pan_smash');
  await b.close(); srv.close(); })();
