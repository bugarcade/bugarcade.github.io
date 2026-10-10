// SHADEWALK levels: seeded, built so every gap can be crossed in shade.
// World is a side view: ground line at y = G, sky above. Units are logical pixels.
(function (root) {
  const G = 600;                         // ground line
  const WALK = 80;                       // vampire walk speed, px/s
  const HEAD = 80;                       // height of the vampire's head above the ground
  const MIN_ELEV = 16 * Math.PI / 180;   // lowest sun elevation
  const REACH = 1 / Math.tan(MIN_ELEV);  // longest shadow per px of height (~3.49)
  const DISTRICTS = ['Old Town', 'Tram Line', 'Cloud Park'];
  const LEVELS = 30;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const PALETTE = [
    ['#f4a7a3', '#e8857f'], ['#f6d18b', '#e9b65c'], ['#a8d8c8', '#7fbfaa'], ['#b8c4f0', '#8e9de0'],
    ['#f2b8d6', '#de8fb8'], ['#cfe39b', '#a9c96a'], ['#f7c59f', '#eaa16b'], ['#c9b7ec', '#a58fd9'],
  ];

  // How a gap gets crossed decides its width:
  //  'shade' - one neighbour's shadow can cover all of it (sun low on that side)
  //  'tram'  - too wide; wait for a tram and walk next to it
  //  'cloud' - too wide; hide the sun behind a drifting cloud
  function build(n) {
    const rng = mulberry32(1234 + n * 7919);
    const r = (a, b) => a + rng() * (b - a);
    const district = n <= 10 ? 0 : n <= 20 ? 1 : 2;
    const d = district === 0 ? (n - 1) / 9 : district === 1 ? (n - 11) / 9 : (n - 21) / 9;

    const lv = { n, district, name: DISTRICTS[district], buildings: [], trees: [], awnings: [], flowers: [], gaps: [], trams: null, clouds: null };
    let x = 0, colorI = Math.floor(r(0, PALETTE.length));
    const addBuilding = (w, h) => {
      const roof = rng() < .35 ? 'gable' : rng() < .5 ? 'chimney' : 'flat';
      const b = { x, w, h, color: PALETTE[colorI++ % PALETTE.length], roof, win: Math.floor(r(0, 3)) };
      lv.buildings.push(b); x += w; return b;
    };
    // start: the vampire begins under a wide building
    addBuilding(340, r(200, 260));
    lv.startX = 150;

    const count = n === 1 ? 1 : n === 2 ? 2 : Math.round(3 + d * 2.4 + (district > 0 ? .6 : 0));
    const special = [];
    if (district === 1) special.push(...pick(rng, count, 1 + Math.round(d * 1.4), 1));
    if (district === 2) special.push(...pick(rng, count, 1 + Math.round(d * 1.6), 1));

    const kinds = [];
    for (let i = 0; i < count; i++) kinds.push(special.includes(i) ? (district === 1 ? 'tram' : 'cloud') : 'shade');
    // a building right before a tram/cloud gap is kept low, so neighbours can't bridge it
    const lowBefore = (i) => kinds[i + 1] && kinds[i + 1] !== 'shade';
    for (let i = 0; i < count; i++) {
      const prev = lv.buildings[lv.buildings.length - 1];
      const kind = kinds[i];
      let g, h;
      if (kind === 'shade') {
        // difficulty k = gap / longest shadow the taller neighbour can throw.
        // Early levels leave slack; later ones need a sun almost on the horizon.
        const k = n === 1 ? .35 : Math.min(.9, .38 + .5 * d + r(-.04, .06) + (district > 0 ? .05 : 0));
        // mostly low buildings, so gaps stay short but still need a low sun; a rare tall one is a breather
        h = lowBefore(i) ? r(140, 165) : rng() < .15 ? r(300, 380) : r(140, 250);
        // the shadow has to reach the vampire's head (~80 px up), not just his feet
        const coverH = Math.max(prev.h, h) - HEAD;
        g = Math.min(560, Math.max(110, k * coverH * REACH));
      } else {
        // wider than both neighbours' shadows together, so it really needs the tram or a cloud
        h = lowBefore(i) ? r(140, 165) : r(140, 190);
        const both = (Math.max(0, prev.h - HEAD) + Math.max(0, h - HEAD)) * REACH;
        g = Math.max(kind === 'tram' ? 540 : 500, both * 1.12 + r(30, 120 + 100 * d));
      }
      const gap = { x0: x, x1: x + g, kind };
      lv.gaps.push(gap);
      x += g;
      // wide enough to swing the sun to the other side while walking underneath (~1.8 s)
      addBuilding(r(200, 300), h);
    }
    // home
    lv.home = { x: x + 120, w: 260, h: 250 };
    lv.length = lv.home.x + lv.home.w;

    // decorative casters: trees and shop awnings in shade gaps; they only ever help
    for (const gp of lv.gaps) {
      if (gp.kind !== 'shade' || gp.x1 - gp.x0 < 200) continue;
      if (rng() < .45) lv.trees.push({ x: r(gp.x0 + 70, gp.x1 - 70), trunk: r(70, 110), r: r(38, 54) });
    }
    for (const b of lv.buildings) if (rng() < .3 && b.w > 220) lv.awnings.push({ x: b.x + b.w - 10, w: 70, y: G - 105, h: 10, color: b.color[1] });

    // three sunflowers: in gaps (they need light while the vampire hides) and on a roof
    const spots = [];
    lv.gaps.forEach((gp) => spots.push({ x: gp.x0 + (gp.x1 - gp.x0) * r(.35, .8), y: G }));
    lv.buildings.slice(1).forEach((b) => spots.push({ x: b.x + b.w * r(.3, .7), y: G - b.h }));
    shuffle(rng, spots);
    // prefer one ground and one roof spot when possible
    const ground = spots.filter((s) => s.y === G), roof = spots.filter((s) => s.y !== G);
    const chosen = [];
    if (ground.length) chosen.push(ground.shift());
    if (roof.length) chosen.push(roof.shift());
    for (const s of [...ground, ...roof]) { if (chosen.length >= 3) break; if (chosen.every((c) => Math.abs(c.x - s.x) > 160)) chosen.push(s); }
    while (chosen.length < 3) chosen.push({ x: lv.startX + 60 + chosen.length * 40, y: G - lv.buildings[0].h });
    lv.flowers = chosen.slice(0, 3).sort((a, b) => a.x - b.x);

    if (lv.gaps.some((g) => g.kind === 'tram') || (district === 2 && rng() < .4)) {
      lv.trams = { speed: WALK * 1.18, w: 300, h: 120, period: r(11, 15), offset: r(0, 4) };
    }
    if (district === 2 || (district === 1 && d > .5)) {
      lv.clouds = { speed: r(28, 40) * (rng() < .5 ? 1 : -1), w: r(240, 320) - 40 * d, every: 0, seed: n };
      lv.clouds.every = (1400 / Math.abs(lv.clouds.speed)) / (district === 2 ? 2.2 : 1.3);
    }
    lv.tip = TIPS[n] || null;
    return lv;
  }
  const TIPS = {
    1: 'drag', 2: 'wait', 3: 'flowers', 11: 'tram', 21: 'cloud',
  };
  function pick(rng, n, k, from) {
    const idx = []; for (let i = from; i < n; i++) idx.push(i);
    shuffle(rng, idx); return idx.slice(0, Math.min(k, idx.length));
  }
  function shuffle(rng, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const cache = new Map();
  const level = (n) => { if (!cache.has(n)) cache.set(n, build(n)); return cache.get(n); };
  const api = { level, G, WALK, MIN_ELEV, REACH, LEVELS, DISTRICTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Levels = api;
})(this);
