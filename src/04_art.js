// ===== art: everything is drawn by script (pixel art), gothic palette =====
const PAL = { navy: '#20245a', navyD: '#141640', navyL: '#343a86', gold: '#d9b45a', goldD: '#9a7a32', hair: '#eef0f7', hairS: '#b9bfd8',
  skin: '#f7dccb', eye: '#3d6fe6', white: '#f1f1f6', whiteS: '#c9cbd9', tights: '#26222e', pink: '#f2a6b4', shaft: '#2a2026', blade: '#dfe4f0', bladeS: '#9aa3bc' };
function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

// ---- tiles ----
const TILESET = (() => {
  const c = mk(T * 4, T), g = c.getContext('2d');
  for (let v = 0; v < 3; v++) {     // stone bricks variants
    const ox = v * T; R(g, ox, 0, T, T, '#2b2836');
    for (let row = 0; row < 2; row++) { const off = (row + v) % 2 ? 8 : 0;
      for (let b = -1; b < 2; b++) { const bx = ox + b * 8 + off; R(g, Math.max(ox, bx), row * 8, Math.min(7, ox + T - Math.max(ox, bx)), 7, ['#3a3648', '#35324a', '#403b4e'][(b + row + v + 3) % 3]); } }
    R(g, ox, 0, T, 1, '#4c4760'); if (v === 2) { R(g, ox + 3, 9, 3, 1, '#2f5a3a'); R(g, ox + 10, 3, 2, 1, '#2f5a3a'); } }
  R(g, 3 * T, 0, T, 4, '#5a4a3a'); R(g, 3 * T, 0, T, 1, '#8a7050'); R(g, 3 * T + 2, 4, 2, 4, '#3a2e26'); R(g, 3 * T + 12, 4, 2, 4, '#3a2e26'); // wooden platform
  return c; })();

// ---- parallax background (pre-rendered) ----
const BG = (() => {
  const W = 768, c = mk(W, VH), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#0b0a18'); gr.addColorStop(1, '#1a1428'); g.fillStyle = gr; g.fillRect(0, 0, W, VH);
  for (let i = 0; i < 60; i++) R(g, (i * 97) % W, (i * 53) % 120, 1, 1, i % 4 ? '#3a3858' : '#8a88b8');
  for (let k = 0; k < 4; k++) { const x = k * 192 + 40;               // far arched windows w/ moonlight
    g.fillStyle = '#100e1e'; g.fillRect(x - 6, 30, 92, 220);
    g.fillStyle = '#1e2448'; g.beginPath(); g.moveTo(x, 200); g.lineTo(x, 90); g.arc(x + 40, 90, 40, Math.PI, 0); g.lineTo(x + 80, 200); g.fill();
    g.fillStyle = '#2c3670'; g.fillRect(x + 38, 52, 4, 148); g.fillRect(x, 120, 80, 3);
    g.fillStyle = 'rgba(160,180,255,.06)'; g.beginPath(); g.moveTo(x, 200); g.lineTo(x + 80, 200); g.lineTo(x + 140, 288); g.lineTo(x + 30, 288); g.fill(); }
  return c; })();
const BG2 = (() => { // near pillars + chains
  const W = 512, c = mk(W, VH), g = c.getContext('2d');
  for (let k = 0; k < 2; k++) { const x = k * 256 + 90; R(g, x, 0, 28, VH, '#17141f'); R(g, x + 2, 0, 3, VH, '#221e2e'); R(g, x - 6, 40, 40, 8, '#1d1a28'); R(g, x - 6, 230, 40, 10, '#1d1a28');
    for (let y = 0; y < 120; y += 6) R(g, x + 60 + (y % 12 ? 0 : 1), y, 2, 4, '#1a1724'); }
  return c; })();

