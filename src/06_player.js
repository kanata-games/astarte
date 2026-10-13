// ===== player: アスターテ =====
const P = { x: 0, y: 0, w: 18, h: 56, vx: 0, vy: 0, face: 1, onGround: false, state: 'free', st: 0, t: 0, iframe: 0,
  hp: 100, stam: 100, stamDelay: 0, flasks: 3, souls: 0, lv: { vit: 0, end: 0, str: 0 }, weapons: ['scythe'], wi: 0, move: null, hitSet: null, riposteTarget: null, coyote: 0 };
const pMaxHp = () => 100 + P.lv.vit * 15, pMaxStam = () => 100 + P.lv.end * 12, pStr = () => 1 + P.lv.str * .1, MAXFLASK = 3;
const STATS = { taken: 0, dodged: 0, parried: 0, ripostes: 0, deaths: 0, kills: 0, takenBy: {} };
function weapon() { return WEAPONS[P.weapons[P.wi]]; }
function useStam(n) { if (P.stam <= 0) return false; P.stam -= n; P.stamDelay = .6; return true; }
function pBox() { return { x: P.x, y: P.y, w: P.w, h: P.h }; }
function startAttack(kind) {
  const W = weapon();
  if (kind === 'light') { P.combo = (P.t - (P.comboT || -9) < .3 && P.combo < 3) ? P.combo + 1 : 1; kind = P.combo === 1 ? 'light' : 'light' + P.combo; } else P.combo = 0;
  const m = W[kind]; if (!useStam(m.stam)) return;
  P.anim = kind === 'light' ? 'light1' : kind; P.state = 'attack'; P.st = 0; P.move = m; P.moveKind = kind; P.hitSet = new Set(); SFX.swing();
}
function tryRiposte() {
  const W = weapon(); const list = G.foes().filter(e => e.hp > 0 && e.stagger > 0 && e.parried);
  for (const e of list) { const ex = e.x + e.w / 2, px = P.x + P.w / 2; if (Math.abs(ex - px) < 64 && Math.abs((e.y + e.h) - (P.y + P.h)) < 40) {
      P.face = ex >= px ? 1 : -1; P.state = 'riposte'; P.st = 0; P.riposteTarget = e; P.iframe = .9; return true; } }
  return false;
}
// returns 'dodged' | 'parried' | 'hit'
function hurtPlayer(dmg, src, parryable, label) {
  if (P.state === 'dead' || G.mode !== 'play') return 'none';
  if (P.iframe > 0) { STATS.dodged++; return 'dodged'; }
  const W = weapon();
  if (P.state === 'parry' && P.st < W.parry.window && parryable) {
    const sx = src ? src.x + src.w / 2 : P.x; if (Math.sign(sx - (P.x + P.w / 2)) === P.face || Math.abs(sx - P.x - P.w / 2) < 8) {
      STATS.parried++; SFX.parry(); G.flash = .12; G.hitstop = .12; fx('parry', P.x + P.w / 2 + P.face * 14, P.y + 18); if (src && src.onParried) src.onParried(); P.state = 'free'; P.parryFlashT = .3; P.stam = Math.min(pMaxStam(), P.stam + 10); return 'parried'; } }
  let d = dmg; if (P.state === 'parry') d *= 1.0;
  P.hp -= d; STATS.taken++; STATS.takenBy[label || '?'] = (STATS.takenBy[label || '?'] || 0) + 1; SFX.hurt(); G.shake = .2; G.hitstop = .06;
  fx('blood', P.x + P.w / 2, P.y + 20);
  if (P.hp <= 0) { P.hp = 0; P.state = 'dead'; P.st = 0; STATS.deaths++; SFX.die(); return 'hit'; }
  P.state = 'hurt'; P.st = 0; P.iframe = .55; P.vx = src ? Math.sign(P.x + P.w / 2 - (src.x + src.w / 2)) * 140 : -P.face * 140; P.vy = -120;
  return 'hit';
}
function updatePlayer(dt) {
  P.t += dt; P.st += dt; P.parryFlashT = Math.max(0, (P.parryFlashT || 0) - dt); P.iframe = Math.max(0, P.iframe - dt);
  const W = weapon(), room = G.room;
  P.stamDelay -= dt; if (P.stamDelay <= 0 && P.state !== 'attack' && P.state !== 'roll') P.stam = Math.min(pMaxStam(), P.stam + (P.state === 'parry' ? 20 : 55) * dt);
  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  const free = P.state === 'free';
  if (P.state === 'dead') { P.vx *= .9; moveBody(P, room, dt); if (P.st > 2.2) G.onDeath(); return; }
  if (free) {
    P.vx = dir * 120; if (dir) P.face = dir;
    if (P.onGround) P.coyote = .08; else P.coyote -= dt;
    P.dropThrough = held.down && peek('jump');
    if (pressed('jump') && P.coyote > 0) { if (held.down) { P.dropThrough = true; P.y += 2; } else { P.vy = -400; P.coyote = 0; } }
    if (!held.jump && P.vy < -150) P.vy = -150;  // variable jump height
    if (pressed('light')) { if (!tryRiposte()) startAttack('light'); }
    else if (pressed('heavy')) startAttack('heavy');
    else if (pressed('roll') && P.onGround) { if (useStam(22)) { P.state = 'roll'; P.st = 0; if (dir) P.face = dir; SFX.roll(); } }
    else if (pressed('parry') && P.onGround) { if (useStam(W.parry.stam)) { P.state = 'parry'; P.st = 0; } }
    else if (pressed('flask') && P.onGround && P.flasks > 0) { P.state = 'flask'; P.st = 0; P.healed = false; }
    else if (pressed('swap') && P.weapons.length > 1) { P.wi = (P.wi + 1) % P.weapons.length; G.toast(weapon().name + ' に持ち替えた'); }
  } else if (P.state === 'attack') {
    const m = P.move; const ph = P.st < m.wu ? 'wu' : P.st < m.wu + m.act ? 'act' : 'rec';
    P.vx = ph !== 'rec' ? P.face * m.lunge : P.vx * .8;
    if (ph === 'act') {
      const hb = { x: P.face > 0 ? P.x + P.w / 2 : P.x + P.w / 2 - m.range, y: P.y + P.h - m.h, w: m.range, h: m.h };
      for (const e of G.foes()) if (e.hp > 0 && !P.hitSet.has(e) && overlap(hb, e)) { P.hitSet.add(e); e.damage(m.dmg * pStr(), m.poise, P.face); }
    }
    if (P.st > m.wu + m.act + m.rec * .55 && (peek('light') || peek('heavy') || peek('roll'))) { P.state = 'free'; P.comboT = P.t; }
    else if (P.st > m.wu + m.act + m.rec) { P.state = 'free'; P.comboT = P.t; }
  } else if (P.state === 'riposte') {
    P.vx = 0;
    if (P.st > .35 && P.riposteTarget) { const e = P.riposteTarget; P.riposteTarget = null; STATS.ripostes++; e.damage(W.light.dmg * W.riposteMul * pStr(), 999, P.face, true); G.hitstop = .15; G.shake = .25; fx('crit', e.x + e.w / 2, e.y + e.h / 2); }
    if (P.st > .8) P.state = 'free';
  } else if (P.state === 'roll') {
    P.vx = P.face * (P.st < .38 ? 210 : 60); if (P.st >= .05 && P.st < .36) P.iframe = Math.max(P.iframe, .01);
    if (P.st > .48 || (P.st > .36 && peek('jump'))) P.state = 'free';
  } else if (P.state === 'parry') { P.vx = 0; if (P.st > W.parry.dur) P.state = 'free'; }
  else if (P.state === 'hurt') { P.vx *= .9; if (P.st > .32) P.state = 'free'; }
  else if (P.state === 'flask') { P.vx = dir * 30; if (!P.healed && P.st > .55) { P.healed = true; P.flasks--; P.hp = Math.min(pMaxHp(), P.hp + pMaxHp() * .55); SFX.heal(); fx('heal', P.x + P.w / 2, P.y + 20); } if (P.st > .95) P.state = 'free'; }
  else if (P.state === 'rest') { P.vx = 0; }
  const wasAir = !P.onGround, vy0 = P.vy, f0 = P.face;
  moveBody(P, room, dt);
  if (wasAir && P.onGround && vy0 > 200) { P.landT = .16; dust(P.x + P.w / 2, P.y + P.h, 8); }
  P.landT = Math.max(0, (P.landT || 0) - dt); P.turnT = Math.max(0, (P.turnT || 0) - dt);
  if (P.state === 'free' && P.onGround && P.face !== (P.lastFace || P.face)) P.turnT = .12; P.lastFace = P.face;
  if (P.state === 'free' && P.onGround && Math.abs(P.vx) > 60) { P.stepT = (P.stepT || 0) - dt; if (P.stepT <= 0) { P.stepT = .25; dust(P.x + P.w / 2 - P.face * 6, P.y + P.h, 2); } }
  if (P.state === 'roll' && P.st < dt * 1.5) dust(P.x + P.w / 2, P.y + P.h, 6);
  if (P.state === 'roll') { (P.ghosts = P.ghosts || []).push({ x: P.x + P.w / 2, y: P.y + P.h, f: Math.min(5, P.st / .48 * 6 | 0), face: P.face, a: .45 }); }
  if (P.ghosts) { for (const g of P.ghosts) g.a -= dt * 2.2; P.ghosts = P.ghosts.filter(g => g.a > 0).slice(-6); }
  if (P.y > VH + 40) { P.hp = 0; P.state = 'dead'; P.st = 2; }
}
function playerPose() { // -> { anim, f } into the アスターテ sheets
  const s = P.state, ph3 = (st, wu, act, rec) => st < wu ? st / wu * 2 : st < wu + act ? 2 + (st - wu) / act * 2 : 4 + Math.min(1.99, (st - wu - act) / rec * 2);
  if (s === 'roll') return { anim: 'roll', f: P.st / .48 * 6 };
  if (s === 'attack') { const m = P.move; return { anim: P.anim, f: ph3(P.st, m.wu, m.act, m.rec) }; }
  if (s === 'riposte') return { anim: 'riposte', f: ph3(P.st, .35, .15, .3) };
  if (s === 'parry') { if (P.parryFlashT > 0) return { anim: 'parryflash', f: (.3 - P.parryFlashT) / .1 }; const w = weapon().parry; return { anim: 'parry', f: P.st < w.window ? (P.st < .05 ? 0 : 1) : 2 + (P.st - w.window) / (w.dur - w.window) * 2 }; }
  if (P.parryFlashT > 0) return { anim: 'parryflash', f: (.3 - P.parryFlashT) / .1 };
  if (s === 'hurt') return { anim: 'hit', f: P.st / .32 * 3 };
  if (s === 'flask') return { anim: 'flask', f: P.st / .95 * 6 };
  if (s === 'rest') return { anim: 'rest', f: P.st < .5 ? P.st / .25 : 2 + ((P.st * 1.2) | 0) % 2 };
  if (s === 'dead') return { anim: 'death', f: P.st / .14 };
  if (!P.onGround) return P.vy < 0 ? { anim: 'jump', f: P.vy < -200 ? 0 : 1 } : { anim: 'fall', f: P.vy < 200 ? 0 : 1 };
  if (P.landT > 0) return { anim: 'land', f: (.16 - P.landT) / .08 };
  if (P.turnT > 0) return { anim: 'turn', f: (.12 - P.turnT) / .04 };
  if (Math.abs(P.vx) > 1) return { anim: 'run', f: (P.t * 12.5) % 8 };
  return { anim: 'idle', f: (P.t / .2) % 6 };
}