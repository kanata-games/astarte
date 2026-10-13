// ===== アスターテ animation set: parametric pixel-art poses -> sprite sheets (assets/astarte_<weapon>.png) =====
// Each frame is a param object F; drawFrame() renders it at 1px, then outline() adds a dark 1px rim.
const AC_W = 144, AC_H = 112, AC_AX = 64, AC_AY = 100;   // cell size + feet anchor
const ASTA = {};
(function () {
  const C = PAL, OUT = '#0b0918';
  const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function disc(g, x, y, r, c) { g.fillStyle = c; x = Math.round(x); y = Math.round(y); for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy + r * .8)); g.fillRect(x - w, y + dy, w * 2 + 1, 1); } }
  function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1])); for (const p of pts.slice(1)) g.lineTo(Math.round(p[0]), Math.round(p[1])); g.closePath(); g.fill(); }
  function line(g, x0, y0, x1, y1, w, c) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); g.fillStyle = c; for (let i = 0; i <= n; i++) { const t = i / n; g.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w); } }
  const D = { by: 0, lean: 0, crouch: 0, fl: [4, 0], bl: [-4, 0], flare: 0, capeUp: 0, skirt: 0, tail: 0, tailUp: 0, ear: 0, eye: 'open', headDy: 0, hairUp: 0,
    hand: [8, -36], wa: null, two: false, kneel: 0, rot: 0, front: false, mirror: false, smear: null, flask: null, wHand: 'front', burst: 0, heal: 0, lie: 0, dropW: false, wBehind: true };
  // ---------- weapon ----------
  function weapon(g, hx, hy, a, wpn, hot) {
    g.save(); g.translate(hx, hy); g.rotate(a);
    if (wpn === 'pan') {
      px(g, -3, -1, 17, 3, '#4a3226'); px(g, -3, -1, 17, 1, '#6a4a36'); px(g, 12, -2, 3, 5, '#8a8a96');
      disc(g, 24, 0, 9, '#1c1c22'); disc(g, 24, 0, 8, '#33333d'); disc(g, 23, -1, 6, '#45454f'); px(g, 19, -5, 4, 1, '#9a9aaa'); px(g, 18, -4, 1, 2, '#9a9aaa');
      if (hot) { disc(g, 24, 0, 3, '#ffd88a'); }
    } else {
      px(g, -18, -1, 68, 3, C.shaft); px(g, -18, -1, 68, 1, '#4a3a42'); px(g, -21, -2, 4, 5, C.gold); px(g, -24, -1, 3, 3, C.goldD);
      px(g, 8, -2, 3, 5, C.goldD); px(g, 26, -2, 2, 5, C.goldD); px(g, 46, -3, 6, 7, C.gold); px(g, 47, -2, 2, 2, '#fff2c0');
      // blade: big crescent sweeping back
      g.fillStyle = C.blade; g.beginPath(); g.moveTo(49, 2); g.quadraticCurveTo(44, 38, 8, 44); g.quadraticCurveTo(36, 30, 44, 2); g.fill();
      g.fillStyle = C.navy; g.beginPath(); g.moveTo(48, 3); g.quadraticCurveTo(43, 22, 33, 30); g.lineTo(39, 10); g.fill();
      px(g, 40, 14, 2, 2, C.gold); px(g, 36, 21, 1, 1, C.gold);
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(49, 3); g.quadraticCurveTo(45, 36, 9, 43); g.quadraticCurveTo(43, 34, 47, 3); g.fill();
      // crescent ornament + chain + tassel + star gem
      g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.arc(54, -4, 5, 1.0, 4.6); g.stroke();
      for (let i = 0; i < 5; i++) px(g, 30 - i * 3, 4 + Math.round(Math.sin(i) * 1.5) + i, 2, 1, C.goldD);
      px(g, 30, 4, 2, 9, C.navyD); px(g, 29, 12, 4, 3, C.navy); disc(g, 18, 11, 2, '#5a7cff'); px(g, 18, 10, 1, 1, '#d8e4ff');
      if (hot) { disc(g, 30, 22, 4, '#bcd0ff'); }
    }
    g.restore();
  }
  function smear(g, s) { // crescent swing smear (pivot = hand): outer arc + thinner inner arc
    const [cx, cy] = s.c, n = 20, o = [], inn = [], hi = [];
    for (let i = 0; i <= n; i++) { const t = i / n, a = s.a0 + (s.a1 - s.a0) * t, w = 1 + 7 * Math.sin(t * Math.PI) * (0.4 + .6 * t);
      o.push([cx + Math.cos(a) * (s.r + 2), cy + Math.sin(a) * (s.r + 2)]); inn.push([cx + Math.cos(a) * (s.r + 2 - w), cy + Math.sin(a) * (s.r + 2 - w)]); hi.push([cx + Math.cos(a) * (s.r + 1 - w * .35), cy + Math.sin(a) * (s.r + 1 - w * .35)]); }
    poly(g, o.concat(inn.reverse()), s.col); poly(g, o.concat(hi.slice().reverse()), '#ffffff');
  }
  // ---------- body ----------
  function body(g, F, wpn) {
    const k = F.crouch + F.kneel * 10, hipY = -20 + k + F.by, L = F.lean, sx = L * .5, hx = L; // upper body shear: torso shifts half, head full
    // tail (behind) - fluffy C-curl rising behind her
    { let x = -8 + sx * .3, y = hipY - 2, a = Math.PI * .92 - F.tailUp * .25 + F.tail * .25; for (let i = 0; i < 13; i++) { const r = i < 2 ? 2 : i < 10 ? 3 : 2;
        disc(g, x, y, r, C.hair); if (i > 1 && i < 11) px(g, x - 1, y + r - 1, 2, 1, C.hairS); a += .2 + F.tail * .02 - (i > 8 ? F.tailUp * .05 : 0); x += Math.cos(a) * 2.8; y += Math.sin(a) * 2.8; } }
    // back cape panel (lags with flare)
    const hem = -12 + k * .7 - F.capeUp * 8;
    poly(g, [[-9 + sx, hipY - 26], [-4 + sx, hipY - 26], [-4 + sx * .3, hem], [-17 - F.flare * 9, hem + F.flare * 2 - F.capeUp * 3]], C.navyD);
    line(g, -4, hem, -17 - F.flare * 9, hem + F.flare * 2 - F.capeUp * 3, 1, C.goldD);
    // legs
    const leg = (hx0, foot, back) => { if (F.kneel) return; const fx = foot[0], fy = foot[1] + Math.min(0, F.by);
      line(g, hx0, hipY + 4, fx, fy - 4, 4, back ? '#1d1a24' : C.tights); px(g, fx - 3, fy - 5, 8, 5, back ? '#11122e' : C.navyD); px(g, fx - 3, fy - 1, 8, 1, '#0a0a20'); px(g, fx - 2, fy - 4, 5, 1, C.gold); px(g, fx + 3, fy - 2, 1, 2, '#2a2a5a'); };
    leg(-3, F.bl, true); leg(2, F.fl, false);
    if (F.kneel) { px(g, -10, -6, 14, 6, C.navyD); px(g, -10, -2, 14, 1, C.gold); px(g, 2, -14, 4, 12, C.tights); px(g, 1, -5, 8, 5, C.navyD); }
    // skirt (white layered, flares)
    const sk = F.skirt * 4 + F.flare * 2, sh = -15 + k * .6 - F.capeUp * 2;
    poly(g, [[-8 + sx * .5, hipY - 8], [8 + sx * .5, hipY - 8], [12 + sk * .3, sh], [-12 - sk, sh]], C.white);
    poly(g, [[-12 - sk, sh], [12 + sk * .3, sh], [13 + sk * .3, sh + 3], [-13 - sk, sh + 3]], '#ffffff');
    for (let i = -10; i < 12; i += 5) px(g, i, sh + 3, 3, 1, C.whiteS);
    px(g, -2 + sx * .5, hipY - 6, 1, sh - hipY + 6, C.whiteS); px(g, 4 + sx * .5, hipY - 6, 1, sh - hipY + 4, '#e2e3ec');
    // robe front panels
    poly(g, [[-10 + sx, hipY - 24], [-5 + sx, hipY - 24], [-7 + sx * .4, sh + 1], [-14 - sk - F.flare * 3, sh + 2]], C.navy);
    poly(g, [[5 + sx, hipY - 24], [10 + sx, hipY - 24], [14 + sk * .2, sh - 1], [7 + sx * .4, sh - 1]], C.navy);
    line(g, -7 + sx * .4, sh + 1, -14 - sk - F.flare * 3, sh + 2, 1, C.gold); line(g, 7 + sx * .4, sh - 1, 14 + sk * .2, sh - 1, 1, C.gold);
    for (const [x, y] of [[-10, -6], [-12, -2], [10, -8], [11, -3], [-9, 2]]) px(g, x + sx * .6, hipY + y - 8, 1, 1, C.gold);
    px(g, -11 + sx * .5, hipY - 1, 2, 2, C.gold); // crescent charm
    // torso
    const tx = sx, ty = hipY - 24;
    px(g, -6 + tx, ty, 12, 16, C.white); px(g, -1 + tx, ty + 2, 1, 12, C.whiteS); px(g, 2 + tx, ty + 3, 1, 1, C.whiteS); px(g, 2 + tx, ty + 7, 1, 1, C.whiteS);
    px(g, -7 + tx, ty + 12, 14, 4, C.navyD); px(g, -7 + tx, ty + 12, 14, 1, C.goldD); disc(g, tx, ty + 14, 1, C.gold); px(g, -5 + tx, ty + 14, 1, 1, C.gold); px(g, 4 + tx, ty + 14, 1, 1, C.gold);
    px(g, 2 + tx, ty + 16, 1, 6, '#2a1830'); px(g, 3 + tx, ty + 16, 1, 4, '#2a1830'); // ribbon
    // capelet
    poly(g, [[-11 + hx * .7, ty - 3], [11 + hx * .7, ty - 3], [13 + tx, ty + 5 + F.flare], [-13 + tx - F.flare * 3, ty + 6]], C.navy);
    line(g, -13 + tx - F.flare * 3, ty + 6, 13 + tx, ty + 5 + F.flare, 1, C.gold); px(g, -6 + tx, ty + 1, 1, 1, C.gold); px(g, 7 + tx, ty + 2, 1, 1, C.gold);
    disc(g, 1 + hx * .7, ty + 3, 1, C.gold); px(g, 1 + hx * .7, ty + 5, 1, 1, C.goldD); // bell
    return { hipY, ty, tx, hx };
  }
  function head(g, F, ox, oy) {
    const y = oy + F.headDy, x = ox, hu = F.hairUp;
    // hood (rounded), back drape
    disc(g, x - 1, y - 9, 12, C.navy); poly(g, [[x - 12, y - 6], [x - 6, y - 4], [x - 9, y + 6], [x - 15, y + 4]], C.navy); disc(g, x - 3, y - 13, 7, C.navyL);
    disc(g, x - 1, y - 9, 12, C.navy);
    for (const [a, b] of [[-9, -16], [-4, -20], [-11, -9], [2, -20]]) px(g, x + a, y + b, 1, 1, C.gold);
    // hair: bob with side locks
    disc(g, x + 1, y - 8, 8, C.hair); px(g, x - 8, y - 9, 4, 13 - hu, C.hair); px(g, x - 8, y + 2 - hu, 2, 2, C.hairS); px(g, x - 5, y - 2, 2, 5, C.hairS);
    px(g, x + 7, y - 9, 3, 12 - hu, C.hair); px(g, x + 8, y + 1 - hu, 2, 2, C.hairS);
    if (F.front) {
      px(g, x - 4, y - 11, 10, 10, C.skin); px(g, x - 5, y - 13, 12, 3, C.hair); px(g, x - 5, y - 10, 1, 1, C.hair); px(g, x + 1, y - 10, 1, 1, C.hair); px(g, x + 6, y - 10, 1, 1, C.hair);
      for (const ex of [-3, 3]) { px(g, x + ex, y - 8, 2, 4, C.eye); px(g, x + ex, y - 9, 2, 1, '#1d2f78'); px(g, x + ex, y - 8, 1, 1, '#fff'); }
      px(g, x + 1, y - 3, 1, 1, '#d89a9a');
    } else {
      px(g, x - 1, y - 11, 9, 10, C.skin); px(g, x + 7, y - 9, 1, 6, C.skin); px(g, x - 1, y - 2, 1, 1, C.hair); px(g, x + 7, y - 2, 1, 1, C.hair);
      px(g, x - 2, y - 13, 11, 3, C.hair); px(g, x + 1, y - 10, 1, 2, C.hair); px(g, x + 4, y - 10, 1, 1, C.hair); px(g, x + 8, y - 10, 1, 1, C.hair); px(g, x - 1, y - 10, 2, 5, C.hair);
      const e = F.eye;
      if (e === 'closed') { px(g, x + 3, y - 6, 3, 1, '#4a3a4a'); px(g, x + 2, y - 7, 1, 1, '#4a3a4a'); }
      else if (e === 'wince') { px(g, x + 3, y - 7, 3, 1, '#4a3a4a'); px(g, x + 4, y - 6, 2, 1, '#4a3a4a'); }
      else { px(g, x + 3, y - 9, 3, 5, C.eye); px(g, x + 2, y - 10, 5, 1, '#1d1a30'); px(g, x + 3, y - 8, 1, 2, '#fff'); px(g, x + 5, y - 5, 1, 1, '#9ab8ff'); px(g, x + 3, y - 5, 3, 1, '#2a4ab0');
        if (e === 'fierce') px(g, x + 2, y - 11, 5, 1, '#9a9ab0'); }
      px(g, x + 6, y - 3, 1, 1, '#d89a9a'); px(g, x + 4, y - 2, 2, 1, '#e8b8b0');
    }
    // hood front trim
    for (let a = -2.6; a < -0.3; a += .12) px(g, x - 1 + Math.cos(a) * 12, y - 9 + Math.sin(a) * 12, 1, 1, C.gold);
    // ears poke through the hood
    const ear = (ex, tw) => { poly(g, [[x + ex, y - 17 + tw], [x + ex + 6, y - 17 + tw], [x + ex + 3, y - 25 + tw * 2]], C.hair); poly(g, [[x + ex + 1.5, y - 17 + tw], [x + ex + 4.5, y - 17 + tw], [x + ex + 3, y - 22 + tw * 2]], C.pink); };
    ear(-9, F.ear > 0 ? 1 : 0); ear(2, F.ear < 0 ? 1 : 0);
  }
  function arms(g, F, b, wpn, phase) { // phase 'back' draws the far arm, 'front' the near arm + weapon
    const shF = [5 + b.hx * .7, b.ty + 1], shB = [-5 + b.hx * .7, b.ty + 1];
    const wa = F.wa === null ? -2.3 : F.wa, [hx, hy] = F.hand;
    if (phase === 'back') {
      let bh = [-7 + b.tx, b.ty + 14];
      if (F.two && F.wHand === 'front') bh = [hx + Math.cos(wa) * (wpn === 'pan' ? 4 : 12), hy + Math.sin(wa) * (wpn === 'pan' ? 4 : 12)];
      if (F.wHand === 'back') { bh = F.hand2 || [-6 + b.tx, b.ty + 12]; }
      line(g, shB[0], shB[1], bh[0], bh[1], 5, C.navyD); px(g, bh[0] - 2, bh[1] - 1, 4, 3, C.skin);
      if (F.wHand === 'back') weapon(g, bh[0], bh[1], F.wa2 !== undefined ? F.wa2 : -1.45, wpn);
      return;
    }
    if (F.wHand === 'front' && !(F.wBehind && !F.two)) weapon(g, hx, hy, wa, wpn, F.hot);
    line(g, shF[0], shF[1], hx, hy, 6, C.navy); line(g, shF[0], shF[1] + 2, hx, hy + 2, 1, C.navyL);
    const cx = hx - (hx - shF[0]) * .25, cy = hy - (hy - shF[1]) * .25; px(g, cx - 3, cy - 1, 6, 3, C.white); px(g, cx - 3, cy + 1, 6, 1, C.gold);
    px(g, hx - 2, hy - 2, 4, 4, C.skin); px(g, hx - 2, hy + 1, 4, 1, '#d8b0a0');
    if (F.flask) { const [fx, fy] = F.flask; px(g, fx - 2, fy - 6, 5, 8, '#e8a040'); px(g, fx - 1, fy - 8, 3, 2, '#c8c0b0'); px(g, fx - 1, fy - 4, 1, 4, '#fff2c0'); }
  }
  function burst(g, x, y, s, col) { line(g, x - s, y, x + s, y, 2, col); line(g, x, y - s, x, y + s, 2, col); line(g, x - s * .6, y - s * .6, x + s * .6, y + s * .6, 1, col); line(g, x - s * .6, y + s * .6, x + s * .6, y - s * .6, 1, col); disc(g, x, y, Math.max(1, s / 4 | 0), '#ffffff'); }
  function rollBall(g, F, wpn) {
    g.save(); g.rotate(F.rot); disc(g, 0, 0, 14, C.navy); disc(g, -1, -1, 12, C.navyL); disc(g, 0, 0, 11, C.navy);
    g.strokeStyle = C.gold; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 13, .3, 2.2); g.stroke();
    disc(g, 4, -4, 6, C.hair); px(g, 7, -11, 3, 4, C.hair); px(g, 8, -10, 1, 2, C.pink); px(g, 2, -11, 3, 3, C.hair);
    px(g, 6, 3, 6, 5, C.white); for (let i = 0; i < 6; i++) disc(g, -10 - i * 1.5, 6 - i * 2 + Math.sin(i) * 2, 2, C.hair);
    px(g, -6, -6, 1, 1, C.gold); px(g, -3, 8, 1, 1, C.gold); px(g, 9, -1, 1, 1, C.gold);
    g.restore(); weapon(g, 0, 0, F.rot * 1 - 1.2, wpn);
  }
  function drawFrame(g, F0, wpn) {
    const F = Object.assign({}, D, F0);
    g.save(); g.translate(AC_AX, AC_AY); if (F.mirror) g.scale(-1, 1);
    if (F.roll) { g.translate(0, -15); rollBall(g, F, wpn); g.restore(); return; }
    if (F.lie) { // collapsed on the ground
      if (F.dropW) weapon(g, 18, -3, .04, wpn);
      g.rotate(-Math.PI / 2 * F.lie); g.translate(-2 * F.lie, 0);
    }
    if (F.dropW && !F.lie) weapon(g, 22, -3, .06, wpn);
    if (F.wBehind && !F.two && F.wHand === 'front' && !F.dropW) weapon(g, F.hand[0], F.hand[1], F.wa === null ? -2.3 : F.wa, wpn, F.hot);
    const b = body(g, F, wpn);
    if (F.two || F.wHand === 'back') arms(g, F, b, wpn, 'back');
    head(g, F, b.hx, b.ty - 3);
    if (!F.two && F.wHand === 'front') { // relaxed back arm (hidden behind cape)
      const shB = [-5 + b.hx * .7, b.ty + 1]; line(g, shB[0], shB[1], -8 + b.tx, b.ty + 12, 5, C.navyD); px(g, -10 + b.tx, b.ty + 11, 4, 3, C.skin); }
    if (!F.dropW) arms(g, F, b, wpn, 'front');
    if (F.smear) smear(g, F.smear);
    if (F.burst) burst(g, F.burstAt ? F.burstAt[0] : 14, F.burstAt ? F.burstAt[1] : -44, F.burst, F.burstCol || '#ffffff');
    if (F.heal) for (let i = 0; i < 6; i++) { const a = i + F.heal * 2; px(g, Math.cos(a) * (8 + F.heal * 4), -30 - F.heal * 10 - i * 3, 2, 2, i % 2 ? '#ffcf6a' : '#fff2c0'); }
    g.restore();
  }
  function outline(c) { // crisp alpha + 1px dark rim
    const g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data, W = c.width, H = c.height, src = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { if (d[i * 4 + 3] > 110) { d[i * 4 + 3] = 255; src[i] = 1; } else d[i * 4 + 3] = 0; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (src[i]) continue;
      if ((x > 0 && src[i - 1]) || (x < W - 1 && src[i + 1]) || (y > 0 && src[i - W]) || (y < H - 1 && src[i + W])) { d[i * 4] = 11; d[i * 4 + 1] = 9; d[i * 4 + 2] = 24; d[i * 4 + 3] = 255; } }
    g.putImageData(im, 0, 0);
  }
  // ---------- animation definitions ----------
  const S = Math.sin, PI = Math.PI;
  function attack(o, wpn) { // o: a0,a1,h0,h1 (hands), lean0, lean1, crouch, step, col, r
    const fr = [], idleA = wpn === 'pan' ? -1.15 : -2.3, H0x = wpn === 'pan' ? 8 : 10, H0y = wpn === 'pan' ? -36 : -31, two = wpn === 'scythe';
    const mk = (t, ph) => ({ wa: t.wa, hand: t.hand, lean: t.lean, crouch: t.crouch || 0, fl: t.fl || [5, 0], bl: t.bl || [-6, 0], flare: t.flare || 0, two, wBehind: false, eye: 'fierce', tail: t.tail || 0, skirt: t.skirt || 0, smear: t.smear || null, hot: t.hot, ear: t.ear || 0, burst: t.burst || 0, burstAt: t.burstAt, burstCol: t.burstCol, ph });
    const H0 = o.h0, H1 = o.h1;
    fr.push(mk({ wa: lerp(idleA, o.a0, .55), hand: [lerp(H0x, H0[0], .5), lerp(H0y, H0[1], .5)], lean: o.lean0 * .5, crouch: o.crouch * .5, flare: .2, tail: .3 }, 'wu'));
    fr.push(mk({ wa: o.a0, hand: H0, lean: o.lean0, crouch: o.crouch, flare: .4, tail: .6, fl: [6, 0], bl: [-8, 0], hot: o.hot, ear: 1 }, 'wu'));
    const sm = (f0, f1) => ({ c: [lerp(H0[0], H1[0], .5), lerp(H0[1], H1[1], .5) + (o.dy || 0)], a0: lerp(o.a0, o.a1, f0) + (o.so || 0), a1: lerp(o.a0, o.a1, f1) + (o.so || 0), r: o.r, col: o.col });
    fr.push(mk({ wa: lerp(o.a0, o.a1, .55), hand: [lerp(H0[0], H1[0], .6), lerp(H0[1], H1[1], .6)], lean: lerp(o.lean0, o.lean1, .6), flare: -.3, fl: [9 + o.step, 0], bl: [-7, 0], smear: sm(0, .55), skirt: .5, tail: .2 }, 'act'));
    fr.push(mk({ wa: o.a1, hand: H1, lean: o.lean1, flare: -.8, fl: [10 + o.step, 0], bl: [-8, 0], smear: sm(.15, 1), skirt: 1, tail: -.4, burst: o.burst ? 5 : 0, burstAt: o.burstAt, burstCol: o.col }, 'act'));
    fr.push(mk({ wa: o.a1 + (o.a1 > o.a0 ? .15 : -.15), hand: H1, lean: o.lean1 * .7, flare: .9, fl: [9 + o.step, 0], bl: [-6, 0], skirt: .6, tail: -1 }, 'rec'));
    fr.push(mk({ wa: lerp(o.a1, idleA, .5), hand: [lerp(H1[0], H0x, .5), lerp(H1[1], H0y, .5)], lean: o.lean1 * .3, flare: .4, fl: [6, 0], bl: [-5, 0], tail: -.5 }, 'rec'));
    return fr;
  }
  const ATK = {
    scythe: {
      light1: { a0: -2.5, a1: .7, h0: [-2, -50], h1: [14, -32], lean0: -2, lean1: 4, crouch: 1, step: 2, r: 52, col: '#c8d8ff' },
      light2: { a0: 1.1, a1: -1.3, h0: [12, -30], h1: [12, -50], lean0: 3, lean1: -1, crouch: 2, step: 3, r: 50, col: '#c8d8ff', so: 0 },
      light3: { a0: -3.0, a1: 1.3, h0: [-6, -48], h1: [16, -28], lean0: -3, lean1: 6, crouch: 3, step: 6, r: 58, col: '#a8c0ff', burst: 1, burstAt: [44, -20] },
      heavy:  { a0: -3.4, a1: 1.5, h0: [-8, -56], h1: [16, -24], lean0: -4, lean1: 7, crouch: 4, step: 6, r: 62, col: '#8ab0ff', hot: true, burst: 1, burstAt: [52, -10] },
      riposte:{ a0: .6, a1: -1.6, h0: [16, -30], h1: [6, -54], lean0: 5, lean1: -3, crouch: 2, step: 4, r: 54, col: '#ffe08a', burst: 1, burstAt: [40, -40] } },
    pan: {
      light1: { a0: -2.0, a1: .5, h0: [2, -46], h1: [14, -36], lean0: -1, lean1: 3, crouch: 1, step: 2, r: 26, col: '#ffe8c0' },
      light2: { a0: .9, a1: -1.2, h0: [14, -32], h1: [10, -48], lean0: 3, lean1: -1, crouch: 1, step: 2, r: 26, col: '#ffe8c0' },
      light3: { a0: -2.8, a1: 1.2, h0: [0, -54], h1: [14, -30], lean0: -3, lean1: 5, crouch: 3, step: 5, r: 28, col: '#ffd88a', burst: 1, burstAt: [36, -22] },
      heavy:  { a0: -3.6, a1: 1.3, h0: [-6, -54], h1: [15, -28], lean0: -4, lean1: 6, crouch: 5, step: 7, r: 30, col: '#ffb860', hot: true, burst: 1, burstAt: [38, -18] },
      riposte:{ a0: -2.6, a1: 1.0, h0: [0, -52], h1: [14, -32], lean0: -2, lean1: 5, crouch: 2, step: 3, r: 28, col: '#ffe08a', burst: 1, burstAt: [34, -30] } } };
  function anims(wpn) {
    const A = {}, idleA = wpn === 'pan' ? -1.15 : -2.3, H0x = wpn === 'pan' ? 8 : 10, H0y = wpn === 'pan' ? -36 : -31;
    A.idle = [0, 1, 2, 3, 4, 5].map(i => ({ by: [0, 0, 1, 1, 1, 0][i], tail: S(i / 6 * PI * 2), ear: i === 4 ? 1 : 0, eye: i === 5 ? 'closed' : 'open', wa: idleA + S(i / 6 * PI * 2) * .03, hand: [H0x + 0, H0y + 0 + [0, 0, 1, 1, 1, 0][i]], flare: S(i / 6 * PI * 2) * .1 }));
    A.run = [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const p = i / 8 * PI * 2, c = Math.cos(p), s = S(p);
      return { fl: [3 + c * 8, -Math.max(0, s) * 5], bl: [-3 - c * 8, -Math.max(0, -s) * 5], by: -Math.round(Math.abs(s) * 2), lean: 3, flare: .7 + s * .2, tail: -1 + s * .3, tailUp: .4, skirt: .4 + Math.abs(c) * .4, wa: idleA + .25 + s * .06, hand: [H0x + 1, H0y + 1 - Math.round(Math.abs(s))], hairUp: 0 }; });
    A.jump = [{ fl: [5, -6], bl: [-5, -3], flare: -.3, capeUp: -.2, tail: .5, tailUp: -.5, skirt: -.3, lean: 1, wa: idleA + .2, hand: [9, -40] }, { fl: [6, -9], bl: [-4, -7], by: -1, flare: -.4, tail: .7, tailUp: -.6, skirt: -.4, lean: 1, wa: idleA + .3, hand: [10, -42] }];
    A.fall = [{ fl: [5, -2], bl: [-6, -4], capeUp: .6, flare: .3, hairUp: 1, tail: -.4, tailUp: 1, skirt: .8, wa: idleA - .1, hand: [9, -40] }, { fl: [4, 0], bl: [-6, -2], capeUp: 1, flare: .4, hairUp: 2, tail: -.6, tailUp: 1.2, skirt: 1, ear: 1, wa: idleA - .2, hand: [10, -42] }];
    A.land = [{ crouch: 5, fl: [7, 0], bl: [-7, 0], flare: .8, skirt: 1.2, tail: .8, eye: 'closed', wa: idleA + .3, hand: [H0x + 2, H0y + 5] }, { crouch: 2, fl: [5, 0], bl: [-5, 0], flare: .4, skirt: .5, tail: .4, wa: idleA + .1, hand: [H0x + 1, H0y + 2] }];
    A.roll = [0, 1, 2, 3, 4, 5].map(i => ({ roll: 1, rot: i / 6 * PI * 2 }));
    for (const k of ['light1', 'light2', 'light3', 'heavy']) A[k] = attack(ATK[wpn][k], wpn);
    A.parry = [{ wa: wpn === 'pan' ? -.9 : -.45, hand: [13, -44], lean: -2, two: true, fl: [7, 0], bl: [-7, 0], flare: .3, eye: 'fierce', hot: true },
      { wa: wpn === 'pan' ? -.8 : -.4, hand: [14, -44], lean: -2, two: true, fl: [7, 0], bl: [-7, 0], flare: .4, eye: 'fierce' },
      { wa: -1.0, hand: [11, -40], lean: -1, two: true, fl: [6, 0], bl: [-6, 0], flare: .2 }, { wa: idleA + .2, hand: [H0x + 1, H0y + -1], lean: 0, flare: .1 }];
    A.parryflash = [6, 12, 9].map((s, i) => Object.assign({}, A.parry[0], { burst: s, burstAt: [22, -50], burstCol: i === 1 ? '#ffffff' : '#bfe0ff', flare: .6 + i * .1, ear: 1 }));
    A.riposte = attack(ATK[wpn].riposte, wpn).map(f => Object.assign(f, { eye: 'fierce' }));
    A.hit = [{ lean: -4, eye: 'wince', flare: -.8, hairUp: 1, tail: 1, tailUp: 1, ear: -1, crouch: 1, fl: [6, 0], bl: [-8, 0], wa: idleA - .4, hand: [6, -40] },
      { lean: -3, eye: 'wince', flare: -.4, tail: .6, crouch: 2, fl: [6, 0], bl: [-7, 0], wa: idleA - .3, hand: [H0x + -1, H0y + -2] }, { lean: -1, flare: .2, tail: .2, crouch: 1, wa: idleA - .1, hand: [H0x + 0, H0y + -1] }];
    A.death = [{ lean: -4, eye: 'wince', flare: -.6, hairUp: 1, tail: 1, wa: idleA - .5, hand: [6, -40] }, { crouch: 6, lean: 2, eye: 'closed', flare: .5, tail: -.2, wa: idleA + .6, hand: [H0x + 2, H0y + 6] },
      { kneel: 1, lean: 4, eye: 'closed', flare: .6, tail: -.5, dropW: true }, { kneel: 1, lean: 7, eye: 'closed', flare: .8, tail: -.8, headDy: 2, dropW: true },
      { kneel: 1, lean: 7, eye: 'closed', lie: .55, flare: 1, tail: -1, dropW: true }, { kneel: 1, lean: 7, eye: 'closed', lie: 1, flare: 1, tail: -1, dropW: true }];
    A.rest = [{ crouch: 5, wa: -1.5, hand: [11, -40], eye: 'open', flare: .3 }, { kneel: 1, wa: -1.45, hand: [H0x + 3, H0y + 0], eye: 'closed', flare: .5, tail: -.6 },
      { kneel: 1, wa: -1.45, hand: [H0x + 3, H0y + 0], eye: 'closed', flare: .5, tail: -.4, by: 0 }, { kneel: 1, wa: -1.45, hand: [H0x + 3, H0y + 1], eye: 'closed', flare: .5, tail: -.2, by: 1, ear: 1 }];
    const fl = (h, f, o) => Object.assign({ wHand: 'back', hand2: [-8, -32], wa2: -1.6, hand: h, flask: f }, o);
    A.flask = [fl([9, -34], [9, -34], {}), fl([10, -44], [10, -44], {}), fl([7, -50], [7, -52], { lean: -2, headDy: -1, eye: 'closed' }), fl([7, -51], [7, -53], { lean: -3, headDy: -1, eye: 'closed', ear: 1 }),
      fl([9, -40], [9, -40], { lean: -1 }), fl([8, -36], null, { heal: 1, eye: 'open' })];
    A.turn = [{ mirror: true, lean: -2, flare: -.8, tail: 1, skirt: .6, wa: idleA, hand: [H0x + 0, H0y + 0] }, { front: true, flare: .2, tail: 0, skirt: .8, wa: -1.57, hand: [H0x + 0, H0y + 0] }, { lean: 1, flare: .9, tail: -1, skirt: .6, wa: idleA + .1, hand: [H0x + 0, H0y + 0] }];
    if (wpn === 'pan') for (const k in A) for (const f of A[k]) if (f.wBehind === undefined) f.wBehind = false;
    return A;
  }
  ASTA.ORDER = ['idle', 'run', 'jump', 'fall', 'land', 'roll', 'light1', 'light2', 'light3', 'heavy', 'parry', 'parryflash', 'riposte', 'hit', 'death', 'rest', 'flask', 'turn'];
  ASTA.build = function (wpn) {
    const A = anims(wpn), cols = 8, rows = ASTA.ORDER.length, c = mk(cols * AC_W, rows * AC_H), g = c.getContext('2d'), meta = { cw: AC_W, ch: AC_H, ax: AC_AX, ay: AC_AY, anims: {} };
    ASTA.ORDER.forEach((name, r) => { const fr = A[name]; meta.anims[name] = { row: r, n: fr.length, ph: fr.map(f => f.ph || '') };
      fr.forEach((F, i) => { const cell = mk(AC_W, AC_H), cg = cell.getContext('2d'); drawFrame(cg, F, wpn); outline(cell); g.drawImage(cell, i * AC_W, r * AC_H); }); });
    return { canvas: c, meta };
  };
  // runtime: prefer exported PNG sheets (assets/), fall back to building them in-browser
  ASTA.sheets = {};
  ASTA.get = function (wpn) {
    let s = ASTA.sheets[wpn]; if (s) return s;
    const b = ASTA.build(wpn); s = ASTA.sheets[wpn] = { img: b.canvas, meta: b.meta, flip: null };
    if (!TESTMODE_ART) { const im = new Image(); im.onload = () => { s.img = im; s.flip = null; }; im.src = 'assets/astarte_' + wpn + '.png'; }
    return s;
  };
  ASTA.draw = function (g, x, y, face, anim, f, wpn, alpha) {
    const s = ASTA.get(WEAPONS[wpn] ? WEAPONS[wpn].draw : 'scythe'), m = s.meta, a = m.anims[anim] || m.anims.idle, fi = Math.max(0, Math.min(a.n - 1, f | 0));
    g.save(); g.translate(Math.round(x), Math.round(y)); if (face < 0) g.scale(-1, 1); if (alpha !== undefined) g.globalAlpha = alpha;
    g.drawImage(s.img, fi * m.cw, a.row * m.ch, m.cw, m.ch, -m.ax, -m.ay, m.cw, m.ch); g.restore();
  };
})();
const TESTMODE_ART = false;
