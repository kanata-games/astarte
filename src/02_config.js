// ===== data: weapons / enemies / boss =====
const VW = 384, VH = 288, T = 16, DT = 1 / 60, GRAV = 900;
// Weapons are pure data: add a new entry (and a draw style in 04_art.js) to add a weapon.
// move fields: wu=windup s, act=active s, rec=recovery s, dmg, stam, range px (in front), h=hitbox height, lunge px/s during windup+active,
// arc = [startAngle, endAngle] of the weapon sprite through the swing (radians, 0 = forward, negative = up)
const WEAPONS = {
  scythe: { name: '星詠みの大鎌', draw: 'scythe', riposteMul: 3.0,
    light: { wu: .22, act: .12, rec: .30, dmg: 34, stam: 18, range: 70, h: 56, lunge: 60, arc: [-2.2, .9], poise: 20 },
    heavy: { wu: .55, act: .16, rec: .45, dmg: 80, stam: 36, range: 84, h: 78, lunge: 40, arc: [-2.8, 1.3], poise: 60 },
    parry: { window: .20, stam: 14, dur: .45 } },
  pan: { name: 'ミャオのフライパン', draw: 'pan', riposteMul: 4.0,
    light: { wu: .12, act: .08, rec: .18, dmg: 18, stam: 10, range: 36, h: 36, lunge: 50, arc: [-1.8, .6], poise: 10 },
    heavy: { wu: .40, act: .12, rec: .30, dmg: 48, stam: 26, range: 42, h: 48, lunge: 90, arc: [-2.6, 1.0], poise: 80 },
    parry: { window: .28, stam: 10, dur: .40 } },   // light weapon = generous parry, big riposte
};
// Enemies. attack.parry=true -> white telegraph flash (parryable), false -> red (dodge it).
const ENEMIES = {
  husk:   { name: '亡者', hp: 70, souls: 40, w: 22, h: 48, speed: 38, sight: 170, poise: 30, col: '#7d8a7a',
    attacks: [{ id: 'claw', range: 48, wu: .65, act: .15, rec: .7, dmg: 18, bw: 42, bh: 42, lunge: 70, parry: true, cd: 1.2 }] },
  guard:  { name: '骸の衛兵', hp: 110, souls: 75, w: 25, h: 56, speed: 30, sight: 190, poise: 50, col: '#c8c2b0',
    attacks: [{ id: 'thrust', range: 87, wu: .8, act: .14, rec: .8, dmg: 24, bw: 84, bh: 14, by: -34, lunge: 40, parry: true, cd: 1.5 },
              { id: 'chop', range: 50, wu: .7, act: .15, rec: .8, dmg: 28, bw: 48, bh: 50, lunge: 30, parry: false, cd: 1.6 }] },
  wisp:   { name: '迷い火', hp: 40, souls: 30, w: 20, h: 20, speed: 55, sight: 180, fly: true, poise: 5, col: '#7fb8ff',
    attacks: [{ id: 'dive', range: 168, wu: .75, act: .45, rec: .9, dmg: 14, bw: 22, bh: 22, parry: false, cd: 1.8, dash: 260 }] },
  acolyte:{ name: '鐘の侍祭', hp: 55, souls: 55, w: 22, h: 48, speed: 30, sight: 230, keep: 154, poise: 15, col: '#8c5aa8',
    attacks: [{ id: 'orb', range: 308, wu: .9, act: .05, rec: 1.0, dmg: 16, parry: false, cd: 2.2, shot: 110 }] },
};
const BOSS = { name: '弔鐘の騎士 ノクターン', hp: 950, souls: 2000, w: 48, h: 84, poise: 999,
  // per-attack data; phase 2 (<50% hp) scales windups by .82
  attacks: {
    cleave: { range: 98, wu: .85, act: .16, rec: .85, dmg: 32, bw: 90, bh: 84, lunge: 60, parry: true },
    sweep:  { range: 154, wu: .8, act: .18, rec: .9, dmg: 26, bw: 146, bh: 25, parry: false },
    leap:   { range: 1399, wu: .6, act: .15, rec: 1.0, dmg: 30, bw: 84, bh: 42, parry: false, wave: 115 },
    toll:   { range: 1399, wu: 1.0, act: .25, rec: 1.0, dmg: 22, parry: false },
  } };
const LEVEL_COST = lv => 120 + lv * 60;
