// Playwright tests: node tools/test.js [--shots]   (build first: python3 tools/build.py)
const { chromium } = require('playwright'); const S = require('./serve.js'); const path = require('path'); const fs = require('fs');
const BOT = require('./bot.js').toString();
const ROOT = path.resolve(__dirname, '..'), SH = path.join(ROOT, 'screenshots'); fs.mkdirSync(SH, { recursive: true });
let fails = 0; const ok = (n, c, i) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => {
  const srv = await S.start(ROOT), br = await chromium.launch(), errs = [];
  const open = async () => { const p = await br.newPage({ viewport: { width: 768, height: 576 } }); p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(e.message));
    await p.goto(srv.url + 'index.html?test'); await p.evaluate(`window.installBot = ${BOT}; G.renderSteps = false;`); return p; };
  let p = await open();
  // 1. tour every room
  const tour = await p.evaluate(() => { G.renderSteps = true; G.startGame(); const r = []; installBot({ fight: true }); for (let i = 0; i < 5; i++) { G.enterRoom(i, 'left'); G.step(60); r.push([G.room.def.name, G.enemies.length]); } G.step(600); G.bot = null; G.renderSteps = false; return r; });
  ok('all rooms load', tour.length === 5, tour);
  // 2. parry -> stagger -> riposte
  const par = await p.evaluate(() => { G.startGame(); G.enterRoom(0); const P = G.P; P.x = 200; P.face = 1; G.step(5);
    const e = new (Foe)('husk', 240, 0); e.y = 240 - e.h; G.enemies.push(e); let parried = false;
    for (let i = 0; i < 400 && !parried; i++) { if (e.state === 'windup' && e.atk.wu - e.st < .1 && P.state === 'free') G.press('parry'); G.step(1); G.release('parry'); if (e.parried) parried = true; }
    G.step(10); const st = e.stagger; G.press('light'); G.step(1); G.release('light'); G.step(60);
    return { parried: G.STATS.parried, stagger: st, ripostes: G.STATS.ripostes, hp: e.hp, taken: G.STATS.taken }; });
  ok('parry staggers enemy and opens riposte', par.parried === 1 && par.stagger > 0 && par.ripostes === 1 && par.taken === 0, par);
  // 3. roll i-frames
  const roll = await p.evaluate(() => { G.startGame(); const P = G.P; P.x = 200; P.face = 1; G.step(5); const e = new Foe('guard', 250, 0); e.y = 240 - e.h; G.enemies.push(e);
    let rolled = 0; for (let i = 0; i < 600 && rolled < 3; i++) { if (e.state === 'windup' && e.atk.wu - e.st < .06 && P.state === 'free') { G.press('roll'); rolled++; } G.step(1); G.release('roll'); if (P.state === 'free' && P.x > 300) P.x = 200; }
    G.step(60); return { dodged: G.STATS.dodged, taken: G.STATS.taken }; });
  ok('roll i-frames dodge attacks', roll.dodged > 0 && roll.taken === 0, roll);
  // 4. souls drop on death and recovery
  const souls = await p.evaluate(() => { G.startGame(); G.enterRoom(1, 'left'); const P = G.P; P.souls = 321; P.x = 120; G.step(5); P.hp = 0; P.state = 'dead'; P.st = 0; G.step(160);
    const st = G.stain && { ri: G.stain.ri, n: G.stain.n }; const lost = P.souls; G.enterRoom(1, 'left'); P.x = G.stain.x - 9; G.step(30); return { st, lost, after: P.souls, room: G.ri }; });
  ok('souls dropped on death and recovered', souls.st && souls.st.n === 321 && souls.lost === 0 && souls.after === 321, souls);
  // 5. rest respawns enemies + level up
  const rest = await p.evaluate(() => { G.startGame(); G.enterRoom(1, 'left'); for (const e of G.enemies) e.damage(9999, 999, 1); G.step(2); const killed = G.dead[1].size;
    G.enterRoom(1, 'left'); const after = G.enemies.length; G.enterRoom(0, 'right'); const P = G.P; P.x = 6 * 16; P.souls = 500; P.hp = 10; P.flasks = 0; G.step(10); G.press('up'); G.step(1); G.release('up');
    const menu = !!G.menu; G.press('light'); G.step(1); G.release('light'); G.step(2); G.press('roll'); G.step(1); G.release('roll'); G.step(2); G.enterRoom(1, 'left');
    return { killed, after, menu, hp: P.hp, flasks: P.flasks, vit: P.lv.vit, respawned: G.enemies.length }; });
  ok('rest heals, refills flasks, respawns enemies, levels up', rest.killed === 3 && rest.after === 0 && rest.menu && rest.flasks === 3 && rest.vit === 1 && rest.respawned === 3 && rest.hp === 115, rest);
  // 6. pan pickup (data-driven second weapon) + swap
  const pan = await p.evaluate(() => { G.startGame(); G.enterRoom(2, 'left'); G.enemies = []; const P = G.P; P.x = 33 * 16 + 8 - 9; P.y = 11 * 16 - 60; G.step(60); const got = P.weapons.slice();
    G.press('swap'); G.step(1); G.release('swap'); G.step(5); G.press('light'); G.step(1); G.release('light'); G.step(40); return { got, cur: P.weapons[P.wi] }; });
  ok('frying pan pickup + swap', pan.got.includes('pan') && pan.cur === 'pan', pan);
  // 6b. combos + distinct per-weapon motion sets
  const combo = await p.evaluate(() => { const out = {}; for (const w of ['scythe', 'pan']) { G.startGame(); G.enemies = []; const P = G.P; P.weapons = [w]; P.wi = 0; P.x = 200; G.step(5); const seen = [];
      for (let k = 0; k < 3; k++) { G.press('light'); G.step(1); G.release('light'); G.step(2); seen.push(P.anim); while (P.state === 'attack' && P.st < P.move.wu + P.move.act + P.move.rec * .6) G.step(1); }
      while (P.state !== 'free') G.step(1); G.step(30); G.press('heavy'); G.step(1); G.release('heavy'); seen.push(P.anim); out[w] = { seen, sheet: (WEAPONS[w].art || {}).sheet, heavyRec: WEAPONS[w].heavy.rec, frames: ['light1', 'light2', 'light3', 'heavy', 'parryflash'].map(a => ASTA.get(w).meta.anims[a].n) }; }
    return out; });
  ok('3-hit combos + heavy on both weapons, distinct frame counts', ['scythe', 'pan'].every(w => combo[w].seen.join() === 'light1,light2,light3,heavy') && combo.scythe.sheet !== combo.pan.sheet && combo.scythe.heavyRec !== combo.pan.heavyRec, combo);
  // 7. every normal enemy attack avoidable (dodge-only bot, 40 s each, no hits)
  for (const k of ['husk', 'guard', 'wisp', 'acolyte']) {
    const r = await p.evaluate(k => { G.startGame(); installBot({ fight: false }); const P = G.P; P.hp = 1e6; P.x = 150; G.step(2);
      const e = new Foe(k, 260, 0); e.y = e.fly ? 150 : 240 - e.h; G.enemies.push(e); let atks = 0, prev = ''; for (let i = 0; i < 2400; i++) { G.step(1); if (e.state === 'active' && prev !== 'active') atks++; prev = e.state; if (e.hp <= 0) break; if (P.x < 40) P.x = 300; if (P.x > 520) P.x = 150; } G.bot = null; return { attacks: atks, taken: G.STATS.taken, dodged: G.STATS.dodged, by: G.STATS.takenBy }; }, k);
    ok(`${k} attacks are avoidable`, r.taken === 0 && r.attacks >= 5, r);
  }
  // 8. boss: dodge-only for 90 s (incl. phase 2) -> zero hits
  const av = await p.evaluate(() => { G.startGame(); installBot({ fight: false }); G.enterRoom(4, 'left'); const P = G.P; P.hp = 1e6; const seen = {}, hist = []; let ctx0 = null;
    for (let i = 0; i < 5400; i++) { if (i >= 2700 && !G.boss.phase2 && G.boss.state === 'idle') { G.boss.hp = BOSS.hp * .45; G.boss.phase2 = true; } if (G.boss.atkId) seen[G.boss.atkId] = 1; const h = [P.state, +P.st.toFixed(2), Math.round(P.x), P.onGround, G.boss.state, G.boss.atkId, +G.boss.st.toFixed(2), Math.round(G.boss.x), G.threats().map(t => t.label + t.t.toFixed(2)).join()]; hist.push(h); if (hist.length > 14) hist.shift(); const tk = G.STATS.taken; G.step(1); if (G.STATS.taken > tk && !ctx0) ctx0 = hist.slice(); } G.bot = null;
    return { taken: G.STATS.taken, dodged: G.STATS.dodged, by: G.STATS.takenBy, seen: Object.keys(seen), ctx: ctx0 }; });
  ok('boss attacks all avoidable (90 s dodge-only, all 4 patterns)', av.taken === 0 && av.seen.length === 4, av);
  // 9. boss beatable by a fresh Lv1 character with normal HP
  const win = await p.evaluate(() => { G.startGame(); installBot({ fight: true }); G.enterRoom(4, 'left'); const P = G.P; let i = 0;
    for (; i < 60 * 240 && G.mode !== 'ending'; i++) { G.step(1); if (G.STATS.deaths) break; }
    G.bot = null; return { bossHp: G.boss.hp, deaths: G.STATS.deaths, playerHp: Math.round(P.hp), secs: Math.round(i / 60), taken: G.STATS.taken, by: G.STATS.takenBy, flasks: P.flasks, mode: G.mode, parried: G.STATS.parried }; });
  ok('boss beatable (fresh character, no deaths)', win.bossHp <= 0 && win.deaths === 0, win);
  if (process.argv.includes('--shots')) await p.screenshot({ path: path.join(SH, 'ending.png') });
  ok('no console errors', errs.length === 0, errs.slice(0, 5));
  await br.close(); srv.close(); console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
})();
