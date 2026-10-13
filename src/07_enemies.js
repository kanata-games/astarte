// ===== normal enemies (data-driven from ENEMIES) =====
class Foe {
  constructor(kind, x, y) { const d = ENEMIES[kind]; Object.assign(this, { kind, d, x, y, w: d.w, h: d.h, vx: 0, vy: 0, face: -1, hp: d.hp, state: 'idle', st: 0, t: rnd() * 5, atk: null, stagger: 0, parried: false, cd: .5, fly: !!d.fly, hx: x, hy: y, hitP: false, flash: 0 }); }
  atkBox() { const a = this.atk, cx = this.x + this.w / 2;
    if (a.dash) return { x: this.x - 2, y: this.y - 2, w: this.w + 4, h: this.h + 4 };
    const bot = this.y + this.h + (a.by ? a.by + a.bh / 2 : 0); return { x: this.face > 0 ? cx : cx - a.bw, y: bot - a.bh, w: a.bw, h: a.bh }; }
  damage(n, poise, dir, crit) {
    if (this.hp <= 0) return; this.hp -= n; this.flash = .1; SFX.hit(); fx(crit ? 'crit' : 'hit', this.x + this.w / 2, this.y + this.h / 2);
    if (this.hp <= 0) { this.die(); return; }
    if (!this.stagger && (poise >= this.d.poise || this.state !== 'active')) { if (this.state === 'windup' && poise < this.d.poise) return; this.state = 'idle'; this.stagger = .35; this.parried = false; this.vx = dir * 60; }
  }
  die() { this.hp = 0; STATS.kills++; G.gainSouls(this.d.souls, this.x + this.w / 2, this.y + this.h / 2); fx('death', this.x + this.w / 2, this.y + this.h / 2); }
  onParried() { this.state = 'idle'; this.stagger = 1.8; this.parried = true; this.vx = 0; }
  update(dt) {
    if (this.hp <= 0) return; this.t += dt; this.st += dt; this.flash -= dt;
    const room = G.room, px = P.x + P.w / 2, py = P.y + P.h / 2, cx = this.x + this.w / 2, cy = this.y + this.h / 2, dx = px - cx, dist = Math.abs(dx);
    if (this.stagger > 0) { this.stagger -= dt; if (this.stagger <= 0) { this.parried = false; this.stagger = 0; } this.vx *= .85; if (this.fly) this.vy = 0; moveBody(this, room, dt); return; }
    const sees = dist < this.d.sight && Math.abs(py - cy) < 140 && P.state !== 'dead';
    if (this.state === 'idle') {
      this.cd -= dt;
      if (sees) { this.face = dx > 0 ? 1 : -1;
        const a = this.d.attacks.find(a => dist < a.range && (!a.shot || Math.abs(py - cy) < 50) && (this.fly || Math.abs(py - cy) < 50 || a.shot));
        const fa = this.d.attacks.length > 1 && dist < 50 ? this.d.attacks[(this.t * 7 | 0) % 2] : a;
        if (fa && this.cd <= 0 && dist < fa.range) { this.atk = fa; this.state = 'windup'; this.st = 0; this.vx = 0; this.hitP = false; if (fa.dash) { this.tx = dx; this.ty = py - cy; } }
        else if (this.fly) { const tx = px - this.face * 80, ty = P.y - 30; this.vx = clamp(tx - cx, -1, 1) * this.d.speed; this.vy = clamp(ty - cy, -1, 1) * this.d.speed; }
        else if (this.d.keep && dist < this.d.keep) this.vx = -this.face * this.d.speed;
        else this.vx = dist > (a ? a.range * .7 : 30) ? this.face * this.d.speed : 0;
      } else { this.vx = this.fly ? Math.sin(this.t) * 10 : 0; if (this.fly) this.vy = Math.cos(this.t * 1.3) * 10; }
    } else if (this.state === 'windup') {
      const a = this.atk; this.vx = 0; if (this.fly) { this.vy = -8; }
      if (this.st >= a.wu) { this.state = 'active'; this.st = 0;
        if (a.shot) { const ang = Math.atan2(py - cy, dx); G.shots.push({ kind: 'orb', x: cx + this.face * 10 - 5, y: this.y + 8, w: 10, h: 10, vx: Math.cos(ang) * a.shot, vy: Math.sin(ang) * a.shot, dmg: a.dmg, life: 3.5, parry: false, label: this.kind }); }
        if (a.dash) { const l = Math.hypot(this.tx, this.ty) || 1; this.vx = this.tx / l * a.dash; this.vy = this.ty / l * a.dash; } }
    } else if (this.state === 'active') {
      const a = this.atk; if (!a.dash) this.vx = a.lunge ? this.face * a.lunge * (this.st < a.act ? 1 : 0) : 0;
      if (!a.shot && !this.hitP && overlap(this.atkBox(), P)) { const r = hurtPlayer(a.dmg, this, a.parry, this.kind + ':' + a.id); if (r !== 'dodged') this.hitP = true; }
      if (this.st >= a.act) { this.state = 'recover'; this.st = 0; }
    } else if (this.state === 'recover') { this.vx *= .85; if (this.fly) this.vy *= .9; if (this.st >= this.atk.rec) { this.state = 'idle'; this.cd = this.atk.cd * (.6 + rnd() * .5); } }
    if (!this.fly && this.vx && this.onGround) { const ahead = this.x + (this.vx > 0 ? this.w + 2 : -2); if (tileAt(room, ahead, this.y + this.h + 4) === 0) this.vx = 0; } // don't walk off ledges
    moveBody(this, room, dt);
    if (this.fly) { this.x = clamp(this.x, 4, room.w - this.w - 4); this.y = clamp(this.y, 34, VH - 60); }
  }
  // telegraph info for tests/bots: predicted danger box + seconds until it becomes active
  threat() { if (this.hp <= 0 || this.state !== 'windup' || this.atk.shot) return null; const a = this.atk;
    if (a.dash) return { box: { x: Math.min(this.x, this.x + this.tx) - 10, y: Math.min(this.y, this.y + this.ty) - 10, w: Math.abs(this.tx) + this.w + 20, h: Math.abs(this.ty) + this.h + 20 }, t: a.wu - this.st, dur: a.act, parry: a.parry, label: this.kind };
    const b = this.atkBox(); if (a.lunge) { b.w += a.lunge * a.act + 6; if (this.face < 0) b.x -= a.lunge * a.act + 6; }
    return { box: b, t: a.wu - this.st, dur: a.act, parry: a.parry, label: this.kind }; }
}
// ---- projectiles / hazards ----
function updateShots(dt) {
  for (const s of G.shots) {
    s.life -= dt; s.t = (s.t || 0) + dt;
    if (s.kind === 'pillar') { if (s.t >= s.warn && s.t < s.warn + s.act && !s.hitP && overlap(s, P)) { if (hurtPlayer(s.dmg, null, false, 'boss:toll') !== 'dodged') s.hitP = true; } continue; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.kind === 'orb' && tileAt(G.room, s.x + 5, s.y + 5) === 1) s.life = 0;
    if (!s.hitP && overlap(s, P)) { const r = hurtPlayer(s.dmg, s, s.parry, s.label); if (r !== 'dodged') { s.hitP = true; if (s.kind === 'orb') s.life = 0; } }
  }
  G.shots = G.shots.filter(s => s.life > 0);
}
