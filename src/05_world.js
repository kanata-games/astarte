// ===== world: rooms of the 月鐘の廃墟 =====
const ROWS = VH / T; // 18
const ROOM_DEFS = [
  { name: '月鐘の廃墟・前庭', theme: 'court', w: 36, decor: [['deadtree', 11, 15], ['grave', 14, 15], ['grave', 17, 15], ['statue', 24, 15, { broken: 1 }], ['rubble', 29, 15], ['grave', 32, 15], ['candelabra', 3, 15], ['ivy', 20, 15], ['pillar', 19, 15, { fg: 1, ivy: 1 }], ['chain', 34, 12, { fg: 1, hook: 1 }]], floor: [[0, 35, 15]], plats: [], bonfire: 6, spawns: [], exits: { right: 1 } },
  { name: '沈黙の回廊', theme: 'nave', w: 60, archOff: 120, archGap: 240, decor: [['window', 6, 12], ['window', 20, 12], ['window', 48, 12], ['banner', 13, 8], ['banner', 34, 7, { col: '#20244a' }], ['banner', 55, 8], ['candelabra', 3, 15], ['candelabra', 23, 15], ['candelabra', 44, 15], ['sconce', 30, 9], ['sconce', 38, 9], ['statue', 33, 13], ['rubble', 57, 15], ['pillar', 16, 15, { fg: 1 }], ['pillar', 41, 15, { fg: 1, ivy: 1 }], ['chain', 28, 9, { fg: 1, hook: 1 }]], floor: [[0, 25, 15], [26, 40, 13], [41, 59, 15]], plats: [[10, 16, 11], [44, 50, 10]],
    spawns: [{ k: 'husk', x: 18 }, { k: 'husk', x: 34 }, { k: 'guard', x: 52 }], exits: { left: 0, right: 2 } },
  { name: '星降る納骨堂', theme: 'crypt', w: 54, decor: [['web', 1, 2], ['web', 52, 2, { flip: 1 }], ['niche', 4, 13], ['niche', 10, 13], ['niche', 38, 13], ['niche', 45, 13], ['coffin', 16, 15], ['coffin', 49, 15], ['bones', 7, 15], ['bones', 24, 17], ['bones', 41, 15], ['cage', 20, 9], ['chain', 13, 7, { hook: 1 }], ['sconce', 30, 9], ['candelabra', 34, 11], ['pillar', 27, 17, { fg: 1 }], ['web', 26, 2, { fg: 1 }]], floor: [[0, 20, 15], [21, 27, 17], [28, 53, 15]], plats: [[30, 36, 11]], pickup: { w: 'pan', x: 33, row: 11 },
    spawns: [{ k: 'wisp', x: 14, row: 8 }, { k: 'husk', x: 24 }, { k: 'wisp', x: 40, row: 7 }, { k: 'acolyte', x: 48 }], exits: { left: 1, right: 3 } },
  { name: '鐘楼の階段', theme: 'tower', w: 44, archOff: 280, archGap: 400, decor: [['rosewin', 22, 7], ['chain', 8, 6, { hook: 1 }], ['cage', 33, 6], ['sconce', 7, 12], ['sconce', 17, 11], ['sconce', 29, 9], ['sconce', 39, 9], ['banner', 41, 8, { col: '#3a1418' }], ['window', 12, 12], ['statue', 36, 12], ['chain', 15, 10, { fg: 1, hook: 1 }], ['pillar', 26, 12, { fg: 1 }]], floor: [[0, 14, 15], [15, 19, 14], [20, 24, 13], [25, 43, 12]], plats: [], bonfire: 4,
    spawns: [{ k: 'guard', x: 31 }, { k: 'acolyte', x: 39 }, { k: 'wisp', x: 22, row: 6 }], exits: { left: 2, right: 4 }, fog: true },
  { name: '弔鐘の間', theme: 'belfry', w: 24, archOff: 900, decor: [['bigbell', 12, 9], ['sconce', 2, 12, { light: 2 }], ['sconce', 21, 12, { light: 2 }], ['banner', 5, 10, { col: '#5a1420' }], ['banner', 18, 10, { col: '#5a1420' }], ['rubble', 9, 15], ['rubble', 16, 15], ['chain', 4, 6, { hook: 1 }], ['chain', 19, 7, { hook: 1 }]], floor: [[0, 23, 15]], plats: [], boss: 16, spawns: [], exits: { left: 3 } },
];
function buildRoom(i) {
  const d = ROOM_DEFS[i], g = [];
  for (let y = 0; y < ROWS; y++) g.push(new Array(d.w).fill(0));
  if (d.theme !== 'court') for (let x = 0; x < d.w; x++) { g[0][x] = 1; g[1][x] = 1; }
  for (const [a, b, row] of d.floor) for (let x = a; x <= b; x++) for (let y = row; y < ROWS; y++) g[y][x] = 1;
  for (const [a, b, row] of d.plats) for (let x = a; x <= b; x++) g[row][x] = 2;
  if (d.exits.left === undefined) for (let y = 0; y < ROWS; y++) g[y][0] = 1;
  if (d.exits.right === undefined) for (let y = 0; y < ROWS; y++) g[y][d.w - 1] = 1;
  const room = { i, def: d, grid: g, w: d.w * T, h: VH }; bakeRoom(room); return room;
}
function floorY(room, tx) { for (let y = 2; y < ROWS; y++) if (room.grid[y][tx] === 1) return y * T; return VH; }
function tileAt(room, px, py) { const tx = Math.floor(px / T), ty = Math.floor(py / T); if (ty < 0 || ty >= ROWS) return 0; if (tx < 0 || tx >= room.def.w) return 0; return room.grid[ty][tx]; }
// axis-separated AABB vs tiles; one-way platforms block only when landing from above
function moveBody(o, room, dt) {
  o.x += o.vx * dt;
  const y0 = o.y + 1, y1 = o.y + o.h - 1;
  if (o.vx > 0) { for (let yy = y0; yy <= y1; yy += 8) if (tileAt(room, o.x + o.w, Math.min(yy, y1)) === 1) { o.x = Math.floor((o.x + o.w) / T) * T - o.w - .01; o.vx = 0; o.hitWall = 1; break; } }
  else if (o.vx < 0) { for (let yy = y0; yy <= y1; yy += 8) if (tileAt(room, o.x, Math.min(yy, y1)) === 1) { o.x = Math.floor(o.x / T + 1) * T + .01; o.vx = 0; o.hitWall = -1; break; } }
  if (o.fly) { o.y += o.vy * dt; return; }
  const prevBottom = o.y + o.h; o.vy = Math.min(o.vy + GRAV * dt, 700); o.y += o.vy * dt; o.onGround = false;
  const xs = [o.x + 2, o.x + o.w / 2, o.x + o.w - 2];
  if (o.vy >= 0) { for (const xx of xs) { const t = tileAt(room, xx, o.y + o.h); const top = Math.floor((o.y + o.h) / T) * T;
      if (t === 1 || (t === 2 && prevBottom <= top + 1 && !o.dropThrough)) { o.y = top - o.h; o.vy = 0; o.onGround = true; break; } } }
  else { for (const xx of xs) if (tileAt(room, xx, o.y) === 1) { o.y = Math.floor(o.y / T + 1) * T; o.vy = 0; break; } }
}
