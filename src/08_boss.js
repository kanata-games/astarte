// ===== boss: 弔鐘の騎士 ノクターン =====
class Boss {
  constructor(x, y) { Object.assign(this, { kind: 'boss', x, y, w: BOSS.w, h: BOSS.h, vx: 0, vy: 0, face: -1, hp: BOSS.hp, state: 'intro', st: 0, t: 0, atk: null, atkId: null, stagger: 0, parried: false, cd: 1.2, phase2: false, n: 0, flash: 0 }); }
  sc() { return this.phase2 ? .82 : 1; }
  damage(n, poise, dir, crit) { if (this.hp <= 0 || this.state === 'intro') return; this.hp -= n * (crit ? 1 : 1); this.flash = .1; SFX.hit(); fx(crit ? 'crit' : 'hit', this.x + this.w / 2, this.y + 30);
    if (!this.phase2 && this.hp < BOSS.hp / 2) { this.phase2 = true; G.toast('ノクターンの鐘が狂い鳴る…'); SFX.bell(); }
    if (this.hp <= 0) { this.hp = 0; STATS.kills++; G.bossDefeated(this); } }
  onParried() { this.state = 'idle'; this.stagger = 1.6; this.parried = true; this.vx = 0; this.cd = .8; }
  pick(dist) {
    this.n++;
    if (this.phase2 && this.n % 4 === 0) return 'toll';
    if (dist > 150) return 'leap';
    if (dist < 110) return (this.n % 3 === 1) ? 'sweep' : 'cleave';
    return this.n % 2 ? 'leap' : 'sweep';
  }
  start(id) { this.atkId = id; this.atk = BOSS.attacks[id]; this.state = 'windup'; this.st = 0; this.vx = 0; this.hitP = false;
    if (id === 'toll') { SFX.bell(); const px = P.x + P.w / 2; const xs = [px - 14]; for (let k = 1; k < 5; k++) { xs.push(px - 14 + k * 112); xs.push(px - 14 - k * 112); }
      for (const x of xs) if (x > 16 && x < G.room.w - 44) G.shots.push({ kind: 'pillar', x, y: 32, w: 28, h: 208, warn: this.atk.wu * this.sc(), act: this.atk.act, t: 0, life: this.atk.wu * this.sc() + this.atk.act + .1, dmg: this.atk.dmg }); } }
  box() { const a = this.atk, cx = this.x + this.w / 2, bot = this.y + this.h;
    if (this.atkId === 'leap') return { x: cx - a.bw, y: bot - a.bh, w: a.bw * 2, h: a.bh };
    return { x: this.face > 0 ? cx : cx - a.bw, y: bot - a.bh, w: a.bw, h: a.bh }; }
  update(dt) {
    this.t += dt; this.st += dt; this.flash -= dt; const room = G.room;
    if (this.hp <= 0) { this.vx = 0; moveBody(this, room, dt); return; }
    const px = P.x + P.w / 2, cx = this.x + this.w / 2, dx = px - cx, dist = Math.abs(dx);
    if (this.state === 'intro') { if (this.st > 1.2) { this.state = 'idle'; this.st = 0; } moveBody(this, room, dt); return; }
    if (this.stagger > 0) { this.stagger -= dt; if (this.stagger <= 0) { this.stagger = 0; this.parried = false; } this.vx = 0; moveBody(this, room, dt); return; }
    const a = this.atk;
    if (this.state === 'idle') { this.cd -= dt; this.face = dx > 0 ? 1 : -1;
      this.vx = dist > 90 ? this.face * 55 : 0;
      if (this.cd <= 0 && P.state !== 'dead') this.start(this.pick(dist)); }
    else if (this.state === 'windup') { const wu = a.wu * this.sc();
      if (this.atkId === 'cleave') this.face = dx > 0 ? 1 : -1;
      if (this.st >= wu) {
        if (this.atkId === 'leap') { this.state = 'air'; this.st = 0; const tx = clamp(px - this.w / 2, 20, room.w - this.w - 20); this.vy = -360; this.vx = (tx - this.x) / .8; this.face = dx > 0 ? 1 : -1; }
        else { this.state = 'active'; this.st = 0; } } }
    else if (this.state === 'air') { if (this.onGround && this.st > .1) { this.state = 'active'; this.st = 0; this.vx = 0; G.shake = .3;
        for (const d of [-1, 1]) G.shots.push({ kind: 'wave', x: this.x + this.w / 2 - 8, y: this.y + this.h - 22, w: 16, h: 22, vx: d * a.wave, vy: 0, dmg: 18, life: 1.6, parry: false, label: 'boss:wave' }); } }
    else if (this.state === 'active') {
      this.vx = a.lunge && this.st < a.act ? this.face * a.lunge : 0;
      if (this.atkId !== 'toll' && !this.hitP && overlap(this.box(), P)) { const r = hurtPlayer(a.dmg, this, a.parry, 'boss:' + this.atkId); if (r !== 'dodged') this.hitP = true; }
      if (this.st >= a.act) { this.state = 'recover'; this.st = 0; } }
    else if (this.state === 'recover') { this.vx = 0; if (this.st >= a.rec * this.sc()) { this.state = 'idle'; this.cd = (this.phase2 ? .35 : .6) + rnd() * .4; } }
    moveBody(this, room, dt); this.x = clamp(this.x, 16, room.w - this.w - 16);
  }
  threat() { if (this.hp <= 0) return null; const a = this.atk;
    if (this.state === 'windup' && this.atkId !== 'toll' && this.atkId !== 'leap') { const b = this.box(); if (a.lunge) { b.w += 14; if (this.face < 0) b.x -= 14; } return { box: b, t: a.wu * this.sc() - this.st, dur: a.act, parry: a.parry, label: 'boss:' + this.atkId }; }
    if (this.state === 'air' && this.vy > 0) { return { box: { x: this.x - 50, y: this.y, w: this.w + 100, h: this.h + 40 }, t: Math.max(0, (G.room.h - 48 - this.y - this.h) / Math.max(60, this.vy)), dur: a.act, parry: false, label: 'boss:leap' }; }
    return null; }
}
