// BLIND MAZE: see the maze for a few seconds, then walk it in the dark.
// Cells hold a bitmask of open sides; generation is seeded so every level and daily maze is the same for everyone.
(function (root) {
  const N = 1, E = 2, S = 4, W = 8;
  const DIRS = { N: [0, -1, N, S], E: [1, 0, E, W], S: [0, 1, S, N], W: [-1, 0, W, E] };

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // recursive backtracker: long winding corridors, exactly one path between any two cells
  function carve(cols, rows, rng) {
    const cells = new Array(cols * rows).fill(0), seen = new Array(cols * rows).fill(false);
    const stack = [[Math.floor(rng() * cols), Math.floor(rng() * rows)]];
    seen[stack[0][1] * cols + stack[0][0]] = true;
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const opts = Object.values(DIRS).filter(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx];
      });
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy, bit, back] = opts[Math.floor(rng() * opts.length)];
      const nx = x + dx, ny = y + dy;
      cells[y * cols + x] |= bit; cells[ny * cols + nx] |= back; seen[ny * cols + nx] = true;
      stack.push([nx, ny]);
    }
    return cells;
  }
  // distances from one cell over open sides
  function bfs(m, from) {
    const dist = new Array(m.cols * m.rows).fill(-1), q = [from];
    dist[from[1] * m.cols + from[0]] = 0;
    while (q.length) {
      const [x, y] = q.shift(), d = dist[y * m.cols + x];
      for (const [dx, dy, bit] of Object.values(DIRS)) {
        if (!(m.cells[y * m.cols + x] & bit)) continue;
        const k = (y + dy) * m.cols + x + dx;
        if (dist[k] < 0) { dist[k] = d + 1; q.push([x + dx, y + dy]); }
      }
    }
    return dist;
  }
  const open = (m, x, y, dir) => !!(m.cells[y * m.cols + x] & DIRS[dir][2]);

  function build(cols, rows, look, seed) {
    const rng = mulberry32(seed);
    const m = { cols, rows, look, cells: carve(cols, rows, rng) };
    // start in a random corner, exit at the cell farthest from it
    const corners = [[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]];
    m.start = corners[Math.floor(rng() * 4)];
    const dist = bfs(m, m.start);
    let best = 0;
    for (let k = 0; k < dist.length; k++) if (dist[k] > dist[best]) best = k;
    m.exit = [best % cols, Math.floor(best / cols)];
    m.shortest = dist[best];
    return m;
  }

  // 30 levels: the maze grows, the look time grows a bit slower
  const LEVELS = Array.from({ length: 30 }, (_, i) => {
    const cols = 4 + Math.floor(i / 4);
    return { cols, rows: cols + Math.floor(cols / 4), look: Math.round((2.5 + cols * .5) * 2) / 2 };
  });
  function level(n) {
    const p = LEVELS[(n - 1) % LEVELS.length];
    // keep mazes whose solution actually winds around
    let m;
    for (let k = 0; k < 30; k++) {
      m = build(p.cols, p.rows, p.look, hash(`blind-${n}-${k}`));
      if (m.shortest >= p.cols * p.rows * .3) break;
    }
    return Object.assign(m, { n });
  }
  function daily(dateStr) {
    const m = build(8, 10, 6, hash('blindday-' + dateStr));
    return Object.assign(m, { n: 0, daily: true });
  }

  const api = { N, E, S, W, DIRS, LEVELS, level, daily, open, bfs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Blind = api;
})(typeof window !== 'undefined' ? window : globalThis);
