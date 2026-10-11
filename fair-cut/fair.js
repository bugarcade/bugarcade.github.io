// FAIR CUT: one straight cut that splits the cake AND the cherries (or the chocolate) exactly in half.
// The ham sandwich theorem guarantees such a cut always exists; solve() finds it numerically.
// Reuses the shapes from FIFTY/FIFTY (window.Fifty or require('../fifty-fifty/shapes.js')).
(function (root) {
  const Fifty = root.Fifty || (typeof require !== 'undefined' ? require('../fifty-fifty/shapes.js') : null);
  const TAU = Math.PI * 2;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------- geometry ----------
  function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; a += x1 * y2 - x2 * y1; } return Math.abs(a / 2); }
  function clip(poly, side) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  // a "region" is { outer: [...], holes: [[...]] } or a list of them
  const regions = (r) => (Array.isArray(r) ? r : [r]);
  function regionArea(r, side) {
    let s = 0;
    for (const g of regions(r)) {
      const o = side ? clip(g.outer, side) : g.outer;
      s += o.length > 2 ? area(o) : 0;
      for (const h of g.holes || []) { const c = side ? clip(h, side) : h; s -= c.length > 2 ? area(c) : 0; }
    }
    return s;
  }
  function pointIn(poly, [x, y]) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const inCake = (cake, p) => pointIn(cake.outer, p) && !(cake.holes || []).some((h) => pointIn(h, p));
  const disc = (cx, cy, r, n = 20) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return { outer: p, holes: [] }; };

  // the line: direction angle `ang`, signed offset `off` along its normal
  const sideFn = (ang, off, s = 1) => { const nx = -Math.sin(ang), ny = Math.cos(ang); return (p) => s * (p[0] * nx + p[1] * ny - off); };
  function lineFromPoints(p, q) {
    const ang = Math.atan2(q[1] - p[1], q[0] - p[0]), nx = -Math.sin(ang), ny = Math.cos(ang);
    return { ang, off: p[0] * nx + p[1] * ny };
  }
  // shares of the "left" side for both measures
  function shares(lv, line) {
    const side = sideFn(line.ang, line.off);
    const cA = regionArea(lv.cake, side), cT = lv.cakeArea;
    const eA = regionArea(lv.extra, side), eT = lv.extraArea;
    return { cake: cA / cT, extra: eA / eT };
  }
  // offset that halves the cake for a given direction
  function cakeBisector(lv, ang) {
    let lo = -2, hi = 2;
    for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; (regionArea(lv.cake, sideFn(ang, m)) / lv.cakeArea > .5 ? (lo = m) : (hi = m)); }
    return (lo + hi) / 2;
  }
  // ham sandwich: walk the direction until the cake bisector also halves the extra measure
  function solve(lv) {
    const f = (ang) => shares(lv, { ang, off: cakeBisector(lv, ang) }).extra - .5;
    const N = 180; let prev = f(0), a0 = 0;
    for (let i = 1; i <= N; i++) {
      const a = i / N * Math.PI, v = f(a);
      if ((prev <= 0) !== (v <= 0)) {
        let lo = a0, hi = a, flo = prev;
        for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2, fm = f(m); if ((flo <= 0) === (fm <= 0)) { lo = m; flo = fm; } else hi = m; }
        const ang = (lo + hi) / 2;
        return { ang, off: cakeBisector(lv, ang) };
      }
      prev = v; a0 = a;
    }
    return null; // cannot happen: f(π) = -f(0)
  }

  // ---------- levels ----------
  // [shape, kind, count] kind: 'cherry' (cherries count) | 'choc' (a chocolate side to share)
  const LEVELS = [
    ['square', 'cherry', 2], ['circle', 'cherry', 2], ['square', 'cherry', 4], ['triangle', 'cherry', 2], ['circle', 'cherry', 4],
    ['heart', 'cherry', 2], ['square', 'choc', 0], ['circle', 'choc', 0], ['L', 'cherry', 4], ['star', 'cherry', 4],
    ['blob', 'cherry', 6], ['heart', 'choc', 0], ['T', 'cherry', 4], ['flower', 'cherry', 6], ['donut', 'cherry', 4],
    ['triangle', 'choc', 0], ['house', 'cherry', 6], ['cat', 'cherry', 4], ['blob', 'choc', 0], ['cross', 'cherry', 6],
    ['fish', 'cherry', 6], ['gear', 'cherry', 4], ['star', 'choc', 0], ['S', 'cherry', 6], ['cheese', 'cherry', 4],
    ['crescent', 'cherry', 4], ['U', 'choc', 0], ['ring2', 'cherry', 6], ['bolt', 'cherry', 4], ['zig', 'cherry', 8],
  ];
  function build(shapeName, kind, count, seed) {
    const rng = mulberry32(seed);
    const rot = rng() * TAU;
    const cake = Fifty.transform(Fifty.SHAPES[shapeName](), rot, .95);
    const lv = { shape: shapeName, kind, cake, cakeArea: regionArea(cake), cherries: [] };
    if (kind === 'cherry') {
      const R = .085;
      for (let tries = 0; lv.cherries.length < count && tries < 4000; tries++) {
        const p = [rng() * 2 - 1, rng() * 2 - 1];
        // fully inside the cake, clear of other cherries
        const ok = inCake(cake, p) && [0, 1, 2, 3, 4, 5, 6, 7].every((k) => inCake(cake, [p[0] + Math.cos(k * TAU / 8) * R * 1.3, p[1] + Math.sin(k * TAU / 8) * R * 1.3]))
          && lv.cherries.every((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) > R * 2.6);
        if (ok) lv.cherries.push(p);
      }
      lv.R = R;
      lv.extra = lv.cherries.map(([x, y]) => disc(x, y, R));
    } else {
      // chocolate: the part of the cake on one side of a random line, about 30-45% of it
      const ang = rng() * TAU;
      let off = cakeBisector({ cake, cakeArea: lv.cakeArea }, ang) + .15 + rng() * .25;
      const side = sideFn(ang, off);
      lv.extra = regions(cake).map((g) => ({ outer: clip(g.outer, side), holes: (g.holes || []).map((h) => clip(h, side)).filter((h) => h.length > 2) })).filter((g) => g.outer.length > 2);
      lv.chocLine = { ang, off };
    }
    lv.extraArea = regionArea(lv.extra);
    lv.solution = solve(lv);
    return lv;
  }
  // keep only levels where "just halve the cake" is clearly not enough
  function level(n) {
    const [name, kind, count] = LEVELS[(n - 1) % LEVELS.length];
    for (let k = 0; k < 40; k++) {
      const lv = build(name, kind, count, hash(`fair-${n}-${k}`));
      if ((kind === 'cherry' && lv.cherries.length < count) || !lv.solution) continue;
      // the vertical and horizontal cake halvers should both be unfair to the extra measure
      const bad = [0, Math.PI / 2].every((a) => Math.abs(shares(lv, { ang: a, off: cakeBisector(lv, a) }).extra - .5) > .12);
      if (bad || k === 39) return Object.assign(lv, { n });
    }
  }
  function daily(dateStr) {
    const r = hash('fairday-' + dateStr), names = ['heart', 'blob', 'star', 'flower', 'house', 'cat', 'fish', 'gear', 'circle', 'square'];
    const kind = r % 3 === 0 ? 'choc' : 'cherry';
    const lv = build(names[(r >>> 4) % names.length], kind, 4 + 2 * ((r >>> 9) % 2), r);
    return Object.assign(lv, { n: 0, daily: true });
  }

  const api = { LEVELS, level, daily, shares, solve, lineFromPoints, sideFn, clip, regionArea, cakeBisector };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fair = api;
})(typeof window !== 'undefined' ? window : globalThis);
