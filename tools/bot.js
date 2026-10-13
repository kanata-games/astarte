// in-page bot installed by tests: dodges telegraphed threats with i-frame rolls, optionally fights.
module.exports = function installBot(opts) {
  const P = G.P; let tap = null;
  const hit = (a, b, m) => a.x - m < b.x + b.w && a.x + a.w + m > b.x && a.y - m < b.y + b.h && a.y + a.h + m > b.y;
  const tapK = k => { G.press(k); tap = k; };
  G.bot = () => {
    if (tap) { G.release(tap); tap = null; }
    G.release('left'); G.release('right');
    if (P.state === 'dead' || G.menu) return;
    const pb = { x: P.x, y: P.y, w: P.w, h: P.h };
    const th = G.threats().filter(t => hit(t.box, pb, 10));
    const wave = th.find(t => t.label === 'boss:wave' && t.t <= 0.2);
    if (wave && (P.state === 'free' || (P.state === 'roll' && P.st > .36)) && P.onGround) { tapK('jump'); G.held.jump = true; return; }
    if (!P.onGround && P.vy < 0) G.held.jump = true; else G.held.jump = false;
    const soon = th.find(t => t.t <= (t.proj ? 0.12 : 0.09) && t.t > -0.05);
    if (soon && (P.state === 'free' || (P.state === 'attack' && P.st > P.move.wu + P.move.act))) {
      if (P.state === 'attack') P.state = 'free';
      const cx = soon.box.x + soon.box.w / 2; let away = (P.x + P.w / 2) < cx ? 'left' : 'right';
      const wallNear = away === 'left' ? P.x < 90 : P.x > G.room.w - 110; if (wallNear || soon.label === 'boss:wave') away = away === 'left' ? 'right' : 'left';
      G.press(away); tapK('roll'); return;
    }
    if (!opts.fight) return;
    const foes = G.foes().filter(e => e.hp > 0); if (!foes.length) return;
    const e = foes.reduce((a, b) => Math.abs(a.x - P.x) < Math.abs(b.x - P.x) ? a : b);
    const dx = (e.x + e.w / 2) - (P.x + P.w / 2), dist = Math.abs(dx), dir = dx > 0 ? 'right' : 'left';
    if (P.state !== 'free') return;
    if (P.hp < 50 && P.flasks > 0 && (e.state === 'recover' || dist > 120 || e.stagger > 0) && !th.length) { tapK('flask'); return; }
    const reach = WEAPONS[P.weapons[P.wi]].light.range + e.w / 2 - 6;
    const open = e.stagger > 0 || e.state === 'recover' || (e.state === 'idle' && e.cd > .4) || e.state === 'intro';
    if (th.length) { if (dist < 120) G.press(dx > 0 ? 'left' : 'right'); return; }
    if (e.stagger > 0 && e.parried && dist < 60) { tapK('light'); return; }
    if (dist > reach) { if (open || dist > 140 || P.stam > 60) G.press(dir); return; }
    if (open && P.stam > 25) { P.face = dx > 0 ? 1 : -1; tapK('light'); return; }
    if (P.stam < 30 && dist < 110) G.press(dx > 0 ? 'left' : 'right');
  };
};
