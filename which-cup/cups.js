// WHICH CUP?: a tap pours into the top cup, pipes carry the overflow down to other cups. Which one fills first?
// Pure model + simulation (no drawing), seeded so every level and daily puzzle is the same for everyone.
// World units: the board is 100 wide; y grows downward. A cup stands on a shelf: bottom = shelf y.
(function (root) {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  const SHELVES = [40, 76, 112];
  const SLOTS = [[50], [26, 74], [13, 38, 62, 87]];
  const EPS = 1e-9;

  // cups: { id, row, x, w, h, shelf, outs: [{ side: -1|1, h, to, clogged }] }
  function generate(rng, { cups: want, clogs, maxRow = 2 }) {
    const pick = (a, b) => a + rng() * (b - a);
    const cups = [{ id: 0, row: 0, slot: 0 }];
    // grow a binary tree, breadth first, until we have enough cups
    const open = [cups[0]];
    while (cups.length < want && open.length) {
      const p = open.splice(Math.floor(rng() * Math.min(2, open.length)), 1)[0];
      if (p.row >= maxRow) continue;
      for (const side of [-1, 1]) {
        if (cups.length >= want) break;
        if (p !== cups[0] && rng() < .25) continue;
        const c = { id: cups.length, row: p.row + 1, slot: p.slot * 2 + (side > 0 ? 1 : 0), parent: p.id, side };
        cups.push(c); open.push(c);
      }
    }
    for (const c of cups) {
      c.x = SLOTS[c.row][c.slot];
      c.shelf = SHELVES[c.row];
      c.w = c.row === 2 ? pick(9, 14) : pick(10, 17);
      c.h = pick(11, 22);
      c.outs = [];
    }
    for (const c of cups) if (c.parent !== undefined) {
      const p = cups[c.parent];
      p.outs.push({ side: c.side, h: pick(.12, .85) * p.h, to: c.id, clogged: false });
    }
    // sometimes two outlets sit at the same height and share the flow
    for (const c of cups) if (c.outs.length === 2 && rng() < .2) c.outs[1].h = c.outs[0].h;
    // clog some pipes, but never every way out of the top cup
    const pipes = cups.flatMap((c) => c.outs.map((o) => ({ c, o })));
    for (let k = 0; k < clogs && pipes.length; k++) {
      const { c, o } = pipes.splice(Math.floor(rng() * pipes.length), 1)[0];
      if (c.id === 0 && c.outs.filter((q) => !q.clogged).length <= 1) continue;
      o.clogged = true;
    }
    return cups;
  }

  // ---------- simulation ----------
  // The tap pours 1 unit/s into cup 0. A cup rises until it reaches its lowest open outlet (then everything
  // it receives leaves through the outlet(s) at that height) or its rim (then it is full and spills on the shelf).
  const limitOf = (c) => {
    const o = c.outs.filter((q) => !q.clogged).map((q) => q.h);
    return o.length ? Math.min(c.h, ...o) : c.h;
  };
  function flows(cups, level) {
    const inflow = cups.map(() => 0), out = cups.map(() => []);
    inflow[0] = 1;
    for (const c of cups) { // cups are in tree order, parents first
      const lim = limitOf(c);
      if (level[c.id] < lim - EPS || inflow[c.id] <= 0) continue;
      const outs = c.outs.filter((q) => !q.clogged && Math.abs(q.h - lim) < EPS);
      if (lim < c.h - EPS && outs.length) for (const q of outs) { inflow[q.to] += inflow[c.id] / outs.length; out[c.id].push(q); }
    }
    return { inflow, out };
  }
  // state at time t: levels, which pipes run, when each cup filled
  function simulate(cups, tEnd = Infinity) {
    const level = cups.map(() => 0), full = cups.map(() => Infinity);
    let t = 0;
    for (let guard = 0; guard < 200; guard++) {
      const { inflow, out } = flows(cups, level);
      let dt = Infinity;
      for (const c of cups) {
        const lim = limitOf(c);
        if (inflow[c.id] > 0 && level[c.id] < lim - EPS) dt = Math.min(dt, (lim - level[c.id]) * c.w / inflow[c.id]);
      }
      const step = Math.min(dt, tEnd - t);
      if (!isFinite(step)) return { t, level, full, inflow, out, done: true };
      for (const c of cups) {
        const lim = limitOf(c);
        if (inflow[c.id] > 0 && level[c.id] < lim - EPS) {
          level[c.id] = Math.min(lim, level[c.id] + step * inflow[c.id] / c.w);
          if (level[c.id] >= c.h - EPS && full[c.id] === Infinity) full[c.id] = t + step;
        }
      }
      t += step;
      if (t >= tEnd - EPS) { const f = flows(cups, level); return { t, level, full, inflow: f.inflow, out: f.out, done: false }; }
    }
    return { t, level, full, done: true };
  }
  function answerOf(cups) {
    const { full } = simulate(cups);
    const order = cups.map((c) => c.id).filter((i) => full[i] < Infinity).sort((a, b) => full[a] - full[b]);
    return { first: order[0], firstT: full[order[0]], second: order[1], secondT: order.length > 1 ? full[order[1]] : Infinity, full };
  }
  // what a hasty player picks: the nearest cup (by pipe steps) that has no open outlet
  function naiveOf(cups) {
    const depth = (c) => (c.parent === undefined ? 0 : 1 + depth(cups[c.parent]));
    const reach = new Set([0]);
    for (const c of cups) if (reach.has(c.id)) for (const o of c.outs) if (!o.clogged) reach.add(o.to);
    const leafs = cups.filter((c) => reach.has(c.id) && limitOf(c) >= c.h - EPS);
    leafs.sort((a, b) => depth(a) - depth(b) || a.w * a.h - b.w * b.h);
    return leafs.length ? leafs[0].id : -1;
  }

  // ---------- levels ----------
  const LEVELS = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return { cups: n <= 3 ? 3 : n <= 8 ? 4 : n <= 14 ? 5 : n <= 22 ? 6 : 7, clogs: n <= 3 ? 0 : n <= 8 ? 1 : n <= 18 ? 2 : 3 };
  });
  // best level of a batch: the obvious pick is wrong, and it is a race (two or more cups fill)
  function make(p, key, wantTrap) {
    let best = null, bestScore = -1;
    for (let k = 0; k < 160; k++) {
      const rng = mulberry32(hash(`${key}-${k}`));
      const cups = generate(rng, p);
      if (cups.length < p.cups) continue;
      const a = answerOf(cups);
      if (a.first === undefined || a.first === 0) continue;
      if (a.secondT < a.firstT * 1.12) continue;            // no photo finishes
      const lv = { cups, answer: a.first, fillT: a.firstT, full: a.full };
      const score = (!wantTrap || naiveOf(cups) !== a.first ? 2 : 0) + (a.second !== undefined ? 1 : 0);
      if (score === 3) return lv;
      if (score > bestScore) { best = lv; bestScore = score; }
    }
    return best;
  }
  function level(n) {
    const p = LEVELS[(n - 1) % LEVELS.length];
    return Object.assign(make(p, `cup-${n}`, n > 2), { n });
  }
  function daily(dateStr) {
    const r = hash('cupday-' + dateStr);
    return Object.assign(make({ cups: 6 + (r % 2), clogs: 2 + ((r >>> 3) % 2) }, 'cupday-' + dateStr, true), { n: 0, daily: true });
  }
  const LETTERS = 'ABCDEFG';
  // letters in reading order: row by row, left to right
  const labels = (cups) => {
    const order = [...cups].sort((a, b) => a.row - b.row || a.x - b.x);
    const l = []; order.forEach((c, i) => (l[c.id] = LETTERS[i])); return l;
  };

  const api = { level, daily, simulate, answerOf, naiveOf, limitOf, labels, LEVELS, SHELVES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Cups = api;
})(typeof window !== 'undefined' ? window : globalThis);
