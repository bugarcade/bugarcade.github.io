// HALF FULL: glass shapes, volumes and levels.
// A glass is an inner profile: [[y, r], ...] with y = height from the bottom (0..1) and r = inner radius.
// Volume treats the glass as a solid of revolution, so a cone's "half" sits at ~79% of its height.
(function (root) {
  const GLASSES = {
    tumbler: { name: 'Tumbler', prof: [[0, .3], [1, .37]], stem: 0, base: .08 },
    beaker: { name: 'Beaker', prof: [[0, .31], [1, .31]], stem: 0, base: .05, marks: true },
    martini: { name: 'Martini', prof: [[0, 0], [1, .56]], stem: .55, base: .03 },
    wine: { name: 'Wine', prof: [[0, 0], [.08, .17], [.25, .3], [.55, .35], [.82, .32], [1, .27]], stem: .5, base: .03 },
    flute: { name: 'Flute', prof: [[0, 0], [.06, .07], [.5, .14], [1, .16]], stem: .45, base: .03 },
    vase: { name: 'Vase', prof: [[0, .3], [.5, .14], [1, .33]], stem: 0, base: .06 },
    flask: { name: 'Flask', prof: [[0, .42], [.5, .4], [.72, .12], [1, .12]], stem: 0, base: .04 },
    bowl: { name: 'Bowl', prof: [[0, .1], [.25, .36], [.6, .48], [1, .52]], stem: .12, base: .03 },
    cocktail: { name: 'Coupe', prof: [[0, 0], [.2, .3], [.5, .45], [1, .52]], stem: .6, base: .03 },
    pint: { name: 'Pint', prof: [[0, .26], [.85, .34], [.92, .36], [1, .34]], stem: 0, base: .06 },
  };

  function radiusAt(g, y) {
    const p = g.prof;
    if (y <= p[0][0]) return p[0][1];
    for (let i = 1; i < p.length; i++) if (y <= p[i][0]) { const [y0, r0] = p[i - 1], [y1, r1] = p[i]; return r0 + (r1 - r0) * (y - y0) / (y1 - y0); }
    return p[p.length - 1][1];
  }
  // volume up to height h (0..1), as a fraction of the full glass
  const N = 600;
  function table(g) {
    if (g._t) return g._t;
    const t = new Float64Array(N + 1);
    for (let i = 1; i <= N; i++) { const y = (i - .5) / N, r = radiusAt(g, y); t[i] = t[i - 1] + r * r / N; }
    for (let i = 0; i <= N; i++) t[i] /= t[N];
    return (g._t = t);
  }
  function volumeAt(g, h) { const t = table(g), x = Math.max(0, Math.min(1, h)) * N, i = Math.floor(x); return i >= N ? 1 : t[i] + (t[i + 1] - t[i]) * (x - i); }
  function heightFor(g, v) {
    let lo = 0, hi = 1;
    for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; (volumeAt(g, m) < v ? (lo = m) : (hi = m)); }
    return (lo + hi) / 2;
  }

  // mode 'line': fill to a drawn line at height `h`. mode 'frac': fill to a fraction of the volume, line hidden.
  const LEVELS = [
    { g: 'tumbler', mode: 'line', h: .55, flow: 0.224 },
    { g: 'beaker', mode: 'frac', f: .5, flow: 0.224 },
    { g: 'martini', mode: 'line', h: .6, flow: 0.21 },
    { g: 'martini', mode: 'frac', f: .5, flow: 0.21 },
    { g: 'wine', mode: 'line', h: .5, flow: 0.224 },
    { g: 'vase', mode: 'frac', f: .5, flow: 0.21 },
    { g: 'flute', mode: 'line', h: .7, flow: 0.21 },
    { g: 'flask', mode: 'frac', f: .5, flow: 0.224 },
    { g: 'bowl', mode: 'line', h: .4, flow: 0.238 },
    { g: 'cocktail', mode: 'frac', f: .5, flow: 0.21 },
    { g: 'pint', mode: 'frac', f: .75, flow: 0.252 },
    { g: 'wine', mode: 'frac', f: 1 / 3, flow: 0.21 },
    { g: 'martini', mode: 'frac', f: .25, flow: 0.21 },
    { g: 'flask', mode: 'line', h: .8, flow: 0.266 },
    { g: 'vase', mode: 'line', h: .35, flow: 0.28 },
    { g: 'flute', mode: 'frac', f: .5, flow: 0.238 },
    { g: 'tumbler', mode: 'frac', f: .9, flow: 0.294 },
    { g: 'bowl', mode: 'frac', f: .5, flow: 0.28 },
    { g: 'cocktail', mode: 'frac', f: .25, flow: 0.266 },
    { g: 'beaker', mode: 'frac', f: .1, flow: 0.28 },
    { g: 'pint', mode: 'line', h: .62, flow: 0.315 },
    { g: 'wine', mode: 'frac', f: .75, flow: 0.294 },
    { g: 'martini', mode: 'frac', f: .1, flow: 0.28 },
    { g: 'flask', mode: 'frac', f: .25, flow: 0.315 },
    { g: 'vase', mode: 'frac', f: .75, flow: 0.315 },
    { g: 'flute', mode: 'frac', f: .2, flow: 0.315 },
    { g: 'cocktail', mode: 'frac', f: 2 / 3, flow: 0.315 },
    { g: 'bowl', mode: 'frac', f: .1, flow: 0.35 },
    { g: 'tumbler', mode: 'frac', f: .33, flow: 0.385 },
    { g: 'martini', mode: 'frac', f: .9, flow: 0.385 },
  ];
  const DRINKS = [['#ffb347', 'orange juice'], ['#ff6b81', 'berry'], ['#8fd14f', 'lime'], ['#6ec6ff', 'blue'], ['#c08552', 'cola'], ['#ffd84d', 'lemonade']];
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function build(spec, n) {
    const g = GLASSES[spec.g];
    const target = spec.mode === 'line' ? volumeAt(g, spec.h) : spec.f;
    const lineH = spec.mode === 'line' ? spec.h : heightFor(g, spec.f);
    return { n, glass: g, key: spec.g, mode: spec.mode, f: spec.f, target, lineH, flow: spec.flow, drink: DRINKS[n % DRINKS.length] };
  }
  const level = (n) => build(LEVELS[(n - 1) % LEVELS.length], n);
  function daily(dateStr) {
    const r = hash('half-' + dateStr), keys = Object.keys(GLASSES), fr = [.5, .5, .25, 1 / 3, .75, .1];
    const spec = { g: keys[r % keys.length], mode: 'frac', f: fr[(r >>> 8) % fr.length], flow: 0.266 };
    return Object.assign(build(spec, (r >>> 4) % 6), { daily: true, n: 0 });
  }
  const api = { GLASSES, LEVELS, radiusAt, volumeAt, heightFor, level, daily };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Half = api;
})(this);