// ---- Astarte ----
// pose: {k:'idle'|'run'|'air'|'roll'|'atk'|'parry'|'hurt'|'flask'|'rest'|'dead', t, wa (weapon angle)}
function drawAstarte(g, x, y, face, pose, wpn) {
  g.save(); g.translate(Math.round(x), Math.round(y)); if (face < 0) g.scale(-1, 1);
  const k = pose.k, t = pose.t || 0;
  if (k === 'roll') { g.rotate(t * Math.PI * 2 * 2.2); R(g, -11, -11, 22, 22, PAL.navy); R(g, -9, -13, 18, 4, PAL.navyL); R(g, -6, -8, 12, 8, PAL.hair); R(g, 4, -2, 6, 6, PAL.white); R(g, -12, 2, 5, 6, PAL.hair); R(g, -2, 9, 4, 2, PAL.gold); g.restore(); return; }
  if (k === 'dead') { g.rotate(-Math.PI / 2 * Math.min(1, t * 2)); }
  const run = k === 'run' ? Math.sin(t * 14) : 0, bob = k === 'run' ? Math.abs(run) * -2 : (k === 'idle' ? Math.round(Math.sin(t * 2.5)) : 0);
  const kneel = k === 'rest' || k === 'flask' ? 8 : 0;
  // tail (behind)
  const tw = Math.round(Math.sin(t * 3) * 2);
  R(g, -16, -32, 5, 10, PAL.hair); R(g, -20, -42 + tw, 5, 12, PAL.hair); R(g, -17, -47 + tw, 6, 5, PAL.hair); R(g, -20, -40 + tw, 2, 8, PAL.hairS);
  // back robe panel
  R(g, -14, -42 + kneel, 9, 30 - kneel, PAL.navyD); R(g, -15, -14, 10, 2, PAL.goldD);
  // legs / boots
  const l1 = Math.round(run * 4), l2 = -l1;
  if (!kneel) { R(g, -6 + l1, -16, 4, 11, PAL.tights); R(g, 3 + l2, -16, 4, 11, PAL.tights); R(g, -7 + l1, -6, 7, 6, PAL.navyD); R(g, 2 + l2, -6, 8, 6, PAL.navyD); R(g, -6 + l1, -4, 5, 1, PAL.gold); R(g, 3 + l2, -4, 5, 1, PAL.gold); }
  else { R(g, -8, -6, 16, 6, PAL.navyD); }
  g.translate(0, bob + kneel);
  // skirt layers
  R(g, -12, -27, 24, 12, PAL.white); R(g, -13, -17, 26, 3, '#ffffff'); R(g, -12, -15, 4, 1, PAL.whiteS); R(g, 0, -15, 5, 1, PAL.whiteS);
  // robe front + side with stars
  R(g, -14, -42, 7, 26, PAL.navy); R(g, 6, -42, 8, 24, PAL.navy); R(g, -14, -17, 7, 1, PAL.gold); R(g, 6, -19, 8, 1, PAL.gold);
  R(g, -11, -30, 1, 1, PAL.gold); R(g, 9, -26, 1, 1, PAL.gold); R(g, 11, -34, 1, 1, PAL.gold); R(g, -12, -22, 2, 2, PAL.gold);
  // torso, belt, bell
  R(g, -6, -44, 12, 16, PAL.white); R(g, -7, -32, 14, 3, PAL.navyD); R(g, -1, -32, 3, 3, PAL.gold); R(g, 4, -31, 1, 1, PAL.gold);
  R(g, -10, -47, 21, 6, PAL.navy); R(g, -10, -42, 21, 1, PAL.gold); R(g, 0, -42, 3, 3, PAL.gold); R(g, 1, -39, 1, 1, PAL.goldD);
  // head
  const hy = k === 'hurt' ? 1 : 0;
  R(g, -9, -60 + hy, 18, 15, PAL.hair); R(g, -9, -46 + hy, 4, 4, PAL.hairS); R(g, 6, -47 + hy, 3, 4, PAL.hair);
  R(g, -2, -56 + hy, 10, 10, PAL.skin); R(g, -3, -58 + hy, 11, 4, PAL.hair); R(g, 2, -55 + hy, 2, 1, PAL.hair);
  const blink = k === 'idle' && (t % 3.2) > 3.05;
  if (blink || k === 'rest') R(g, 3, -51 + hy, 3, 1, '#4a3a4a'); else { R(g, 3, -53 + hy, 3, 4, PAL.eye); R(g, 3, -53 + hy, 1, 1, '#fff'); R(g, 3, -50 + hy, 3, 1, '#1d2f78'); }
  R(g, 6, -48 + hy, 1, 1, '#d89a9a');
  // hood + gold trim + ears
  R(g, -11, -62 + hy, 20, 5, PAL.navy); R(g, -13, -60 + hy, 5, 18, PAL.navy); R(g, -11, -57 + hy, 19, 1, PAL.gold); R(g, 7, -60 + hy, 3, 5, PAL.navy);
  R(g, -12, -48 + hy, 1, 1, PAL.gold); R(g, -9, -61 + hy, 1, 1, PAL.gold);
  R(g, -8, -65 + hy, 5, 4, PAL.hair); R(g, -7, -67 + hy, 3, 2, PAL.hair); R(g, -6, -64 + hy, 2, 2, PAL.pink);
  R(g, 2, -65 + hy, 5, 4, PAL.hair); R(g, 3, -67 + hy, 3, 2, PAL.hair); R(g, 4, -64 + hy, 2, 2, PAL.pink);
  // weapon + arm
  const wa = pose.wa !== undefined ? pose.wa : (k === 'parry' ? -0.4 : -1.75 + run * .08);
  const hx = k === 'parry' ? 10 : 7, hyy = k === 'parry' ? -40 : -36;
  drawWeapon(g, hx, hyy, wa, wpn, pose.glow);
  R(g, 3, -44, 7, 11, PAL.navy); R(g, hx - 3, hyy + 1, 6, 3, PAL.white); R(g, hx - 1, hyy - 1, 3, 3, PAL.skin);
  if (k === 'flask' && t > .2 && t < .8) { R(g, 8, -50, 4, 6, '#e8a040'); R(g, 9, -52, 2, 2, '#fff2c0'); }
  g.restore();
}
function drawWeapon(g, hx, hy, a, wpn, glow) {
  g.save(); g.translate(hx, hy); g.rotate(a);
  const W = WEAPONS[wpn] || WEAPONS.scythe;
  if (W.draw === 'pan') {
    R(g, -4, -1, 18, 3, '#3a2a22'); R(g, 13, -2, 3, 5, '#6a6a72');
    g.fillStyle = '#26262c'; g.beginPath(); g.arc(24, 0, 9, 0, 7); g.fill(); g.fillStyle = '#4a4a54'; g.beginPath(); g.arc(23, -2, 6, 0, 7); g.fill(); R(g, 20, -5, 3, 1, '#9a9aa8');
  } else {
    R(g, -14, -1, 62, 3, PAL.shaft); R(g, -18, -2, 5, 5, PAL.gold); R(g, 10, -2, 3, 5, PAL.goldD); R(g, 46, -3, 5, 7, PAL.gold);
    // blade: crescent sweeping back from the top of the shaft
    g.fillStyle = PAL.blade; g.beginPath(); g.moveTo(48, 0); g.quadraticCurveTo(40, 34, 10, 40); g.quadraticCurveTo(34, 26, 44, 1); g.fill();
    g.fillStyle = PAL.navy; g.beginPath(); g.moveTo(47, 2); g.quadraticCurveTo(42, 18, 34, 24); g.lineTo(38, 10); g.fill();
    g.strokeStyle = PAL.bladeS; g.lineWidth = 1; g.beginPath(); g.moveTo(47, 1); g.quadraticCurveTo(39, 32, 11, 39); g.stroke();
    g.strokeStyle = PAL.gold; g.beginPath(); g.arc(52, -3, 5, 1.2, 4.6); g.stroke();      // crescent ornament
    R(g, 40, -5, 1, 9, PAL.gold); R(g, 36, 2, 2, 8, PAL.navyD); R(g, 36, 10, 2, 2, '#6a8cff'); // tassel + star gem
  }
  if (glow) { g.globalAlpha = .55; g.fillStyle = glow; g.beginPath(); g.arc(W.draw === 'pan' ? 24 : 40, 18, 10, 0, 7); g.fill(); }
  g.restore();
}
// swing trail
function drawTrail(g, x, y, face, a0, a1, r, col) {
  g.save(); g.translate(x, y); if (face < 0) g.scale(-1, 1); g.strokeStyle = col; g.lineWidth = 6; g.globalAlpha = .55;
  g.beginPath(); g.arc(0, 0, r, Math.min(a0, a1), Math.max(a0, a1)); g.stroke(); g.lineWidth = 2; g.globalAlpha = .9; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, r + 2, Math.min(a0, a1) + .2, Math.max(a0, a1)); g.stroke(); g.restore();
}

