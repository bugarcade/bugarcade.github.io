// KNOT OR NOT?: a tangled rope, pull both ends — does it tighten into a knot or slide out straight?
// The rope is a "long knot": an open curve whose ends sit on the far left and right. Closing it with an arc
// around the outside adds no crossings, so the Kauffman bracket of that closed diagram decides the answer:
// the rope is unknotted exactly when the bracket is a single monomial (true for every diagram this small).
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

  // ---------- Laurent polynomials in A, as { exponent: coefficient } ----------
  const padd = (p, q, k = 1) => { const r = { ...p }; for (const e in q) { r[e] = (r[e] || 0) + k * q[e]; if (!r[e]) delete r[e]; } return r; };
  const pmul = (p, q) => { const r = {}; for (const a in p) for (const b in q) { const e = +a + +b; r[e] = (r[e] || 0) + p[a] * q[b]; if (!r[e]) delete r[e]; } return r; };
  const D = { 2: -1, '-2': -1 }; // loop value d = -A^2 - A^-2

  // pd: list of crossings [i, j, k, l] (i = incoming under edge, then counter-clockwise).
  // A-smoothing joins (i,j)(k,l), B-smoothing joins (i,l)(j,k).
  function bracket(pd, edgeCount) {
    if (!pd.length) return { 0: 1 };
    const n = pd.length, dpow = [{ 0: 1 }];
    for (let k = 1; k <= n + 1; k++) dpow.push(pmul(dpow[k - 1], D));
    let total = {};
    const parent = new Int32Array(edgeCount);
    const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    for (let s = 0; s < (1 << n); s++) {
      for (let e = 0; e < edgeCount; e++) parent[e] = e;
      let a = 0;
      for (let c = 0; c < n; c++) {
        const [i, j, k, l] = pd[c];
        if (s & (1 << c)) { join(i, j); join(k, l); a++; } else { join(i, l); join(j, k); }
      }
      let loops = 0; for (let e = 0; e < edgeCount; e++) if (find(e) === e) loops++;
      total = padd(total, pmul({ [2 * a - n]: 1 }, dpow[loops - 1]));
    }
    return total;
  }
  const terms = (p) => Object.keys(p).length;
  const span = (p) => { const e = Object.keys(p).map(Number); return (Math.max(...e) - Math.min(...e)) / 4; };

  // ---------- the rope ----------
  // Catmull-Rom through the control points, sampled densely
  function spline(pts, per = 26) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < per; k++) {
        const t = k / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((d) => .5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function segX(a, b, c, d) {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(den) < 1e-12) return null;
    const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
    return t >= 0 && t < 1 && u >= 0 && u < 1 ? [t, u] : null;
  }
  const dir = (P, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 2)], dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy); return [dx / m, dy / m]; };

  // build a rope from control points; returns null when the drawing would be hard to read
  function makeRope(ctrl, rng) {
    const P = spline(ctrl);
    const X = []; // crossings: { s1, s2 (param positions, s1 < s2), pt, overFirst }
    for (let i = 0; i < P.length - 1; i++) for (let j = i + 2; j < P.length - 1; j++) {
      const h = segX(P[i], P[i + 1], P[j], P[j + 1]);
      if (h) X.push({ s1: i + h[0], s2: j + h[1], i, j, pt: [P[i][0] + (P[i + 1][0] - P[i][0]) * h[0], P[i][1] + (P[i + 1][1] - P[i][1]) * h[0]] });
    }
    // readability: crossings apart, strands meet at a real angle, no near-misses elsewhere
    for (let a = 0; a < X.length; a++) {
      const da = dir(P, X[a].i), db = dir(P, X[a].j);
      if (Math.abs(da[0] * db[1] - da[1] * db[0]) < Math.sin(40 * Math.PI / 180)) return null;
      for (let b = a + 1; b < X.length; b++) if (Math.hypot(X[a].pt[0] - X[b].pt[0], X[a].pt[1] - X[b].pt[1]) < .095) return null;
    }
    for (let i = 0; i < P.length; i += 2) for (let j = i + 14; j < P.length; j += 2) {
      if (Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) > .05) continue;
      if (!X.some((x) => Math.hypot(x.pt[0] - P[i][0], x.pt[1] - P[i][1]) < .07 && Math.hypot(x.pt[0] - P[j][0], x.pt[1] - P[j][1]) < .07)) return null;
    }
    for (const x of X) x.overFirst = rng() < .5;
    return { P, X };
  }
  // planar diagram code of the closed-up rope
  function pdOf(rope) {
    const { P, X } = rope, n = X.length;
    const visits = [];
    X.forEach((x, c) => { visits.push({ s: x.s1, c, seg: x.i, over: x.overFirst }); visits.push({ s: x.s2, c, seg: x.j, over: !x.overFirst }); });
    visits.sort((a, b) => a.s - b.s);
    const m = 2 * n, at = X.map(() => ({}));
    visits.forEach((v, k) => { at[v.c][v.over ? 'over' : 'under'] = { inE: (k - 1 + m) % m, outE: k, d: dir(P, v.seg) }; });
    // counter-clockwise around the crossing, starting at the incoming under strand.
    // Screen y points down, which mirrors the diagram — harmless for "knot or not".
    return at.map(({ over, under }) => {
      const back = [-under.d[0], -under.d[1]], ccw = back[0] * over.d[1] - back[1] * over.d[0] > 0;
      return ccw ? [under.inE, over.outE, under.outE, over.inE] : [under.inE, over.inE, under.outE, over.outE];
    });
  }
  function analyse(rope) {
    const n = rope.X.length, br = bracket(pdOf(rope), Math.max(1, 2 * n));
    const knot = terms(br) > 1;
    return { knot, span: knot ? span(br) : 0 };
  }
  const knotName = (span) => (span === 3 ? 'a TREFOIL knot' : span === 4 ? 'a FIGURE-EIGHT knot' : span === 5 ? 'a 5-crossing knot' : span === 6 ? 'a 6-crossing knot' : 'a MONSTER knot');

  // ---------- levels ----------
  // crossings shown grow with the level; knots and fakes alternate unpredictably
  const LEVELS = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    return n <= 3 ? [3, 4] : n <= 8 ? [4, 5] : n <= 15 ? [5, 7] : n <= 22 ? [6, 8] : [7, 9];
  });
  function generate(seedKey, [lo, hi], wantKnot, k0 = 0) {
    for (let k = k0; k < 60000; k++) {
      const rng = mulberry32(hash(`${seedKey}-${k}`));
      const pts = [[.03, .5]];
      const m = 3 + Math.floor((lo + hi) / 2.4) + Math.floor(rng() * 2);
      // spread-out control points give round, readable loops instead of thin slivers
      for (let i = 0, tries = 0; i < m && tries < 400; tries++) {
        const p = [.12 + rng() * .76, .06 + rng() * .88];
        if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) > .2)) { pts.push(p); i++; }
      }
      pts.push([.97, .5]);
      const rope = makeRope(pts, rng);
      if (!rope || rope.X.length < lo || rope.X.length > hi) continue;
      const a = analyse(rope);
      if (a.knot !== wantKnot) continue;
      // fakes should look busy, knots should look innocent
      if (!wantKnot && rope.X.length < lo + (hi > lo ? 1 : 0) && k < 40000) continue;
      return Object.assign(rope, a, { k });
    }
    return null;
  }
  // where each level's search succeeds (found offline), so a level opens instantly
  const START = {1: 70, 2: 122, 3: 5, 4: 124, 5: 183, 6: 80, 7: 153, 8: 65, 9: 176, 10: 1062, 11: 154, 12: 240, 13: 332, 14: 583, 15: 1461, 16: 631, 17: 16, 18: 176, 19: 2135, 20: 422, 21: 60, 22: 155, 23: 3258, 24: 699, 25: 4918, 26: 151, 27: 176, 28: 2888, 29: 11867, 30: 2111};
  function level(n) {
    const wantKnot = n === 1 ? false : n === 2 ? true : mulberry32(hash('kn-' + n))() < .5;
    return Object.assign(generate(`knot-${n}`, LEVELS[(n - 1) % LEVELS.length], wantKnot, START[n] || 0), { n });
  }
  // daily: five ropes, from easy to hard
  function daily(dateStr) {
    const rng = mulberry32(hash('knotday-' + dateStr));
    return [[3, 4], [4, 5], [5, 6], [5, 7], [6, 8]].map((r, i) => Object.assign(generate(`knotday-${dateStr}-${i}`, r, rng() < .5), { n: 0, daily: true, idx: i }));
  }

  const api = { level, daily, analyse, bracket, pdOf, makeRope, knotName, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Knots = api;
})(typeof window !== 'undefined' ? window : globalThis);
