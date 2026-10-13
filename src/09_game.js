// ===== game state, rooms, rest, souls, render, loop =====
const G = { mode: 'title', t: 0, room: null, ri: 0, enemies: [], boss: null, shots: [], fx: [], cam: 0, shake: 0, flash: 0, hitstop: 0, toasts: [],
  dead: {}, stain: null, check: { ri: 0, x: 6 }, lit: { 0: true }, bossDown: false, menu: null, endT: 0, pickups: {}, bot: null, areaT: 0 };
G.foes = () => G.boss && G.boss.hp > 0 ? G.enemies.concat([G.boss]) : G.enemies;
G.toast = (s, d = 2.2) => { G.toasts.push({ s, t: d }); };
function fx(kind, x, y) {
  const col = { hit: '#ffffff', crit: '#ffe08a', blood: '#c03050', parry: '#bfe0ff', death: '#9a90c8', heal: '#ffcf6a', souls: '#a8f0ff' }[kind] || '#fff';
  const n = kind === 'crit' || kind === 'death' ? 22 : kind === 'parry' ? 16 : 8;
  for (let i = 0; i < n; i++) { const a = rnd() * 6.28, s = 30 + rnd() * (kind === 'parry' ? 160 : 100); G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, life: .3 + rnd() * .4, col, sz: kind === 'crit' ? 3 : 2 }); }
  if (kind === 'parry') G.fx.push({ ring: 1, x, y, life: .3, col });
}
G.gainSouls = (n, x, y) => { P.souls += n; SFX.souls(); for (let i = 0; i < 10; i++) G.fx.push({ x, y, vx: (rnd() - .5) * 60, vy: -40 - rnd() * 60, life: .8, col: '#a8f0ff', sz: 2, home: 1 }); };
function enterRoom(ri, side) {
  G.ri = ri; G.room = buildRoom(ri); G.shots = []; const d = G.room.def;
  G.enemies = d.spawns.map((s, i) => { if ((G.dead[ri] || new Set()).has(i)) return null; const e = new Foe(s.k, s.x * T, 0); e.si = i;
    e.y = s.row ? s.row * T : floorY(G.room, s.x) - e.h; e.hy = e.y; return e; }).filter(Boolean);
  G.boss = null;
  if (d.boss !== undefined && !G.bossDown) { G.boss = new Boss(d.boss * T, floorY(G.room, d.boss) - BOSS.h); for (let y = 0; y < ROWS; y++) G.room.grid[y][0] = 1; G.toast(BOSS.name, 2.5); }
  if (side === 'left') { P.x = 20; } else if (side === 'right') { P.x = G.room.w - 40; }
  const tx = clamp(Math.floor((P.x + P.w / 2) / T), 0, d.w - 1); P.y = floorY(G.room, tx) - P.h - 1; P.vy = 0;
  G.areaT = 2.4; G.cam = clamp(P.x - VW / 2, 0, G.room.w - VW);
}
function restAt() {
  P.hp = pMaxHp(); P.stam = pMaxStam(); P.flasks = MAXFLASK; G.dead = {}; G.check = { ri: G.ri, x: G.room.def.bonfire }; G.lit[G.ri] = true;
  P.state = 'rest'; P.st = 0; G.menu = { sel: 0 }; const x = P.x; enterRoom(G.ri); P.x = x; P.state = 'rest'; SFX.heal();
}
G.onDeath = () => {
  if (P.souls > 0) G.stain = { ri: G.ri, x: P.x + P.w / 2, y: P.y + P.h, n: P.souls }; else G.stain = null;
  P.souls = 0; P.hp = pMaxHp(); P.stam = pMaxStam(); P.flasks = MAXFLASK; P.state = 'free'; P.iframe = 1; G.dead = {};
  P.x = G.check.x * T; enterRoom(G.check.ri); G.toast('星の灯火で目を覚ました');
};
G.bossDefeated = b => { G.bossDown = true; G.gainSouls(BOSS.souls, b.x + b.w / 2, b.y + 30); SFX.bell(); G.endT = 0; G.toast('弔鐘、止む', 4); };
const MENU = [{ k: 'vit', n: '生命力 (HP)' }, { k: 'end', n: '持久力 (スタミナ)' }, { k: 'str', n: '筋力 (攻撃力)' }, { k: 'x', n: '立ち上がる' }];
const plv = () => P.lv.vit + P.lv.end + P.lv.str;
function updateMenu() {
  const m = G.menu;
  if (pressed('up')) m.sel = (m.sel + MENU.length - 1) % MENU.length;
  if (pressed('down')) m.sel = (m.sel + 1) % MENU.length;
  if (pressed('roll') || pressed('start')) { G.menu = null; P.state = 'free'; return; }
  if (pressed('light') || pressed('jump')) { const it = MENU[m.sel];
    if (it.k === 'x') { G.menu = null; P.state = 'free'; return; }
    const c = LEVEL_COST(plv()); if (P.souls >= c) { P.souls -= c; P.lv[it.k]++; P.hp = pMaxHp(); P.stam = pMaxStam(); SFX.souls(); } else G.toast('ソウルが足りない', 1.2); }
}
function update(dt) {
  G.t += dt; tickInput(dt);
  for (const q of G.toasts) q.t -= dt; G.toasts = G.toasts.filter(q => q.t > 0);
  if (G.mode === 'title') { if (pressed('start') || pressed('light') || pressed('jump')) startGame(); return; }
  if (G.mode === 'ending') { G.endT += dt; if (G.endT > 3 && (pressed('start') || pressed('light'))) { G.mode = 'title'; } return; }
  if (G.mode === 'pause') { if (pressed('start') || pressed('roll')) G.mode = 'play'; return; }
  if (G.bot) G.bot(dt);
  if (pressed('start') && !G.menu) { G.mode = 'pause'; return; }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  if (G.menu) { updateMenu(); P.t += dt; return; }
  const d = G.room.def;
  // interact: rest at the lantern
  if (d.bonfire !== undefined && P.state === 'free' && Math.abs(P.x + P.w / 2 - (d.bonfire * T + 8)) < 28 && P.onGround && pressed('up')) restAt();
  updatePlayer(dt);
  for (const e of G.enemies) { const was = e.hp; e.update(dt); if (was > 0 && e.hp <= 0) { (G.dead[G.ri] = G.dead[G.ri] || new Set()).add(e.si); } }
  if (G.boss) G.boss.update(dt);
  updateShots(dt);
  // souls stain recovery
  if (G.stain && G.stain.ri === G.ri && Math.abs(P.x + P.w / 2 - G.stain.x) < 18 && Math.abs(P.y + P.h - G.stain.y) < 40) { P.souls += G.stain.n; G.toast('ソウルを取り戻した (+' + G.stain.n + ')'); SFX.souls(); G.stain = null; }
  // pickup
  if (d.pickup && !G.pickups[G.ri]) { const px = d.pickup.x * T + 8, py = d.pickup.row * T; if (Math.abs(P.x + P.w / 2 - px) < 18 && Math.abs(P.y + P.h - py) < 24) { G.pickups[G.ri] = 1; P.weapons.push(d.pickup.w); G.toast(WEAPONS[d.pickup.w].name + ' を拾った！ (換/Qで持ち替え)', 3.2); SFX.souls(); } }
  // room transitions
  if (P.state !== 'dead') { if (P.x + P.w / 2 < 0 && d.exits.left !== undefined) enterRoom(d.exits.left, 'right'); else if (P.x + P.w / 2 > G.room.w && d.exits.right !== undefined) enterRoom(d.exits.right, 'left'); }
  if (G.bossDown && G.boss && G.boss.hp <= 0) { G.endT += dt; if (G.endT > 4.5) { G.mode = 'ending'; G.endT = 0; } }
  for (const f of G.fx) { f.life -= dt; if (!f.ring) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 200 * dt; if (f.home) { f.x = lerp(f.x, P.x + P.w / 2, .06); f.y = lerp(f.y, P.y + 20, .06); } } }
  G.fx = G.fx.filter(f => f.life > 0);
  G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt); G.areaT -= dt;
  G.cam = lerp(G.cam, clamp(P.x + P.w / 2 - VW / 2 + P.face * 30, 0, G.room.w - VW), .12);
}
function startGame() { G.mode = 'play'; G.dead = {}; G.bossDown = false; G.stain = null; G.pickups = {}; G.lit = { 0: true }; G.check = { ri: 0, x: 6 };
  Object.assign(P, { hp: 100, stam: 100, flasks: MAXFLASK, souls: 0, lv: { vit: 0, end: 0, str: 0 }, weapons: ['scythe'], wi: 0, state: 'free', face: 1, x: 3 * T, iframe: 0 });
  for (const k in STATS) STATS[k] = k === 'takenBy' ? {} : 0; enterRoom(0); G.toast('↑ で星の灯火に触れて休息', 3); }