// ---- enemies ----
function drawEnemy(g, e) {
  g.save(); g.translate(Math.round(e.x + e.w / 2), Math.round(e.y + e.h)); if (e.face < 0) g.scale(-1, 1);
  const t = e.t, st = e.state, wu = st === 'windup' ? Math.min(1, e.st / e.atk.wu) : 0, lean = st === 'windup' ? -3 * wu : st === 'active' ? 4 : 0;
  if (e.stagger > 0) g.rotate(-.15);
  if (e.kind === 'husk') {
    const sw = Math.sin(t * 6) * 2;
    R(g, -6, -12, 4, 12, '#3b3f3a'); R(g, 3, -12, 4, 12, '#3b3f3a'); R(g, -10 + lean, -36, 20, 26, '#4c5249'); R(g, -11 + lean, -14, 22, 4, '#3a3d36');
    R(g, -4 + lean * 1.4, -46, 13, 12, '#8f9a88'); R(g, 4 + lean * 1.4, -42, 3, 2, '#ff5a3a'); R(g, -6 + lean, -46, 6, 8, '#3a3d36');
    const ax = st === 'windup' ? -10 : st === 'active' ? 18 : 8 + sw; R(g, ax + lean, -34, 14, 4, '#7f8a78'); R(g, ax + lean + 12, -36, 4, 7, '#c8d0b8');
  } else if (e.kind === 'guard') {
    R(g, -7, -16, 4, 16, '#b8b2a0'); R(g, 4, -16, 4, 16, '#b8b2a0'); R(g, -11 + lean, -44, 22, 28, '#4a3a2e'); R(g, -9 + lean, -42, 18, 6, '#6a5a44');
    R(g, -9 + lean, -56, 16, 13, '#d8d2c0'); R(g, -11 + lean, -58, 20, 6, '#5a5c6a'); R(g, 2 + lean, -51, 4, 3, '#1a1010'); R(g, 3 + lean, -50, 2, 1, '#ff9a3a');
    R(g, -14 + lean, -42, 7, 20, '#6a2a2a'); R(g, -13 + lean, -38, 5, 2, PAL.gold);
    const sx = e.atk && e.atk.id === 'thrust' ? (st === 'windup' ? -18 : st === 'active' ? 22 : 0) : 0, chop = e.atk && e.atk.id === 'chop' && st !== 'idle' && st !== 'recover';
    if (chop) { g.save(); g.translate(6, -40); g.rotate(st === 'windup' ? -2.2 : .4); R(g, 0, -1, 40, 3, '#6a5040'); R(g, 32, -6, 10, 12, '#a8acb8'); g.restore(); }
    else { R(g, sx - 6, -36, 70, 2, '#6a5040'); R(g, sx + 64, -38, 10, 6, '#c8ccd8'); }
  } else if (e.kind === 'wisp') {
    const f = Math.sin(t * 10); g.globalAlpha = .35; g.fillStyle = '#4a7aff'; g.beginPath(); g.arc(0, -10, 14 + f, 0, 7); g.fill(); g.globalAlpha = 1;
    R(g, -7, -18, 14, 12, '#9cc8ff'); R(g, -5, -22 - f, 10, 6, '#cfe4ff'); R(g, -3, -26 - f * 2, 5, 5, '#eaf4ff'); R(g, -4, -14, 3, 3, '#0a1030'); R(g, 2, -14, 3, 3, '#0a1030'); R(g, -2, -9, 4, 1, '#0a1030');
  } else if (e.kind === 'acolyte') {
    R(g, -11, -36, 22, 36, '#3a2448'); R(g, -12, -2, 24, 2, '#2a1834'); R(g, -9, -48, 16, 14, '#4e3060'); R(g, -1, -44, 7, 7, '#120a18'); R(g, 3, -42, 2, 1, '#ffd84a');
    R(g, -11, -30, 22, 2, PAL.goldD); const by = st === 'windup' ? -46 - Math.sin(e.st * 30) * 2 : -30;
    R(g, 8, by, 3, 16, '#5a4030'); R(g, 5, by - 6, 9, 7, PAL.gold); R(g, 8, by + 1, 3, 2, '#7a5a20');
  }
  g.restore();
}
function drawBoss(g, b) {
  g.save(); g.translate(Math.round(b.x + b.w / 2), Math.round(b.y + b.h)); if (b.face < 0) g.scale(-1, 1);
  const st = b.state, at = b.atkId, wu = st === 'windup' ? Math.min(1, b.st / b.atk.wu) : 0;
  if (b.stagger > 0) g.rotate(-.12);
  // bell on back
  g.fillStyle = '#6a5528'; g.beginPath(); g.moveTo(-30, -86); g.quadraticCurveTo(-46, -84, -46, -48); g.lineTo(-14, -48); g.quadraticCurveTo(-14, -84, -30, -86); g.fill();
  R(g, -48, -50, 36, 4, '#8a7034'); R(g, -32, -92, 4, 7, '#3a3028'); if (at === 'toll' && st !== 'recover') { g.globalAlpha = .4 * Math.sin(b.t * 30) + .4; R(g, -50, -94, 40, 50, '#ffe9a0'); g.globalAlpha = 1; }
  // legs / skirt armor
  R(g, -14, -26, 10, 26, '#2a2c38'); R(g, 4, -26, 10, 26, '#2a2c38'); R(g, -16, -4, 13, 4, '#1a1c24'); R(g, 3, -4, 14, 4, '#1a1c24');
  R(g, -18, -40, 36, 16, '#3a3c4c'); R(g, -18, -26, 36, 3, PAL.goldD);
  // torso, cape
  R(g, -24, -76, 10, 52, '#3a1420'); R(g, -16, -78, 32, 40, '#444658'); R(g, -12, -74, 24, 6, '#5a5c70'); R(g, -2, -64, 4, 20, PAL.goldD);
  R(g, -22, -80, 14, 10, '#55576c'); R(g, 8, -80, 14, 10, '#55576c');
  // helm
  R(g, -9, -96, 20, 18, '#4c4e62'); R(g, -9, -100, 20, 5, '#5e6076'); R(g, 2, -90, 9, 3, '#0a0a10'); R(g, 5, -89, 4, 1, b.phase2 ? '#ff4a3a' : '#ffd060');
  R(g, -3, -108, 4, 10, '#8a2030'); R(g, -6, -112, 10, 5, '#a02a3a');
  // halberd
  let ang = -1.3; if (at === 'cleave') ang = st === 'windup' ? -1.3 - wu * 1.4 : st === 'active' ? .9 : .9;
  if (at === 'sweep') ang = st === 'windup' ? 2.3 + wu * .5 : st === 'active' ? 1.55 : 1.4;
  if (at === 'leap' && st === 'active') ang = 1.2;
  g.save(); g.translate(10, -60); g.rotate(ang); R(g, -20, -2, 100, 4, '#3a2a22'); R(g, 70, -14, 16, 26, '#9aa0b4'); R(g, 72, -12, 3, 22, '#e0e4f0'); R(g, 86, -3, 10, 6, '#9aa0b4');
  if (st === 'windup' && b.atk) { g.globalAlpha = .4 + .4 * Math.sin(b.t * 40); g.fillStyle = b.atk.parry ? '#ffffff' : '#ff3a3a'; g.beginPath(); g.arc(78, 0, 16, 0, 7); g.fill(); }
  g.restore();
  R(g, 8, -64, 8, 8, '#55576c');
  g.restore();
}
// bonfire (a grave-candle with a star-moon lantern)
function drawBonfire(g, x, y, t, lit) {
  R(g, x - 10, y - 4, 20, 4, '#3a3646'); R(g, x - 2, y - 30, 4, 26, '#4a4038'); R(g, x - 8, y - 34, 16, 5, '#5a4a30');
  R(g, x - 5, y - 46, 10, 12, lit ? '#ffcf6a' : '#3a3a4a'); R(g, x - 6, y - 47, 12, 2, PAL.gold); R(g, x - 6, y - 35, 12, 1, PAL.gold);
  if (lit) { g.globalAlpha = .18 + .06 * Math.sin(t * 5); g.fillStyle = '#ffc860'; g.beginPath(); g.arc(x, y - 40, 34, 0, 7); g.fill(); g.globalAlpha = 1; R(g, x - 1, y - 44 - Math.round(Math.sin(t * 9)), 2, 4, '#fff6d0'); }
}
