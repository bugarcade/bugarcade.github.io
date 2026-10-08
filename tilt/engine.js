// TILT engine: level generation, move simulation and BFS solver.
// Shared by the game page and the node test script.
(function (root) {
  const WALL = 1, PIT = 2;
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const DIR_KEYS = ['up', 'right', 'down', 'left'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Slide every loose piece in `dir`. Pieces 0..balls-1 are balls, the rest are crates.
  // A crate that ends on a pit fills it (becomes floor, stops moving).
  // Returns { pos, fell (ball index or -1), moved, dist[] }.
  function step(lv, pos, dir) {
    const [dx, dy] = DIRS[dir];
    const W = lv.w, H = lv.h, n = pos.length;
    const filled = new Set();
    for (let i = lv.balls; i < n; i++) if (lv.cells[pos[i]] === PIT) filled.add(pos[i]);
    const out = pos.slice();
    const dist = new Array(n).fill(0);
    const movers = [];
    for (let i = 0; i < n; i++) if (!(i >= lv.balls && filled.has(pos[i]))) movers.push(i);
    // front-most piece first, so pieces behind stack up against it
    const proj = (i) => (pos[i] % W) * dx + Math.floor(pos[i] / W) * dy;
    movers.sort((a, b) => proj(b) - proj(a));
    const occ = new Set(movers.map((i) => pos[i]));
    let fell = -1, moved = false;
    for (const i of movers) {
      let c = pos[i];
      occ.delete(c);
      let x = c % W, y = (c / W) | 0, d = 0, gone = false;
      for (;;) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) break;
        const nc = ny * W + nx;
        if (lv.cells[nc] === WALL || occ.has(nc)) break;
        x = nx; y = ny; d++;
        if (lv.cells[nc] === PIT && !filled.has(nc)) {
          gone = true;
          if (i >= lv.balls) filled.add(nc);
          else if (fell < 0) fell = i;
          break;
        }
      }
      out[i] = y * W + x;
      dist[i] = d;
      if (d) moved = true;
      if (!gone) occ.add(out[i]);
    }
    return { pos: out, fell, moved, dist };
  }

  function isWin(lv, pos) {
    for (let i = 0; i < lv.balls; i++) if (pos[i] !== lv.goals[i]) return false;
    return true;
  }

  function key(pos) {
    let k = 0;
    for (let i = 0; i < pos.length; i++) k = k * 64 + pos[i];
    return k;
  }

  // Breadth-first search. Returns the shortest list of directions, or null.
  function solve(lv, start, maxDepth = 40, cap = 250000) {
    if (isWin(lv, start)) return [];
    const seen = new Map([[key(start), null]]);
    let frontier = [start];
    for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
      const next = [];
      for (const p of frontier) {
        const pk = key(p);
        for (const d of DIR_KEYS) {
          const r = step(lv, p, d);
          if (!r.moved || r.fell >= 0) continue;
          const k = key(r.pos);
          if (seen.has(k)) continue;
          seen.set(k, [pk, d]);
          if (isWin(lv, r.pos)) {
            const path = [];
            let cur = k;
            while (seen.get(cur)) { const [pk2, d2] = seen.get(cur); path.push(d2); cur = pk2; }
            return path.reverse();
          }
          next.push(r.pos);
        }
      }
      if (seen.size > cap) return null;
      frontier = next;
    }
    return null;
  }

  function tierFor(n) {
    if (n <= 2) return { w: 5, h: 5, balls: 1, crates: 0, pits: 0, walls: [3, 5], lo: 2, hi: 3 };
    if (n <= 3) return { w: 5, h: 5, balls: 1, crates: 0, pits: 0, walls: [3, 5], lo: 3, hi: 4 };
    if (n <= 7) return { w: 6, h: 6, balls: 1, crates: 0, pits: 2, walls: [4, 7], lo: 3, hi: 6 };
    if (n <= 12) return { w: 6, h: 6, balls: 2, crates: 0, pits: 0, walls: [4, 7], lo: 4, hi: 8 };
    if (n <= 18) return { w: 6, h: 6, balls: 2, crates: 0, pits: 2, walls: [4, 7], lo: 5, hi: 9 };
    if (n <= 24) return { w: 7, h: 7, balls: 1, crates: 1, pits: 3, walls: [5, 9], lo: 6, hi: 11 };
    if (n <= 35) return { w: 7, h: 7, balls: 2, crates: 1, pits: 2, walls: [5, 9], lo: 7, hi: 12 };
    if (n <= 50) return { w: 7, h: 7, balls: 3, crates: 0, pits: 2, walls: [6, 10], lo: 7, hi: 13 };
    return { w: 7, h: 7, balls: 2 + (n % 2), crates: 1 - (n % 2), pits: 2, walls: [6, 10], lo: 8, hi: 14 };
  }
  const DAILY_TIER = { w: 7, h: 7, balls: 2, crates: 1, pits: 2, walls: [5, 9], lo: 8, hi: 15 };

  function randomLevel(rng, t) {
    const W = t.w, H = t.h, N = W * H;
    const cells = new Array(N).fill(0);
    const free = [];
    for (let i = 0; i < N; i++) free.push(i);
    const take = () => free.splice((rng() * free.length) | 0, 1)[0];
    const nw = t.walls[0] + ((rng() * (t.walls[1] - t.walls[0] + 1)) | 0);
    for (let i = 0; i < nw; i++) cells[take()] = WALL;
    for (let i = 0; i < t.pits; i++) cells[take()] = PIT;
    const pos = [];
    for (let i = 0; i < t.balls + t.crates; i++) pos.push(take());
    return { w: W, h: H, cells, balls: t.balls, goals: [], start: pos };
  }

  // BFS over every reachable state; remembers the first depth at which each
  // arrangement of the balls (ignoring crates) appears.
  function explore(lv, start, maxDepth, cap = 120000) {
    const ballKey = (p) => key(p.slice(0, lv.balls));
    const seen = new Set([key(start)]);
    const depthOf = new Map([[ballKey(start), 0]]);
    let frontier = [start];
    for (let depth = 1; depth <= maxDepth && frontier.length && seen.size < cap; depth++) {
      const next = [];
      for (const p of frontier) {
        for (const d of DIR_KEYS) {
          const r = step(lv, p, d);
          if (!r.moved || r.fell >= 0) continue;
          const k = key(r.pos);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push(r.pos);
          const bk = ballKey(r.pos);
          if (!depthOf.has(bk)) depthOf.set(bk, { depth, pos: r.pos });
        }
      }
      frontier = next;
    }
    return depthOf;
  }

  // Deterministic: same seed -> same level on every device.
  // Goals are taken from the hardest-to-reach ball arrangement, so every level
  // is solvable and its par is the true optimum.
  function generate(seed, t) {
    const rng = mulberry32(seed);
    let best = null;
    for (let a = 0; a < 60; a++) {
      const lv = randomLevel(rng, t);
      const reach = explore(lv, lv.start, t.hi);
      const cands = [];
      let top = 0;
      for (const v of reach.values()) {
        if (!v.pos) continue;
        const balls = v.pos.slice(0, lv.balls);
        if (balls.some((c, i) => c === lv.start[i])) continue; // every ball must travel
        if (v.depth > top) { top = v.depth; cands.length = 0; }
        if (v.depth === top) cands.push(balls);
      }
      if (top < t.lo || (best && top <= best.par)) continue;
      lv.goals = cands[(rng() * cands.length) | 0];
      const sol = solve(lv, lv.start, top);
      if (!sol || sol.length !== top) continue;
      if (t.crates && !crateMatters(lv, top)) continue;
      lv.par = top; lv.solution = sol; best = lv;
      if (top >= t.hi - 1) break;
    }
    return best;
  }

  // A crate level is only interesting if the crate changes the answer.
  function crateMatters(lv, par) {
    const noCrate = Object.assign({}, lv, { start: lv.start.slice(0, lv.balls) });
    const s = solve(noCrate, noCrate.start, par);
    return !s || s.length !== par;
  }

  const cache = new Map();
  function level(n) {
    if (!cache.has(n)) cache.set(n, generate(hashStr('tilt-level-' + n), tierFor(n)));
    return cache.get(n);
  }
  function daily(dateStr) {
    const k = 'daily-' + dateStr;
    if (!cache.has(k)) cache.set(k, generate(hashStr('tilt-daily-' + dateStr), DAILY_TIER));
    return cache.get(k);
  }

  const api = { WALL, PIT, DIRS, DIR_KEYS, step, isWin, solve, level, daily, tierFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tilt = api;
})(this);
