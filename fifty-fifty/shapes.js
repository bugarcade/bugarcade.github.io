// FIFTY/FIFTY: shapes, levels and the geometry of a cut.
// A shape is { outer: [[x,y]...], holes: [[[x,y]...]] } in unit space (about -1..1).
(function (root) {
  const TAU = Math.PI * 2;
  const polar = (n, r) => { const out = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; const rr = r(a); out.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return out; };
  const circle = (cx, cy, r, n = 64, rev = false) => { const p = []; for (let i = 0; i < n; i++) { const a = (rev ? -1 : 1) * i / n * TAU; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
  const S = (outer, holes = []) => ({ outer, holes });

  // name -> shape factory
  const SHAPES = {
    square: () => S([[-.8, -.8], [.8, -.8], [.8, .8], [-.8, .8]]),
    triangle: () => S([[0, -.95], [.9, .7], [-.9, .7]]),
    circle: () => S(circle(0, 0, .9)),
    L: () => S([[-.8, -.9], [-.2, -.9], [-.2, .3], [.8, .3], [.8, .9], [-.8, .9]]),
    T: () => S([[-.9, -.85], [.9, -.85], [.9, -.35], [.25, -.35], [.25, .9], [-.25, .9], [-.25, -.35], [-.9, -.35]]),
    cross: () => S([[-.3, -.9], [.3, -.9], [.3, -.3], [.9, -.3], [.9, .3], [.3, .3], [.3, .9], [-.3, .9], [-.3, .3], [-.9, .3], [-.9, -.3], [-.3, -.3]]),
    star: () => S(polar(10, (a) => (Math.round(a / TAU * 10) % 2 ? .4 : .95))),
    heart: () => {
      const p = [];
      for (let i = 0; i < 80; i++) {
        const t = i / 80 * TAU, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        p.push([x / 18, -y / 18 - .05]);
      }
      return S(p);
    },
    donut: () => S(circle(0, 0, .9), [circle(.12, -.05, .38, 48, true)]),
    crescent: () => {
      // big circle (r .9 at 0,0) minus a smaller one (r .72 at .45,0); the two arcs meet where the circles cross
      const a0 = Math.acos((.81 + .2025 - .5184) / .81), b0 = Math.acos((.9 * Math.cos(a0) - .45) / .72);
      const p = [];
      for (let i = 0; i <= 60; i++) { const a = a0 + i / 60 * (TAU - 2 * a0); p.push([Math.cos(a) * .9, Math.sin(a) * .9]); }
      for (let i = 1; i < 60; i++) { const b = TAU - b0 - i / 60 * (TAU - 2 * b0); p.push([.45 + Math.cos(b) * .72, Math.sin(b) * .72]); }
      return S(p.map(([x, y]) => [x + .2, y]));
    },
    arrow: () => S([[-.9, -.25], [.15, -.25], [.15, -.7], [.95, 0], [.15, .7], [.15, .25], [-.9, .25]]),
    bolt: () => S([[-.15, -.95], [.55, -.95], [.15, -.15], [.6, -.15], [-.35, .95], [-.05, .15], [-.5, .15]]),
    house: () => S([[0, -.95], [.85, -.2], [.65, -.2], [.65, .85], [.15, .85], [.15, .35], [-.15, .35], [-.15, .85], [-.65, .85], [-.65, -.2], [-.85, -.2]]),
    flower: () => S(polar(90, (a) => .62 + .3 * Math.cos(5 * a))),
    gear: () => S(polar(96, (a) => (Math.cos(8 * a) > .2 ? .92 : .72)), [circle(0, 0, .28, 40, true)]),
    blob: () => S(polar(90, (a) => .7 + .17 * Math.sin(3 * a + .6) + .08 * Math.cos(5 * a))),
    U: () => S([[-.85, -.85], [-.4, -.85], [-.4, .35], [.4, .35], [.4, -.85], [.85, -.85], [.85, .85], [-.85, .85]]),
    S: () => S([[-.8, -.9], [.8, -.9], [.8, -.5], [-.35, -.5], [-.35, -.2], [.8, -.2], [.8, .9], [-.8, .9], [-.8, .5], [.35, .5], [.35, .2], [-.8, .2]]),
    fish: () => {
      const p = [];
      for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + i / 40 * Math.PI; p.push([.15 + Math.cos(a) * .75, Math.sin(a) * .5]); }
      p.push([-.6, .05], [-.95, .5], [-.95, -.5], [-.6, -.05]);
      return S(p.map(([x, y]) => [x, y]).reverse());
    },
    cat: () => {
      // round head with two pointed ears spliced into its outline
      const head = circle(0, .12, .72, 72);
      const out = [];
      head.forEach(([x, y]) => {
        const a = Math.atan2(y - .12, x);
        // skip the arc between each ear's two base points, replace it with the ear tip
        if (a > -2.45 && a < -1.85) { if (!out.leftEar) { out.push([-.78, -.92]); out.leftEar = 1; } return; }
        if (a > -1.29 && a < -.69) { if (!out.rightEar) { out.push([.78, -.92]); out.rightEar = 1; } return; }
        out.push([x, y]);
      });
      return S(out.slice());
    },
    cheese: () => S([[-.9, .7], [.9, .7], [.9, -.1], [-.9, -.75]], [circle(-.35, .25, .14, 28, true), circle(.4, .15, .2, 28, true), circle(.1, .45, .1, 24, true)]),
    ring2: () => S(circle(0, 0, .92), [circle(-.35, 0, .28, 40, true), circle(.4, .1, .22, 40, true)]),
    zig: () => S([[-.9, -.6], [-.5, -.9], [-.1, -.6], [.3, -.9], [.7, -.6], [.9, -.75], [.9, .6], [.5, .9], [.1, .6], [-.3, .9], [-.7, .6], [-.9, .75]]),
  };
  // ---------- geometry ----------
  function area(poly) { let a = 0; for (let i = 0, n = poly.length; i < n; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % n]; a += x1 * y2 - x2 * y1; } return a / 2; }
  // keep the part of poly on the side where side(p) >= 0 (half-plane is convex, so this is exact for any polygon's area)
  function clip(poly, side) {
    const out = [];
    for (let i = 0, n = poly.length; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n], sa = side(a), sb = side(b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  }
  const shapeArea = (sh) => Math.abs(area(sh.outer)) - sh.holes.reduce((s, h) => s + Math.abs(area(h)), 0);
  // cut by the infinite line through p and q; returns both pieces and the share of the "left" one
  function cutShape(sh, p, q) {
    const nx = -(q[1] - p[1]), ny = q[0] - p[0];
    const side = (s) => (pt) => s * ((pt[0] - p[0]) * nx + (pt[1] - p[1]) * ny);
    const piece = (s) => ({ outer: clip(sh.outer, side(s)), holes: sh.holes.map((h) => clip(h, side(s))).filter((h) => h.length > 2) });
    const A = piece(1), B = piece(-1);
    const a = A.outer.length > 2 ? shapeArea(A) : 0, b = B.outer.length > 2 ? shapeArea(B) : 0;
    const total = a + b || 1;
    const len = Math.hypot(nx, ny) || 1;
    return { A, B, shareA: a / total, normal: [nx / len, ny / len] };
  }
  function transform(sh, rot, sc) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const f = ([x, y]) => [(x * c - y * s) * sc, (x * s + y * c) * sc];
    return { outer: sh.outer.map(f), holes: sh.holes.map((h) => h.map(f)) };
  }

  // ---------- levels ----------
  // [shape, target %] ; targets other than 50 mean "cut off exactly N%"
  const LEVELS = [
    ['square', 50], ['triangle', 50], ['circle', 50], ['L', 50], ['star', 50],
    ['heart', 50], ['T', 50], ['arrow', 50], ['donut', 50], ['bolt', 50],
    ['house', 50], ['crescent', 50], ['cross', 25], ['flower', 50], ['fish', 50],
    ['S', 50], ['gear', 50], ['cat', 50], ['square', 25], ['blob', 33],
    ['cheese', 50], ['U', 50], ['ring2', 50], ['heart', 25], ['zig', 50],
    ['star', 33], ['triangle', 10], ['donut', 25], ['bolt', 33], ['fish', 20],
    ['gear', 25], ['cat', 33], ['cheese', 25], ['crescent', 33], ['house', 20],
    ['flower', 10], ['ring2', 40], ['S', 30], ['blob', 15], ['zig', 10],
  ];
  const COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#748ffc', '#da77f2', '#f783ac', '#a9e34b'];
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function level(n) {
    const [name, target] = LEVELS[(n - 1) % LEVELS.length];
    const r = hash('lv' + n);
    return { n, name, target, rot: n <= 3 ? 0 : ((r % 1000) / 1000) * TAU, color: COLORS[n % COLORS.length], shape: SHAPES[name]() };
  }
  function daily(dateStr) {
    const names = Object.keys(SHAPES), r = hash('daily' + dateStr);
    const targets = [50, 50, 50, 33, 25, 40];
    const name = names[r % names.length];
    return { n: 0, daily: true, name, target: targets[(r >>> 8) % targets.length], rot: ((r >>> 4) % 1000) / 1000 * TAU, color: COLORS[(r >>> 12) % COLORS.length], shape: SHAPES[name]() };
  }

  const api = { SHAPES, LEVELS, level, daily, cutShape, transform, shapeArea, area };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Fifty = api;
})(this);