// ---------- render ----------
function drawRoom(g) {
  const r = G.room, cam = Math.round(G.cam), x0 = Math.floor(cam / T), x1 = Math.min(r.def.w - 1, x0 + VW / T + 1);
  for (let y = 0; y < ROWS; y++) for (let x = x0; x <= x1; x++) { const t = r.grid[y][x]; if (!t) continue;
    if (t === 2) g.drawImage(TILESET, 3 * T, 0, T, T, x * T - cam, y * T, T, T);
    else { const v = (x * 7 + y * 13) % 5 === 0 ? 2 : (x + y) % 2; g.drawImage(TILESET, v * T, 0, T, T, x * T - cam, y * T, T, T);
      if (y > 0 && r.grid[y - 1][x] !== 1) { R(g, x * T - cam, y * T, T, 2, '#5a546e'); if ((x * 3) % 7 === 0) R(g, x * T - cam + 4, y * T - 3, 2, 3, '#3a4a3a'); } } }
}
function render() {
  const g = ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if (G.mode === 'title') return drawTitle(g);
  if (G.mode === 'ending') return drawEnding(g);
  const sh = G.shake > 0 ? (rnd() - .5) * 6 * G.shake / .3 : 0; g.translate(Math.round(sh), 0);
  const cam = Math.round(G.cam);
  g.drawImage(BG, -((cam * .25) % 768), 0); g.drawImage(BG, 768 - ((cam * .25) % 768), 0);
  g.drawImage(BG2, -((cam * .55) % 512), 0); g.drawImage(BG2, 512 - ((cam * .55) % 512), 0);
  // candles
  for (let x = 96; x < G.room.w; x += 224) { const cx = x - cam; if (cx < -20 || cx > VW + 20) continue; const fy = floorY(G.room, Math.floor(x / T)); R(g, cx, fy - 22, 3, 22, '#4a3a30'); R(g, cx - 2, fy - 24, 7, 3, '#6a5030'); R(g, cx, fy - 30 + Math.round(Math.sin(G.t * 8 + x)), 3, 5, '#ffcf6a');
    g.globalAlpha = .1; g.fillStyle = '#ffb040'; g.beginPath(); g.arc(cx + 1, fy - 28, 20, 0, 7); g.fill(); g.globalAlpha = 1; }
  drawRoom(g);
  const d = G.room.def;
  if (d.bonfire !== undefined) { drawBonfire(g, d.bonfire * T + 8 - cam, floorY(G.room, d.bonfire), G.t, !!G.lit[G.ri] || true);
    if (Math.abs(P.x + P.w / 2 - (d.bonfire * T + 8)) < 28 && !G.menu) txt(g, '▲ 休息する', d.bonfire * T + 8 - cam, floorY(G.room, d.bonfire) - 60, '#ffe8a8', 10, 'center'); }
  if (d.fog && !G.bossDown) { g.globalAlpha = .45 + .1 * Math.sin(G.t * 2); R(g, G.room.w - 18 - cam, 32, 18, floorY(G.room, d.w - 1) - 32, '#d8d8ff'); g.globalAlpha = 1; }
  if (d.pickup && !G.pickups[G.ri]) { const px = d.pickup.x * T + 8 - cam, py = d.pickup.row * T - 8; g.globalAlpha = .5 + .4 * Math.sin(G.t * 5); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (G.stain && G.stain.ri === G.ri) { const sx = G.stain.x - cam; g.globalAlpha = .6 + .3 * Math.sin(G.t * 4); g.fillStyle = '#7af0e0'; g.beginPath(); g.ellipse(sx, G.stain.y - 3, 10, 4, 0, 0, 7); g.fill(); R(g, sx - 1, G.stain.y - 18 - Math.round(Math.sin(G.t * 3) * 3), 3, 8, '#c8fff4'); g.globalAlpha = 1; }
  g.save(); g.translate(-cam, 0);
  for (const s of G.shots) {
    if (s.kind === 'pillar') { if (s.t < s.warn) { g.globalAlpha = .25 + .25 * Math.sin(s.t * 20); R(g, s.x, 236, s.w, 4, '#ff5a3a'); R(g, s.x + s.w / 2 - 1, 40, 2, 196, '#ff5a3a'); g.globalAlpha = 1; } else { R(g, s.x, s.y, s.w, s.h, '#ffeec0'); R(g, s.x + 6, s.y, s.w - 12, s.h, '#fff'); } }
    else if (s.kind === 'wave') { R(g, s.x, s.y + 6, s.w, s.h - 6, '#8a90b8'); R(g, s.x + 3, s.y, s.w - 6, 8, '#c8ccf0'); }
    else { g.fillStyle = '#d070ff'; g.beginPath(); g.arc(s.x + 5, s.y + 5, 6, 0, 7); g.fill(); R(g, s.x + 3, s.y + 3, 4, 4, '#fff0ff'); }
  }
  for (const e of G.enemies) if (e.hp > 0) { if (e.flash > 0) g.filter = 'brightness(3)'; drawEnemy(g, e); g.filter = 'none';
    if (e.state === 'windup') txt(g, '!', e.x + e.w / 2, e.y - 6, e.atk.parry ? '#ffffff' : '#ff4a3a', 14, 'center');
    if (e.stagger > 0 && e.parried) txt(g, '致命', e.x + e.w / 2, e.y - 6, '#ffe08a', 10, 'center');
    if (e.hp < e.d.hp) { R(g, e.x, e.y - 14, e.w, 3, '#200'); R(g, e.x, e.y - 14, e.w * e.hp / e.d.hp, 3, '#c03050'); } }
  if (G.boss && (G.boss.hp > 0 || G.endT < 1.5)) { const b = G.boss; if (b.flash > 0) g.filter = 'brightness(2.5)'; if (b.hp <= 0) g.globalAlpha = Math.max(0, 1 - G.endT); drawBoss(g, b); g.filter = 'none'; g.globalAlpha = 1;
    if (b.stagger > 0 && b.parried) txt(g, '致命', b.x + b.w / 2, b.y - 30, '#ffe08a', 11, 'center'); }
  const pp = playerPose(); if (P.state === 'hurt' && P.st < .1) g.filter = 'brightness(2.5)'; if (P.iframe > 0 && P.state !== 'roll' && P.state !== 'riposte' && (G.t * 20 | 0) % 2) g.globalAlpha = .6;
  drawAstarte(g, P.x + P.w / 2, P.y + P.h, P.face, pp, P.weapons[P.wi]); g.filter = 'none'; g.globalAlpha = 1;
  if (P.state === 'attack' && P.st >= P.move.wu && P.st < P.move.wu + P.move.act + .05) drawTrail(g, P.x + P.w / 2, P.y + P.h - P.move.h / 2 - 4, P.face, -1.3, 1.1, P.move.range * .8, P.moveKind === 'heavy' ? '#8ab0ff' : '#c8d8ff');
  for (const f of G.fx) { if (f.ring) { g.strokeStyle = f.col; g.lineWidth = 2; g.globalAlpha = f.life / .3; g.beginPath(); g.arc(f.x, f.y, (.3 - f.life) * 120, 0, 7); g.stroke(); g.globalAlpha = 1; } else R(g, f.x, f.y, f.sz, f.sz, f.col); }
  g.restore();
  // vignette
  const vg = g.createRadialGradient(VW / 2, VH / 2, 120, VW / 2, VH / 2, 260); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.55)'); g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  if (G.flash > 0) { g.globalAlpha = G.flash * 3; R(g, 0, 0, VW, VH, '#fff'); g.globalAlpha = 1; }
  g.setTransform(1, 0, 0, 1, 0, 0); drawHUD(g);
}
function txt(g, s, x, y, c, size = 10, al = 'left') { g.font = `bold ${size}px "Hiragino Mincho ProN","Yu Mincho",serif`; g.textAlign = al; g.fillStyle = '#000'; g.fillText(s, x + 1, y + 1); g.fillStyle = c; g.fillText(s, x, y); }
function bar(g, x, y, w, h, f, c, bg) { R(g, x - 1, y - 1, w + 2, h + 2, '#000'); R(g, x, y, w, h, bg || '#2a1a24'); R(g, x, y, Math.max(0, w * f), h, c); R(g, x, y, Math.max(0, w * f), 1, 'rgba(255,255,255,.35)'); }
function drawHUD(g) {
  bar(g, 10, 10, pMaxHp() * 1.1, 6, P.hp / pMaxHp(), '#c03050'); bar(g, 10, 20, pMaxStam() * 1.1, 4, P.stam / pMaxStam(), '#4ab07a', '#1a2a20');
  for (let i = 0; i < MAXFLASK; i++) { const on = i < P.flasks; R(g, 10 + i * 11, 30, 7, 9, on ? '#e8a040' : '#3a3040'); R(g, 12 + i * 11, 28, 3, 2, on ? '#fff2c0' : '#555'); }
  txt(g, weapon().name, 46, 38, '#c8c4e8', 9);
  txt(g, '✦ ' + P.souls, VW - 10, VH - 10, '#bff4ff', 12, 'right');
  if (G.boss && G.boss.hp > 0 && G.boss.state !== 'intro') { txt(g, BOSS.name, 60, VH - 26, '#e8e0d0', 10); bar(g, 60, VH - 20, VW - 120, 6, G.boss.hp / BOSS.hp, '#a83040'); }
  if (G.areaT > 0) { g.globalAlpha = Math.min(1, G.areaT); txt(g, G.room.def.name, VW / 2, 74, '#e8e0ff', 16, 'center'); R(g, VW / 2 - 80, 80, 160, 1, '#8a80b0'); g.globalAlpha = 1; }
  G.toasts.forEach((q, i) => { g.globalAlpha = Math.min(1, q.t); R(g, 0, 110 + i * 20, VW, 18, 'rgba(0,0,0,.5)'); txt(g, q.s, VW / 2, 123 + i * 20, '#f0e8c8', 11, 'center'); g.globalAlpha = 1; });
  if (P.state === 'dead') { g.globalAlpha = Math.min(1, P.st); R(g, 0, VH / 2 - 24, VW, 40, 'rgba(0,0,0,.7)'); txt(g, '星 は 堕 ち た', VW / 2, VH / 2 + 4, '#c03050', 22, 'center'); g.globalAlpha = 1; }
  if (G.bossDown && G.mode === 'play' && G.endT > .5) { g.globalAlpha = Math.min(1, G.endT - .5); R(g, 0, VH / 2 - 24, VW, 40, 'rgba(0,0,0,.6)'); txt(g, '弔 鐘 、止 む', VW / 2, VH / 2 + 4, '#ffe08a', 22, 'center'); g.globalAlpha = 1; }
  if (G.menu) { R(g, VW / 2 - 100, 60, 200, 140, 'rgba(10,8,24,.88)'); R(g, VW / 2 - 100, 60, 200, 1, PAL.gold);
    txt(g, '星の灯火 ― 休息', VW / 2, 80, '#ffe8a8', 12, 'center'); txt(g, `Lv ${plv() + 1}　必要ソウル ${LEVEL_COST(plv())}`, VW / 2, 98, '#bff4ff', 9, 'center');
    MENU.forEach((m, i) => { const v = m.k === 'x' ? '' : ' ' + P.lv[m.k]; txt(g, (G.menu.sel === i ? '▶ ' : '　') + m.n + v, VW / 2 - 80, 120 + i * 18, G.menu.sel === i ? '#fff' : '#9a94c0', 11); }); }
  if (G.mode === 'pause') { R(g, 0, 0, VW, VH, 'rgba(0,0,0,.7)'); const L = ['― 操作 ―', '移動: ←→ / A D　　休息: ↑ / W / E', 'ジャンプ: Space / K　（↓+ジャンプで足場を降りる）', '軽攻撃: Z / J　　重攻撃: X / U', 'ローリング: C / L / Shift （無敵時間あり）', 'パリィ: V / I　（白く光る攻撃を弾く → 軽攻撃で致命）', 'エスト(薬): F / R　　武器持ち替え: Q', '赤く光る攻撃はパリィ不可。避けよう。', '', 'Enter / Esc で戻る'];
    L.forEach((s, i) => txt(g, s, VW / 2, 50 + i * 20, i ? '#e0dcf0' : '#ffe08a', 11, 'center')); }
}
function drawTitle(g) {
  g.drawImage(BG, -(G.t * 6 % 768), 0); g.drawImage(BG, 768 - (G.t * 6 % 768), 0); R(g, 0, 0, VW, VH, 'rgba(5,4,14,.45)');
  g.save(); g.translate(VW / 2 + 90, 236); g.scale(2, 2); drawAstarte(g, 0, 0, -1, { k: 'idle', t: G.t }, 'scythe'); g.restore();
  txt(g, 'ASTARTE', 30, 92, '#e8e4ff', 34); txt(g, 'アスターテ ―月鐘の廃墟―', 32, 116, '#d9b45a', 14); R(g, 32, 124, 180, 1, '#d9b45a');
  if ((G.t * 2 | 0) % 2) txt(g, 'PRESS START / タップで開始', 32, 170, '#ffffff', 11);
  txt(g, '試作版 prototype', 32, 188, '#8a84b0', 9);
  txt(g, '清掃員工房 / カナタゲームズ', 32, VH - 18, '#a8a2d0', 10);
}
function drawEnding(g) {
  R(g, 0, 0, VW, VH, '#05040c'); const a = Math.min(1, G.endT / 1.5); g.globalAlpha = a;
  for (let i = 0; i < 40; i++) R(g, (i * 97) % VW, (i * 61 + G.t * 6) % VH, 1, 1, '#6a68a0');
  txt(g, '弔鐘は鳴り止み、月の廃墟に静寂が戻った。', VW / 2, 70, '#e8e0ff', 12, 'center');
  txt(g, 'アスターテは鎌を担ぎ、さらに奥の闇へ――', VW / 2, 92, '#c8c0e8', 11, 'center');
  txt(g, 'THANK YOU FOR PLAYING', VW / 2, 148, '#ffe08a', 20, 'center');
  txt(g, '試作版 ― 撃破: ' + STATS.kills + '　パリィ: ' + STATS.parried + '　致命: ' + STATS.ripostes + '　死亡: ' + STATS.deaths, VW / 2, 176, '#9a94c0', 9, 'center');
  txt(g, '清掃員工房 / カナタゲームズ', VW / 2, 226, '#d9b45a', 12, 'center'); g.globalAlpha = 1;
}
// ---------- loop ----------
let last = 0, acc = 0;
function frame(ts) { const dt = Math.min(.1, (ts - last) / 1000 || 0); last = ts; acc += dt; while (acc >= DT) { update(DT); acc -= DT; } render(); requestAnimationFrame(frame); }
G.step = (n = 1) => { for (let i = 0; i < n; i++) update(DT); render(); };
G.P = P; G.STATS = STATS; G.held = held; G.buf = buf; G.press = press; G.release = release; G.enterRoom = enterRoom; G.startGame = startGame;
G.threats = () => { const out = []; for (const e of G.foes()) { const t = e.threat && e.threat(); if (t) out.push(t); }
  for (const s of G.shots) { if (s.kind === 'pillar') { if (!s.hitP && s.t < s.warn + s.act) out.push({ box: s, t: s.warn - s.t, dur: s.act, parry: false, label: 'boss:toll' }); }
    else { const sp = Math.hypot(s.vx, s.vy) || 1, dx = (P.x + P.w / 2) - (s.x + s.w / 2), tt = Math.abs(dx) / Math.max(1, Math.abs(s.vx)); if (!s.hitP && Math.sign(dx) === Math.sign(s.vx)) out.push({ box: { x: s.x + s.vx * tt - 6, y: s.y + s.vy * tt - 6, w: s.w + 12, h: s.h + 12 }, t: tt - .05, dur: (s.w + P.w) / sp, parry: false, label: s.label }); } }
  return out; };
window.G = G;
if (!TESTMODE) requestAnimationFrame(frame); else render();
