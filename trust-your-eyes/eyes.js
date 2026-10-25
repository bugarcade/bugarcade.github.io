// TRUST YOUR EYES?: classic optical illusions with a real, measurable answer.
// Each puzzle compares two things (lengths, sizes, greys, angles). Sometimes they are exactly equal,
// sometimes one really is bigger — usually the one the illusion makes look smaller.
// draw(g, P, S, ox, oy, t) paints puzzle P into a 100 x 126 world at scale S; t (0..1) takes the illusion
// apart: first the context fades, then the two things are brought side by side to be measured.
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const INK = '#26213a', ORANGE = '#ff8a3d', BLUE = '#4dabf7', GUIDE = '#e5484d';
  const fadeOf = (t) => 1 - ease(clamp(t / .35, 0, 1));          // context alpha
  const moveOf = (t) => ease(clamp((t - .4) / .45, 0, 1));        // bring-together progress
  const guideOf = (t) => clamp((t - .8) / .2, 0, 1);              // measuring guides

  // ---------- puzzle types ----------
  // each: make(rng, truth, d) -> params; truth is 'same' | 'hidden' (the one that looks smaller is bigger) | 'plain'
  const TYPES = {
    lines: {
      q: 'Which line is <b>longer</b>?', labels: ['Top', 'Bottom', 'Same'],
      make(rng, truth, d) {
        const L = 46 + rng() * 10, outTop = rng() < .5; // out-fins (arrowheads) look shorter
        let a = L, b = L;
        const shortLooking = outTop ? 'a' : 'b';
        if (truth === 'hidden') { if (shortLooking === 'a') a *= 1 + d; else b *= 1 + d; }
        if (truth === 'plain') { if (shortLooking === 'a') b *= 1 + d; else a *= 1 + d; }
        return { a, b, outTop, answer: a === b ? 2 : a > b ? 0 : 1 };
      },
      draw(g, P, S, t) {
        const f = fadeOf(t), gd = guideOf(t), y1 = 44, y2 = 84, fin = 8;
        const line = (y, L, out) => {
          const x0 = 50 - L / 2, x1 = 50 + L / 2;
          g.strokeStyle = INK; g.lineWidth = 1.6 * S; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x0 * S, y * S); g.lineTo(x1 * S, y * S); g.stroke();
          g.globalAlpha = f;
          for (const [x, dir] of [[x0, 1], [x1, -1]]) {
            const s = out ? dir : -dir;
            for (const v of [-1, 1]) { g.beginPath(); g.moveTo(x * S, y * S); g.lineTo((x + s * fin * .82) * S, (y + v * fin * .57) * S); g.stroke(); }
          }
          g.globalAlpha = 1;
        };
        line(y1, P.a, P.outTop); line(y2, P.b, !P.outTop);
        if (gd > 0) {
          g.globalAlpha = gd; g.strokeStyle = GUIDE; g.lineWidth = .7 * S; g.setLineDash([1.5 * S, 1.5 * S]);
          for (const x of [50 - P.a / 2, 50 + P.a / 2]) { g.beginPath(); g.moveTo(x * S, (y1 - 6) * S); g.lineTo(x * S, (y2 + 6) * S); g.stroke(); }
          g.setLineDash([]); g.globalAlpha = 1;
        }
      },
    },
    circles: {
      q: 'Which orange circle is <b>bigger</b>?', labels: ['Top', 'Bottom', 'Same'],
      make(rng, truth, d) {
        const r = 7 + rng() * 2, bigTop = rng() < .5; // the one ringed by big circles looks smaller
        let a = r, b = r;
        if (truth === 'hidden') { if (bigTop) a *= 1 + d; else b *= 1 + d; }
        if (truth === 'plain') { if (bigTop) b *= 1 + d; else a *= 1 + d; }
        return { a, b, bigTop, answer: a === b ? 2 : a > b ? 0 : 1 };
      },
      draw(g, P, S, t) {
        const f = fadeOf(t), m = moveOf(t), gd = guideOf(t), yA = 34, yB = 93, cy = 63;
        const ring = (y, r, big) => {
          const n = big ? 6 : 9, rr = big ? 9 : 3.4, dist = r + (big ? 12 : 6);
          g.fillStyle = '#9aa7b4'; g.globalAlpha = f;
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + .3; g.beginPath(); g.arc((50 + Math.cos(a) * dist) * S, (y + Math.sin(a) * dist) * S, rr * S, 0, 7); g.fill(); }
          g.globalAlpha = 1;
        };
        ring(yA, P.a, P.bigTop); ring(yB, P.b, !P.bigTop);
        const ay = lerp(yA, cy, m), by = lerp(yB, cy, m);
        g.fillStyle = ORANGE; g.beginPath(); g.arc(50 * S, ay * S, P.a * S, 0, 7); g.fill();
        g.globalAlpha = 1 - .55 * m; g.fillStyle = ORANGE; g.beginPath(); g.arc(50 * S, by * S, P.b * S, 0, 7); g.fill(); g.globalAlpha = 1;
        if (gd > 0) { g.globalAlpha = gd; g.strokeStyle = INK; g.lineWidth = .7 * S; g.setLineDash([1.2 * S, 1 * S]); g.beginPath(); g.arc(50 * S, by * S, P.b * S, 0, 7); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
      },
    },
    rails: {
      q: 'Which yellow bar is <b>longer</b>?', labels: ['Top', 'Bottom', 'Same'],
      make(rng, truth, d) {
        const L = 26 + rng() * 6; // the top bar, between the converging rails, looks longer
        let a = L, b = L;
        if (truth === 'hidden') b *= 1 + d;
        if (truth === 'plain') a *= 1 + d;
        return { a, b, answer: a === b ? 2 : a > b ? 0 : 1 };
      },
      draw(g, P, S, t) {
        const f = fadeOf(t), m = moveOf(t), gd = guideOf(t);
        g.globalAlpha = f; g.strokeStyle = '#7a6a5a'; g.lineCap = 'round';
        for (let k = 0; k < 14; k++) { // sleepers, closer together far away
          const u = Math.pow(k / 13, 1.6), y = lerp(120, 14, u), half = lerp(34, 7, u);
          g.lineWidth = lerp(2.2, .6, u) * S; g.beginPath(); g.moveTo((50 - half) * S, y * S); g.lineTo((50 + half) * S, y * S); g.stroke();
        }
        g.lineWidth = 1.4 * S; g.strokeStyle = INK;
        g.beginPath(); g.moveTo(21 * S, 122 * S); g.lineTo(45 * S, 10 * S); g.moveTo(79 * S, 122 * S); g.lineTo(55 * S, 10 * S); g.stroke();
        g.globalAlpha = 1;
        const yTop = lerp(36, 88, m), yBot = 96;
        g.fillStyle = '#ffd43b'; g.strokeStyle = INK; g.lineWidth = .5 * S;
        for (const [y, L] of [[yTop, P.a], [yBot, P.b]]) { g.beginPath(); g.roundRect((50 - L / 2) * S, (y - 2.2) * S, L * S, 4.4 * S, 1.2 * S); g.fill(); g.stroke(); }
        if (gd > 0) {
          g.globalAlpha = gd; g.strokeStyle = GUIDE; g.lineWidth = .7 * S; g.setLineDash([1.5 * S, 1.5 * S]);
          for (const x of [50 - P.a / 2, 50 + P.a / 2]) { g.beginPath(); g.moveTo(x * S, 80 * S); g.lineTo(x * S, 104 * S); g.stroke(); }
          g.setLineDash([]); g.globalAlpha = 1;
        }
      },
    },
    greys: {
      q: 'Which square is <b>darker</b>?', labels: ['Left', 'Right', 'Same'],
      make(rng, truth, d) {
        const v = 118 + Math.floor(rng() * 24), darkBgLeft = rng() < .5; // on a dark background a square looks lighter
        let a = v, b = v; const k = Math.round(14 * d / .1);
        // "darker" answer: lower value. hidden: the one that looks lighter is darker.
        if (truth === 'hidden') { if (darkBgLeft) a -= k; else b -= k; }
        if (truth === 'plain') { if (darkBgLeft) b -= k; else a -= k; }
        return { a, b, darkBgLeft, answer: a === b ? 2 : a < b ? 0 : 1 };
      },
      draw(g, P, S, t) {
        const f = fadeOf(t), m = moveOf(t);
        const x0 = 4, x1 = 96, y0 = 22, y1 = 104;
        const gr = g.createLinearGradient(x0 * S, 0, x1 * S, 0);
        const c0 = P.darkBgLeft ? 25 : 235, c1 = P.darkBgLeft ? 235 : 25, mid = 200;
        const mix = (c) => Math.round(lerp(mid, c, f));
        gr.addColorStop(0, `rgb(${mix(c0)},${mix(c0)},${mix(c0)})`); gr.addColorStop(1, `rgb(${mix(c1)},${mix(c1)},${mix(c1)})`);
        g.fillStyle = gr; g.beginPath(); g.roundRect(x0 * S, y0 * S, (x1 - x0) * S, (y1 - y0) * S, 4 * S); g.fill();
        const s = 17, ax = lerp(26, 50 - s / 2, m), bx = lerp(74, 50 + s / 2, m), cy = 63;
        for (const [x, v] of [[ax, P.a], [bx, P.b]]) { g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect((x - s / 2) * S, (cy - s / 2) * S, s * S, s * S); }
      },
    },
    arcs: {
      q: 'Which shape is <b>bigger</b>?', labels: ['Top', 'Bottom', 'Same'],
      make(rng, truth, d) {
        const R = 40 + rng() * 4; // the lower arc looks bigger (Jastrow)
        let a = 1, b = 1;
        if (truth === 'hidden') a = 1 + d * .8;
        if (truth === 'plain') b = 1 + d * .8;
        return { R, a, b, answer: a === b ? 2 : a > b ? 0 : 1 };
      },
      draw(g, P, S, t) {
        const m = moveOf(t), gd = guideOf(t), w = 13, a0 = -Math.PI / 2 - .62, a1 = -Math.PI / 2 + .62;
        const arc = (cy, k, fill, alpha, dashed) => {
          const R = P.R * k, r = (P.R - w) * k;
          g.globalAlpha = alpha; g.beginPath(); g.arc(50 * S, cy * S, R * S, a0, a1); g.arc(50 * S, cy * S, r * S, a1, a0, true); g.closePath();
          if (dashed) { g.strokeStyle = INK; g.lineWidth = .7 * S; g.setLineDash([1.2 * S, 1 * S]); g.stroke(); g.setLineDash([]); }
          else { g.fillStyle = fill; g.fill(); }
          g.globalAlpha = 1;
        };
        const cTop = 86, cBot = 112;
        arc(cTop, P.a, '#ff6b6b', 1);
        const yb = lerp(cBot, cTop, m);
        arc(yb, P.b, BLUE, 1 - .5 * m);
        if (gd > 0) arc(yb, P.b, null, gd, true);
      },
    },
    parallel: {
      q: 'Are the long lines <b>parallel</b>?', labels: ['Yes', 'No'],
      make(rng, truth, d) {
        // truth 'same' -> parallel; otherwise each line tilts a little against its hatching
        const tilt = truth === 'same' ? 0 : (1.2 + d * 10) * Math.PI / 180;
        return { tilt, flip: rng() < .5, answer: tilt === 0 ? 0 : 1 };
      },
      draw(g, P, S, t) {
        const f = fadeOf(t), gd = guideOf(t), n = 5;
        for (let i = 0; i < n; i++) {
          const yc = 26 + i * 19, sgn = (i % 2 ? 1 : -1) * (P.flip ? -1 : 1), tilt = P.tilt * sgn;
          const x0 = 10, x1 = 90, dy = Math.tan(tilt) * 40;
          g.strokeStyle = INK; g.lineWidth = 1.3 * S; g.lineCap = 'round';
          g.beginPath(); g.moveTo(x0 * S, (yc - dy) * S); g.lineTo(x1 * S, (yc + dy) * S); g.stroke();
          g.globalAlpha = f; g.lineWidth = .9 * S;
          for (let x = x0 + 3; x < x1 - 2; x += 5.5) {
            const y = yc + (x - 50) / 40 * dy, h = 5.5;
            g.beginPath(); g.moveTo((x - h * .55) * S, (y - sgn * h * .8) * S); g.lineTo((x + h * .55) * S, (y + sgn * h * .8) * S); g.stroke();
          }
          g.globalAlpha = 1;
          if (gd > 0) { g.globalAlpha = gd * .9; g.strokeStyle = GUIDE; g.lineWidth = .6 * S; g.setLineDash([1.2 * S, 1.2 * S]); g.beginPath(); g.moveTo(6 * S, (yc - dy) * S); g.lineTo(94 * S, (yc - dy) * S); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
        }
      },
    },
  };
  const ORDER = ['lines', 'circles', 'rails', 'greys', 'arcs', 'parallel'];

  function make(seedKey, type, truth, d) {
    const rng = mulberry32(hash(seedKey)), T = TYPES[type];
    const P = T.make(rng, truth, d);
    return Object.assign(P, { type, truth, d, q: T.q, labels: T.labels });
  }
  // 30 levels: the six illusions in turn, the real differences shrink as you go
  const LEVELS = Array.from({ length: 30 }, (_, i) => ({ type: ORDER[i % ORDER.length], d: Math.max(.035, .12 - i * .003) }));
  function level(n) {
    const spec = LEVELS[(n - 1) % LEVELS.length], r = mulberry32(hash('eyes-' + n))();
    const truth = n === 1 ? 'same' : r < .5 ? 'same' : r < .85 ? 'hidden' : 'plain';
    return Object.assign(make(`eyes-${n}`, spec.type, truth, spec.d), { n });
  }
  function daily(dateStr) {
    const rng = mulberry32(hash('eyesday-' + dateStr)), r = rng();
    const type = ORDER[Math.floor(rng() * ORDER.length)];
    return Object.assign(make(`eyesday-${dateStr}`, type, r < .5 ? 'same' : r < .85 ? 'hidden' : 'plain', .05), { n: 0, daily: true });
  }
  // what most people answer: the illusion's pick
  function fooledPick(P) {
    if (P.type === 'parallel') return 1;
    if (P.type === 'lines') return P.outTop ? 1 : 0;
    if (P.type === 'circles') return P.bigTop ? 1 : 0;
    if (P.type === 'rails') return 0;
    if (P.type === 'greys') return P.darkBgLeft ? 1 : 0;
    return 1; // arcs: the lower one
  }
  function draw(g, P, S, ox, oy, t) { g.save(); g.translate(ox, oy); TYPES[P.type].draw(g, P, S, t); g.restore(); }

  const api = { level, daily, make, draw, fooledPick, LEVELS, ORDER, TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Eyes = api;
})(typeof window !== 'undefined' ? window : globalThis);
