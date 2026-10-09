// ONE LINE engine: seeded level generation. Every level is built around a hidden
// Hamiltonian path, so a full solution always exists. Shared by the game and the reel tool.
(function (root) {
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
  function neighbours(w, h, c) {
    const x = c % w, y = (c / w) | 0, out = [];
    if (x > 0) out.push(c - 1);
    if (x < w - 1) out.push(c + 1);
    if (y > 0) out.push(c - w);
    if (y < h - 1) out.push(c + w);
    return out;
  }

  // Random Hamiltonian path over the full grid via "backbite" moves on a snake path.
  function randomPath(w, h, rng) {
    let path = [];
    for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) path.push(y * w + (y % 2 ? w - 1 - i : i));
    const moves = 30 * w * h;
    for (let m = 0; m < moves; m++) {
      if (rng() < .5) path.reverse();
      const end = path[0], ns = neighbours(w, h, end).filter((n) => n !== path[1]);
      const n = ns[(rng() * ns.length) | 0];
      const i = path.indexOf(n);
      path = path.slice(0, i).reverse().concat(path.slice(i));
    }
    return path;
  }

  function tierFor(n) {
    if (n <= 1) return { w: 3, h: 3, holes: 0 };
    if (n <= 4) return { w: 4, h: 4, holes: 1 + (n % 2) };
    if (n <= 10) return { w: 5, h: 5, holes: 2 + (n % 2) };
    if (n <= 20) return { w: 6, h: 6, holes: 3 + (n % 2) };
    if (n <= 35) return { w: 7, h: 7, holes: 4 + (n % 3) };
    return { w: 7, h: 8, holes: 5 + (n % 3) };
  }

  // Holes come off both ends of the hidden path, so what is left still has a full solution.
  function generate(seed, t) {
    const rng = mulberry32(seed);
    const path = randomPath(t.w, t.h, rng);
    const head = Math.floor(rng() * (t.holes + 1));
    const kept = path.slice(head, path.length - (t.holes - head));
    const holes = new Set(path.filter((c) => !kept.includes(c)));
    return { w: t.w, h: t.h, holes, start: kept[0], solution: kept, cells: kept.length };
  }

  const cache = new Map();
  function level(n) {
    if (!cache.has(n)) cache.set(n, generate(hashStr('one-line-' + n), tierFor(n)));
    return cache.get(n);
  }

  // Free cells next to c that are not holes and not already used.
  function openMoves(lv, used, c) {
    return neighbours(lv.w, lv.h, c).filter((n) => !lv.holes.has(n) && !used.has(n));
  }

  const api = { level, generate, tierFor, neighbours, openMoves, mulberry32, hashStr };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OneLine = api;
})(this);
