// ===== world: rooms of the 月鐘の廃墟 =====
const ROWS = VH / T; // 18
const ROOM_DEFS = [
  { name: '月鐘の廃墟・前庭', w: 36, floor: [[0, 35, 15]], plats: [], bonfire: 6, spawns: [], exits: { right: 1 } },
  { name: '沈黙の回廊', w: 60, floor: [[0, 25, 15], [26, 40, 13], [41, 59, 15]], plats: [[10, 16, 11], [44, 50, 10]],
    spawns: [{ k: 'husk', x: 18 }, { k: 'husk', x: 34 }, { k: 'guard', x: 52 }], exits: { left: 0, right: 2 } },
  { name: '星降る納骨堂', w: 54, floor: [[0, 20, 15], [21, 27, 17], [28, 53, 15]], plats: [[30, 36, 11]], pickup: { w: 'pan', x: 33, row: 11 },
    spawns: [{ k: 'wisp', x: 14, row: 8 }, { k: 'husk', x: 24 }, { k: 'wisp', x: 40, row: 7 }, { k: 'acolyte', x: 48 }], exits: { left: 1, right: 3 } },
  { name: '鐘楼の階段', w: 44, floor: [[0, 14, 15], [15, 19, 14], [20, 24, 13], [25, 43, 12]], plats: [], bonfire: 4,
    spawns: [{ k: 'guard', x: 31 }, { k: 'acolyte', x: 39 }, { k: 'wisp', x: 22, row: 6 }], exits: { left: 2, right: 4 }, fog: true },
  { name: '弔鐘の間', w: 24, floor: [[0, 23, 15]], plats: [], boss: 16, exits: { left: 3 } },
];
function buildRoom(i) {
  const d = ROOM_DEFS[i], g = [];
  for (let y = 0; y < ROWS; y++) g.push(new Array(d.w).fill(0));
  for (let x = 0; x < d.w; x++) { g[0][x] = 1; g[1][x] = 1; }
  for (const [a, b, row] of d.floor) for (let x = a; x <= b; x++) for (let y = row; y < ROWS; y++) g[y][x] = 1;
  for (const [a, b, row] of d.plats) for (let x = a; x <= b; x++) g[row][x] = 2;
  if (d.exits.left === undefined) for (let y = 0; y < ROWS; y++) g[y][0] = 1;
  if (d.exits.right === undefined) for (let y = 0; y < ROWS; y++) g[y][d.w - 1] = 1;
  return { i, def: d, grid: g, w: d.w * T, h: VH };
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
