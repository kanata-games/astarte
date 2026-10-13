// ===== core: canvas, input, utils =====
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;
const Q = new URLSearchParams(location.search), TESTMODE = Q.has('test');
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
let RNG = 12345; const rnd = () => (RNG = (RNG * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ---- input: actions held + pressed-this-frame (with a short buffer) ----
const ACT = ['left', 'right', 'up', 'down', 'jump', 'light', 'heavy', 'roll', 'parry', 'flask', 'swap', 'start'];
const held = {}, buf = {};
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', KeyE: 'up', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyK: 'jump', KeyZ: 'light', KeyJ: 'light', KeyX: 'heavy', KeyU: 'heavy', KeyC: 'roll', KeyL: 'roll', ShiftLeft: 'roll', ShiftRight: 'roll',
  KeyV: 'parry', KeyI: 'parry', KeyF: 'flask', KeyR: 'flask', KeyQ: 'swap', Enter: 'start', Escape: 'start' };
function press(a) { if (!held[a]) buf[a] = 0.15; held[a] = true; }
function release(a) { held[a] = false; }
addEventListener('keydown', e => { const a = KEYMAP[e.code]; if (a) { press(a); e.preventDefault(); } audioInit(); });
addEventListener('keyup', e => { const a = KEYMAP[e.code]; if (a) release(a); });
function pressed(a) { if (buf[a] > 0) { buf[a] = 0; return true; } return false; }
function peek(a) { return buf[a] > 0; }
function tickInput(dt) { for (const k in buf) buf[k] = Math.max(0, buf[k] - dt); }

// ---- touch pad ----
const TOUCH = [
  { a: 'left', l: '◀', x: .04, y: .80, s: 64, sq: 1 }, { a: 'right', l: '▶', x: .24, y: .80, s: 64, sq: 1 }, { a: 'up', l: '▲', x: .14, y: .66, s: 52, sq: 1 },
  { a: 'light', l: '軽', x: .86, y: .74, s: 62 }, { a: 'heavy', l: '重', x: .86, y: .58, s: 52 }, { a: 'jump', l: '跳', x: .70, y: .84, s: 58 },
  { a: 'roll', l: '転', x: .70, y: .66, s: 54 }, { a: 'parry', l: '弾', x: .55, y: .84, s: 50 }, { a: 'flask', l: '薬', x: .04, y: .06, s: 44, sq: 1 },
  { a: 'swap', l: '換', x: .16, y: .06, s: 44, sq: 1 }, { a: 'start', l: '≡', x: .90, y: .06, s: 40, sq: 1 } ];
const touchEl = document.getElementById('touch');
for (const b of TOUCH) {
  const d = document.createElement('div'); d.className = 'tb' + (b.sq ? ' sq' : ''); d.textContent = b.l; b.el = d; touchEl.appendChild(d);
  const on = e => { e.preventDefault(); press(b.a); d.classList.add('on'); audioInit(); }, off = e => { e.preventDefault(); release(b.a); d.classList.remove('on'); };
  d.addEventListener('touchstart', on, { passive: false }); d.addEventListener('touchend', off, { passive: false }); d.addEventListener('touchcancel', off, { passive: false });
  d.addEventListener('mousedown', on); d.addEventListener('mouseup', off); d.addEventListener('mouseleave', off);
}
if ('ontouchstart' in window || navigator.maxTouchPoints > 0 || Q.has('touch')) touchEl.classList.add('on');
function layout() {
  const W = innerWidth, H = innerHeight, s = Math.max(1, Math.min(W / VW, H / VH));
  const gw = VW * s, gh = VH * s, top = (touchEl.classList.contains('on') && H > W) ? Math.max(0, H * .12) : (H - gh) / 2;
  Object.assign(cv.style, { width: gw + 'px', height: gh + 'px', left: (W - gw) / 2 + 'px', top: top + 'px' });
  for (const b of TOUCH) Object.assign(b.el.style, { left: b.x * W + 'px', top: b.y * H + 'px', width: b.s + 'px', height: b.s + 'px' });
}
addEventListener('resize', layout); layout();

// ---- tiny synth sfx ----
let AC = null;
function audioInit() { if (AC || TESTMODE) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
function sfx(f, d = .08, type = 'square', vol = .06, slide = 0) {
  if (!AC) return; const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + .02);
}
const SFX = { swing: () => sfx(300, .07, 'triangle', .05, -200), hit: () => sfx(140, .1, 'square', .07, -80), parry: () => { sfx(1400, .25, 'triangle', .08, -300); sfx(2100, .18, 'sine', .05) },
  roll: () => sfx(90, .1, 'sine', .05), hurt: () => sfx(220, .18, 'sawtooth', .06, -150), bell: () => { sfx(330, .9, 'sine', .07); sfx(495, .7, 'sine', .04) }, souls: () => sfx(880, .2, 'sine', .05, 400),
  whoosh: () => { sfx(180, .16, 'triangle', .05, -120); sfx(90, .2, 'sine', .04) }, swish: () => sfx(520, .06, 'triangle', .04, -250),
  bonk: () => { sfx(240, .12, 'square', .06, -60); sfx(720, .25, 'sine', .04) }, clang: () => { sfx(988, .9, 'sine', .07); sfx(1480, .7, 'sine', .04); sfx(2220, .5, 'triangle', .03); sfx(660, 1.1, 'sine', .04) },
  heal: () => sfx(520, .3, 'sine', .05, 300), die: () => sfx(160, .8, 'sawtooth', .06, -120) };
