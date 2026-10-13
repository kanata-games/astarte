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
  if (kind === 'crit' || kind === 'hit') for (let i = 0; i < (kind === 'crit' ? 8 : 3); i++) G.fx.push({ star: 1, x, y, vx: (rnd() - .5) * 180, vy: -60 - rnd() * 120, life: .5 + rnd() * .3, col: kind === 'crit' ? '#ffe08a' : '#c8d8ff', sz: 2 });
}
function dust(x, y, n) { for (let i = 0; i < n; i++) G.fx.push({ x: x + (rnd() - .5) * 10, y: y - 2, vx: (rnd() - .5) * 70, vy: -rnd() * 30, life: .35 + rnd() * .3, col: i % 2 ? '#6a6480' : '#4a4660', sz: 2, drag: 1, grav: -40 }); }
G.gainSouls = (n, x, y) => { P.souls += n; SFX.souls(); for (let i = 0; i < 10; i++) G.fx.push({ x, y, vx: (rnd() - .5) * 60, vy: -40 - rnd() * 60, life: .8, col: '#a8f0ff', sz: 2, home: 1 }); };
function enterRoom(ri, side) {
  G.ri = ri; G.room = buildRoom(ri); G.shots = []; const d = G.room.def;
  G.enemies = d.spawns.map((s, i) => { if ((G.dead[ri] || new Set()).has(i)) return null; const e = new Foe(s.k, s.x * T, 0); e.si = i;
    e.y = s.row ? s.row * T : floorY(G.room, s.x) - e.h; e.hy = e.y; return e; }).filter(Boolean);
  G.boss = null;
  if (d.boss !== undefined && !G.bossDown) { G.boss = new Boss(d.boss * T, floorY(G.room, d.boss) - BOSS.h); for (let y = 0; y < ROWS; y++) G.room.grid[y][0] = 1; G.toast(BOSS.name, 2.5); }
  if (side === 'left') { P.x = 20; } else if (side === 'right') { P.x = G.room.w - 40; }
  fitBody(); const tx = clamp(Math.floor((P.x + P.w / 2) / T), 0, d.w - 1); P.y = floorY(G.room, tx) - P.h - 1; P.vy = 0;
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
  for (const f of G.fx) { f.life -= dt; if (!f.ring) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += (f.grav !== undefined ? f.grav : 200) * dt; if (f.drag) f.vx *= .9; if (f.home) { f.x = lerp(f.x, P.x + P.w / 2, .06); f.y = lerp(f.y, P.y + 20, .06); } } }
  G.fx = G.fx.filter(f => f.life > 0);
  G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt); G.areaT -= dt;
  G.cam = lerp(G.cam, clamp(P.x + P.w / 2 - VW / 2 + P.face * 30, 0, G.room.w - VW), .12);
}
function startGame() { G.mode = 'play'; G.menu = null; G.hitstop = 0; G.endT = 0; G.shots = []; for (const k in buf) buf[k] = 0; for (const k in held) held[k] = false; G.dead = {}; G.bossDown = false; G.stain = null; G.pickups = {}; G.lit = { 0: true }; G.check = { ri: 0, x: 6 };
  Object.assign(P, { hp: 100, stam: 100, flasks: MAXFLASK, souls: 0, lv: { vit: 0, end: 0, str: 0 }, weapons: ['scythe'], wi: 0, state: 'free', face: 1, x: 3 * T, iframe: 0 }); fitBody();
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
  drawLayers(g, G.room, cam); g.drawImage(G.room.canvas, -cam, 0); drawFlames(g, G.room, cam, G.t);
  const d = G.room.def;
  if (d.bonfire !== undefined) { drawBonfire(g, d.bonfire * T + 8 - cam, floorY(G.room, d.bonfire), G.t, !!G.lit[G.ri] || true);
    if (Math.abs(P.x + P.w / 2 - (d.bonfire * T + 8)) < 28 && !G.menu) txt(g, '▲ 休息する', d.bonfire * T + 8 - cam, floorY(G.room, d.bonfire) - 60, '#ffe8a8', 10, 'center'); }
  if (d.fog && !G.bossDown) { g.globalAlpha = .45 + .1 * Math.sin(G.t * 2); R(g, G.room.w - 18 - cam, 32, 18, floorY(G.room, d.w - 1) - 32, '#d8d8ff'); g.globalAlpha = 1; }
  if (d.pickup && !G.pickups[G.ri]) { const px = d.pickup.x * T + 8 - cam, py = d.pickup.row * T - 8; g.globalAlpha = .5 + .4 * Math.sin(G.t * 5); g.fillStyle = '#fff4c0'; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.globalAlpha = 1; }
  if (G.stain && G.stain.ri === G.ri) { const sx = G.stain.x - cam; g.globalAlpha = .6 + .3 * Math.sin(G.t * 4); g.fillStyle = '#7af0e0'; g.beginPath(); g.ellipse(sx, G.stain.y - 3, 10, 4, 0, 0, 7); g.fill(); R(g, sx - 1, G.stain.y - 18 - Math.round(Math.sin(G.t * 3) * 3), 3, 8, '#c8fff4'); g.globalAlpha = 1; }
  g.save(); g.translate(-cam, 0);
  for (const s of G.shots) {
    if (s.kind === 'pillar') { if (s.t < s.warn) { g.globalAlpha = .25 + .25 * Math.sin(s.t * 20); R(g, s.x, 236, s.w, 4, '#ff5a3a'); R(g, s.x + s.w / 2 - 1, 40, 2, 196, '#ff5a3a'); g.globalAlpha = 1; } else { R(g, s.x, s.y, s.w, s.h, '#ffeec0'); R(g, s.x + 6, s.y, s.w - 12, s.h, '#fff'); } }
    else if (s.kind === 'wave') { if (s.delay > 0) g.globalAlpha = .4; R(g, s.x, s.y + 6, s.w, s.h - 6, '#8a90b8'); R(g, s.x + 3, s.y, s.w - 6, 8, '#c8ccf0'); g.globalAlpha = 1; }
    else { g.fillStyle = '#d070ff'; g.beginPath(); g.arc(s.x + 5, s.y + 5, 6, 0, 7); g.fill(); R(g, s.x + 3, s.y + 3, 4, 4, '#fff0ff'); }
  }
  for (const e of G.enemies) if (e.hp > 0) { if (e.flash > 0) g.filter = 'brightness(3)'; drawEnemy(g, e); g.filter = 'none';
    if (e.state === 'windup') txt(g, '!', e.x + e.w / 2, e.y - 6, e.atk.parry ? '#ffffff' : '#ff4a3a', 14, 'center');
    if (e.stagger > 0 && e.parried) txt(g, '致命', e.x + e.w / 2, e.y - 6, '#ffe08a', 10, 'center');
    if (e.hp < e.d.hp) { R(g, e.x, e.y - 14, e.w, 3, '#200'); R(g, e.x, e.y - 14, e.w * e.hp / e.d.hp, 3, '#c03050'); } }
  if (G.boss && (G.boss.hp > 0 || G.endT < 1.5)) { const b = G.boss; if (b.flash > 0) g.filter = 'brightness(2.5)'; if (b.hp <= 0) g.globalAlpha = Math.max(0, 1 - G.endT); drawBoss(g, b); g.filter = 'none'; g.globalAlpha = 1;
    if (b.stagger > 0 && b.parried) txt(g, '致命', b.x + b.w / 2, b.y - 30, '#ffe08a', 11, 'center'); }
  if (P.ghosts) for (const gh of P.ghosts) ASTA.draw(g, gh.x, gh.y, gh.face, 'roll', gh.f, P.weapons[P.wi], gh.a * .5);
  const pp = playerPose(); if (P.state === 'hurt' && P.st < .08) g.filter = 'brightness(2.2)'; if (P.iframe > 0 && P.state === 'free' && (G.t * 20 | 0) % 2) g.globalAlpha = .6;
  ASTA.draw(g, P.x + P.w / 2, P.y + P.h, P.face, pp.anim, pp.f, P.weapons[P.wi]); g.filter = 'none'; g.globalAlpha = 1;
  if (ASTA.get(P.weapons[P.wi]).meta.art) { // art sheets: runtime swing trail + parry clang flash on top of the hand-made frames
    if (P.state === 'attack' && P.st >= P.move.wu - .02 && P.st < P.move.wu + P.move.act + .06) { const hv = P.moveKind === 'heavy', k = (P.st - P.move.wu) / P.move.act;
      drawTrail(g, P.x + P.w / 2 + P.face * 4, P.y + P.h * .4, P.face, hv ? -2.4 : -1.5, lerp(hv ? -2.4 : -1.5, hv ? 1.3 : 1.0, clamp(k + .3, .2, 1)), P.h * (hv ? .78 : .6), hv ? '#8ab0ff' : '#c8d8ff'); }
    if (P.state === 'riposte' && P.st > .3 && P.st < .5) drawTrail(g, P.x + P.w / 2, P.y + P.h - 34, P.face, -2.4, 1.2, 44, '#ffe08a');
    const Wd = weapon();
    if (Wd.dizzy && P.state === 'attack' && P.moveKind === 'heavy' && P.st > P.move.wu + P.move.act + .05) for (let i = 0; i < 3; i++) { const an = G.t * 6 + i * 2.1, sx = P.x + P.w / 2 + Math.cos(an) * 11, sy = P.y - 4 + Math.sin(an) * 3; R(g, sx - 2, sy, 5, 1, '#ffe08a'); R(g, sx, sy - 2, 1, 5, '#ffe08a'); }
    if (P.parryFlashT > 0 && Wd.sfx && Wd.sfx.parry === 'clang') { const k = 1 - P.parryFlashT / .3, x = P.x + P.w / 2 + P.face * 22, y = P.y + 6; g.globalAlpha = 1 - k * .8;
      for (const [r0, c] of [[8, '#fff2c0'], [16, '#ffe08a'], [24, '#c8a050']]) { g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r0 + k * 18, 0, 7); g.stroke(); } g.globalAlpha = 1; }
    else if (P.parryFlashT > 0) { const k = 1 - P.parryFlashT / .3, x = P.x + P.w / 2 + P.face * 24, y = P.y + 14; g.globalAlpha = 1 - k; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 6 + k * 22, 0, 7); g.stroke(); R(g, x - 12 - k * 8, y - 1, 24 + k * 16, 2, '#ffffff'); R(g, x - 1, y - 12 - k * 8, 2, 24 + k * 16, '#ffffff'); g.globalAlpha = 1; } }
  for (const f of G.fx) { if (f.ring) { g.strokeStyle = f.col; g.lineWidth = 2; g.globalAlpha = f.life / .3; g.beginPath(); g.arc(f.x, f.y, (.3 - f.life) * 120, 0, 7); g.stroke(); g.globalAlpha = 1; } else if (f.star) { R(g, f.x - 2, f.y, 5, 1, f.col); R(g, f.x, f.y - 2, 1, 5, f.col); } else { if (f.life < .2) g.globalAlpha = f.life / .2; R(g, f.x, f.y, f.sz, f.sz, f.col); g.globalAlpha = 1; } }
  g.restore();
  // lighting (darkness with light holes + warm/cool tints + moon shafts + motes), fog, foreground silhouettes
  const LX = [{ x: P.x + P.w / 2, y: P.y + 24, r: 96, s: .6 }];
  if (d.bonfire !== undefined) LX.push({ x: d.bonfire * T + 8, y: floorY(G.room, d.bonfire) - 40, r: 130, warm: 1 });
  if (G.stain && G.stain.ri === G.ri) LX.push({ x: G.stain.x, y: G.stain.y - 10, r: 50, blue: 1 });
  for (const e of G.enemies) if (e.hp > 0) { if (e.kind === 'wisp') LX.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 60, blue: 1 }); if (e.kind === 'acolyte' && e.state === 'windup') LX.push({ x: e.x + e.w / 2, y: e.y, r: 50, warm: 1 }); }
  for (const s2 of G.shots) LX.push(s2.kind === 'pillar' ? { x: s2.x + 14, y: s2.t >= s2.warn ? 140 : 236, r: s2.t >= s2.warn ? 120 : 40, warm: s2.t >= s2.warn ? 1 : 0, red: s2.t < s2.warn ? 1 : 0 } : { x: s2.x + s2.w / 2, y: s2.y + s2.h / 2, r: 46, red: s2.kind === 'orb' ? 1 : 0, cool: 1 });
  if (G.boss && G.boss.hp > 0) LX.push({ x: G.boss.x + G.boss.w / 2, y: G.boss.y + 10, r: 60, red: G.boss.phase2 ? 1 : 0, s: .5 });
  if (P.parryFlashT > 0) LX.push({ x: P.x + P.w / 2 + P.face * 16, y: P.y + 10, r: 140, s: 1, cool: 1 });
  if (d.pickup && !G.pickups[G.ri]) LX.push({ x: d.pickup.x * T + 8, y: d.pickup.row * T - 8, r: 40, warm: 1 });
  drawLighting(g, G.room, cam, LX, G.t); drawFog(g, G.room, cam, G.t); drawForeground(g, G.room, cam);
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
  { const tr = G.titleRoom || (G.titleRoom = buildRoom(1)); drawLayers(g, tr, G.t * 12); g.drawImage(tr.canvas, -((G.t * 12) % (tr.w - VW)), 0); drawLighting(g, tr, (G.t * 12) % (tr.w - VW), [{ x: VW * .7 + (G.t * 12) % (tr.w - VW), y: 180, r: 140, warm: 1 }], G.t); drawFog(g, tr, G.t * 12, G.t); } R(g, 0, 0, VW, VH, 'rgba(5,4,14,.45)');
  g.save(); g.translate(VW / 2 + 90, 236); g.scale(2, 2); ASTA.draw(g, 0, 0, -1, 'idle', (G.t / .16) % ASTA.anim('scythe', 'idle').n, 'scythe'); g.restore();
  txt(g, 'ASTARTE', 30, 92, '#e8e4ff', 34); txt(g, 'アスターテ ―月鐘の廃墟―', 32, 116, '#d9b45a', 14); R(g, 32, 124, 180, 1, '#d9b45a');
  if ((G.t * 2 | 0) % 2) txt(g, 'PRESS START / タップで開始', 32, 170, '#ffffff', 11);
  txt(g, 'v0.1.1-alpha', 32, 188, '#8a84b0', 9);
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
G.step = (n = 1) => { for (let i = 0; i < n; i++) update(DT); if (G.renderSteps !== false) render(); };
G.P = P; G.STATS = STATS; G.held = held; G.buf = buf; G.press = press; G.release = release; G.enterRoom = enterRoom; G.startGame = startGame;
G.threats = () => { const out = []; for (const e of G.foes()) { const t = e.threat && e.threat(); if (t) out.push(t); }
  for (const s of G.shots) { if (s.kind === 'pillar') { if (!s.hitP && s.t < s.warn + s.act) out.push({ box: s, t: s.warn - s.t, dur: s.act, parry: false, label: 'boss:toll' }); }
    else { const sp = Math.hypot(s.vx, s.vy) || 1, dl = s.delay > 0 ? s.delay : 0, dx = (P.x + P.w / 2) - (s.x + s.w / 2), tt = Math.max(0, Math.abs(dx) - (P.w + s.w) / 2) / Math.max(1, Math.abs(s.vx)); if (!s.hitP && Math.sign(dx) === Math.sign(s.vx)) out.push({ box: { x: s.x + s.vx * tt - 6, y: s.y + s.vy * tt - 10, w: s.w + 12, h: s.h + 12 }, proj: true, t: tt + dl - .05, dur: (s.w + P.w) / sp, parry: false, label: s.label }); } }
  return out; };
window.G = G;
for (const w in WEAPONS) ASTA.applyArt(w);
if (!TESTMODE) requestAnimationFrame(frame); else render();
