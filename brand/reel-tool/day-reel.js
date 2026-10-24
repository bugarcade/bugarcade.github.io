// Bug Arcade daily reel: yesterday's answer, then today's question. Needs window.Knots and window.Blind
// (day-reel.bundle.js has both). DayReel.record(cfg) -> Promise<{blob, answer}> mp4 1080x1920.
// cfg = { day, shout? (string or lines), hook?, reveal: {type:'knot', level} | {type:'maze', seed, steps},
//                      ask:    {type:'knot', level} | {type:'maze', seed, steps} }
// Reveal (0–3.2 s) shows yesterday's answer for real; the question that follows is never answered.
(function (root) {
  const K = root.Knots, B = root.Blind;
  const W = 1080, H = 1920, FPS = 30;
  const FONT = '"Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif';
  const INK = '#26213a', CREAM = [253, 246, 236], NIGHT = [21, 18, 42];
  const DIRNAME = { N: 'UP', S: 'DOWN', E: 'RIGHT', W: 'LEFT' }, DIRARROW = { N: '⬆️', S: '⬇️', E: '➡️', W: '⬅️' };
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
  function text(g, s, x, y, size, color, stroke) {
    g.font = `800 ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (stroke) { g.lineJoin = 'round'; g.lineWidth = size * .2; g.strokeStyle = stroke; g.strokeText(s, x, y); }
    g.fillStyle = color; g.fillText(s, x, y);
  }
  const caption = (g, s, y, size, color = '#fff') => text(g, s, W / 2, y, size, color, '#1b1726');
  function dayBadge(g, day) { g.fillStyle = INK; rr(g, W / 2 - 110, 210, 220, 64, 32); g.fill(); text(g, `DAY ${day}`, W / 2, 243, 40, '#ffd43b'); }
  function pill(g, s, y, size, bg, fg, scale = 1) {
    g.save(); g.translate(W / 2, y); g.scale(scale, scale);
    g.font = `800 ${size}px ${FONT}`; const w = g.measureText(s).width + size * 1.4;
    g.fillStyle = bg; rr(g, -w / 2, -size * .9, w, size * 1.8, size * .9); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, 0, 0); g.restore();
  }
  // the end card: tell people to follow, the answer only reaches followers reliably
  function followCta(g, t, tAsk) {
    const p = clamp((t - tAsk) / .25, 0, 1), pulse = 1 + Math.sin((t - tAsk) * 7) * .04;
    if (p > 0) pill(g, 'FOLLOW → answer tomorrow 👀', 1575, 54, '#ff3b5c', '#fff', (.7 + .3 * p) * pulse);
  }
  function stamp(g, s, color, t0, t) { const p = clamp((t - t0) / .2, 0, 1), sc = .6 + .4 * p; g.save(); g.translate(W / 2, 440); g.scale(sc, sc); text(g, s, 0, 0, 76, color, '#fffdf8'); g.restore(); }

  // ---------- rope ----------
  const BX = 40, BY = 520, BW = 1000, BH = 920;
  function pullTarget(R) {
    const P = R.P, N = P.length, ends = [[.015, .5], [.985, .5]], T = new Array(N);
    if (R.knot) {
      const lo = Math.max(1, Math.floor(Math.min(...R.X.map((x) => x.s1))) - 6), hi = Math.min(N - 2, Math.ceil(Math.max(...R.X.map((x) => x.s2))) + 6);
      let cx = 0, cy = 0; for (let i = lo; i <= hi; i++) { cx += P[i][0]; cy += P[i][1]; } cx /= hi - lo + 1; cy /= hi - lo + 1;
      for (let i = lo; i <= hi; i++) T[i] = [.5 + (P[i][0] - cx) * .42, .5 + (P[i][1] - cy) * .42];
      for (let i = 0; i < lo; i++) { const u = i / lo; T[i] = [ends[0][0] + (T[lo][0] - ends[0][0]) * u, ends[0][1] + (T[lo][1] - ends[0][1]) * u]; }
      for (let i = hi + 1; i < N; i++) { const u = (i - hi) / (N - 1 - hi); T[i] = [T[hi][0] + (ends[1][0] - T[hi][0]) * u, T[hi][1] + (ends[1][1] - T[hi][1]) * u]; }
    } else {
      const L = [0]; for (let i = 1; i < N; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      for (let i = 0; i < N; i++) { const u = L[i] / L[N - 1]; T[i] = [ends[0][0] + (ends[1][0] - ends[0][0]) * u, .5 + Math.sin(u * Math.PI * 9) * .004]; }
    }
    return T;
  }
  // k: how far the pull has gone (0..1); tug/t: the small tension tremble while asking
  function drawRope(g, R, T, k, tug = 0, t = 0, arrows = false) {
    const X = (p) => BX + p[0] * BW, Y = (p) => BY + (.04 + p[1] * .92) * BH;
    const pts = R.P.map((p, i) => {
      const u = i / (R.P.length - 1), pull = tug * (u < .5 ? -1 : 1) * Math.pow(Math.abs(u - .5) * 2, 6) * .018;
      return [p[0] + (T[i][0] - p[0]) * k + pull, p[1] + (T[i][1] - p[1]) * k + Math.sin(t * 40 + i * .7) * tug * .0015];
    });
    const rw = 30, cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(X(pts[i]) - X(pts[i - 1]), Y(pts[i]) - Y(pts[i - 1])));
    const path = (a, b) => { g.beginPath(); g.moveTo(X(pts[a]), Y(pts[a])); for (let i = a + 1; i <= b; i++) g.lineTo(X(pts[i]), Y(pts[i])); };
    const stroke = (a, b, cap) => {
      g.lineJoin = 'round'; g.lineCap = cap;
      path(a, b); g.strokeStyle = '#5a3218'; g.lineWidth = rw + 7; g.stroke();
      path(a, b); g.strokeStyle = '#d69a5a'; g.lineWidth = rw; g.stroke();
      path(a, b); g.strokeStyle = 'rgba(120,64,28,.55)'; g.lineWidth = rw * .86; g.setLineDash([rw * .3, rw * .55]); g.lineDashOffset = -cum[a]; g.stroke(); g.setLineDash([]); g.lineDashOffset = 0;
      path(a, b); g.strokeStyle = 'rgba(255,235,200,.45)'; g.lineWidth = rw * .22; g.stroke();
    };
    stroke(0, pts.length - 1, 'round');
    const fade = R.knot ? 1 : clamp(1 - k * 1.6, 0, 1);
    if (fade > 0) { g.globalAlpha = fade; for (const x of R.X) { const c = Math.round(x.overFirst ? x.s1 : x.s2); stroke(Math.max(0, c - 5), Math.min(pts.length - 1, c + 5), 'butt'); } g.globalAlpha = 1; }
    for (const [p, d] of [[pts[0], -1], [pts[pts.length - 1], 1]]) {
      g.fillStyle = '#5a3218'; g.beginPath(); g.arc(X(p), Y(p), rw * .8, 0, 7); g.fill();
      g.fillStyle = '#e8c08a'; g.beginPath(); g.arc(X(p), Y(p), rw * .48, 0, 7); g.fill();
      if (arrows) {
        const wob = (Math.sin(t * 9) + 1) * 8, ax = X(p) - d * 40 + d * wob, ay = Y(p) - 78;
        g.save(); g.translate(ax, ay); g.scale(d, 1); g.fillStyle = INK; g.beginPath();
        g.moveTo(-34, -9); g.lineTo(8, -9); g.lineTo(8, -24); g.lineTo(38, 0); g.lineTo(8, 24); g.lineTo(8, 9); g.lineTo(-34, 9); g.closePath(); g.fill(); g.restore();
      }
    }
  }
  function table(g) {
    g.fillStyle = `rgb(${CREAM})`; g.fillRect(0, 0, W, H);
    g.fillStyle = '#efe0c8'; rr(g, BX, BY, BW, BH, 40); g.fill();
    g.strokeStyle = 'rgba(160,120,80,.13)'; g.lineWidth = 4;
    for (let y = BY + 30; y < BY + BH; y += 54) { g.beginPath(); g.moveTo(BX, y); g.bezierCurveTo(BX + BW * .3, y + 14, BX + BW * .6, y - 14, BX + BW, y + 6); g.stroke(); }
  }

  // ---------- maze ----------
  const CS = 135, OX = (W - CS * 6) / 2, OY = 690;
  function board(g, m, light, trail) {
    const mix = (a, b) => a.map((v, i) => Math.round(b[i] + (v - b[i]) * light));
    g.fillStyle = `rgb(${mix([255, 253, 248], [30, 26, 58])})`;
    rr(g, OX - CS * .22, OY - CS * .22, CS * m.cols + CS * .44, CS * m.rows + CS * .44, CS * .3); g.fill();
    g.fillStyle = light > .5 ? 'rgba(38,33,58,.14)' : 'rgba(170,160,220,.35)';
    for (let y = 0; y <= m.rows; y++) for (let x = 0; x <= m.cols; x++) { g.beginPath(); g.arc(OX + x * CS, OY + y * CS, CS * .045, 0, 7); g.fill(); }
    if (trail && trail.length > 1) {
      g.strokeStyle = 'rgba(255,140,100,.5)'; g.lineWidth = CS * .22; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); trail.forEach(([x, y], i) => { const px = OX + (x + .5) * CS, py = OY + (y + .5) * CS; i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke();
    }
    if (light > 0) {
      g.globalAlpha = light; g.strokeStyle = INK; g.lineWidth = CS * .12; g.lineCap = 'round';
      const seg = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); };
      for (let y = 0; y < m.rows; y++) for (let x = 0; x < m.cols; x++) {
        const c = m.cells[y * m.cols + x], X = OX + x * CS, Y = OY + y * CS;
        if (!(c & 1)) seg(X, Y, X + CS, Y);
        if (!(c & 8)) seg(X, Y, X, Y + CS);
        if (x === m.cols - 1 && !(c & 2)) seg(X + CS, Y, X + CS, Y + CS);
        if (y === m.rows - 1 && !(c & 4)) seg(X, Y + CS, X + CS, Y + CS);
      }
      g.globalAlpha = 1;
    }
    const ex = OX + (m.exit[0] + .5) * CS, ey = OY + (m.exit[1] + .5) * CS;
    g.fillStyle = 'rgba(52,199,120,.38)'; g.beginPath(); g.arc(ex, ey, CS * .44, 0, 7); g.fill();
    g.fillStyle = '#8a5a35'; rr(g, ex - CS * .17, ey - CS * .26, CS * .34, CS * .52, CS * .05); g.fill();
    g.fillStyle = '#ffd43b'; g.beginPath(); g.arc(ex + CS * .09, ey + CS * .02, CS * .035, 0, 7); g.fill();
  }
  function ball(g, bx, by, glow) {
    if (glow > 0) { const gr = g.createRadialGradient(bx, by, 0, bx, by, CS); gr.addColorStop(0, `rgba(255,170,120,${.45 * glow})`); gr.addColorStop(1, 'rgba(255,170,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, CS, 0, 7); g.fill(); }
    g.fillStyle = '#ff6b4a'; g.beginPath(); g.arc(bx, by, CS * .3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(bx - CS * .09, by - CS * .1, CS * .09, 0, 7); g.fill();
  }
  function arrow(g, x, y, dir, size, color) {
    const ang = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 }[dir];
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = color; g.beginPath(); g.arc(0, 0, size, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(size * .55, 0); g.lineTo(-size * .3, -size * .45); g.lineTo(-size * .3, size * .45); g.closePath(); g.fill();
    g.restore();
  }
  // position along a list of cells, u in cells
  function along(cells, u) {
    const i = Math.min(cells.length - 1, Math.floor(u)), j = Math.min(cells.length - 1, i + 1), f = u - i;
    return [OX + (cells[i][0] + (cells[j][0] - cells[i][0]) * f + .5) * CS, OY + (cells[i][1] + (cells[j][1] - cells[i][1]) * f + .5) * CS];
  }
  function mazeSetup(c) {
    const M = B.build(6, 6, 3, c.seed), dist = B.bfs(M, M.exit);
    let [x, y] = M.start; const path = [];
    while (!(x === M.exit[0] && y === M.exit[1])) {
      for (const [d, [dx, dy]] of Object.entries(B.DIRS)) if (B.open(M, x, y, d) && dist[(y + dy) * M.cols + x + dx] === dist[y * M.cols + x] - 1) { path.push(d); x += dx; y += dy; break; }
    }
    const all = [[...M.start]];
    for (const d of path) { const [cx, cy] = all[all.length - 1], [dx, dy] = B.DIRS[d]; all.push([cx + dx, cy + dy]); }
    const walk = path.slice(0, c.steps), cells = all.slice(0, c.steps + 1), fork = cells[cells.length - 1];
    const came = { N: 'S', S: 'N', E: 'W', W: 'E' }[walk[walk.length - 1]];
    const opts = Object.keys(B.DIRS).filter((d) => B.open(M, fork[0], fork[1], d) && d !== came);
    return { M, path, all, walk, cells, opts, answer: path[c.steps] };
  }

  // ---------- parts ----------
  const RV = 3.2; // reveal length
  function revealKnot(g, S, t) {
    table(g);
    drawRope(g, S.R, S.T, ease(clamp((t - .5) / 1.5, 0, 1)));
    caption(g, "yesterday's rope 🪢", 340, 74);
    if (t < 2) caption(g, 'pulling…', 435, 60);
    else S.R.knot ? stamp(g, S.R.span === 3 ? 'KNOT ✅ a trefoil!' : S.R.span === 4 ? 'KNOT ✅ figure-eight!' : 'KNOT ✅ locked tight!', '#c0652b', 2, t) : stamp(g, 'NOT ✅ it slides out!', '#16a34a', 2, t);
  }
  function revealMaze(g, S, t) {
    g.fillStyle = `rgb(${CREAM})`; g.fillRect(0, 0, W, H);
    const Z = S.Z, n = Z.cells.length - 1, total = Z.all.length - 1;
    const u = t < .6 ? n : n + ease(clamp((t - .6) / 1.5, 0, 1)) * (total - n);
    const i = Math.floor(u), trail = [...Z.all.slice(0, i + 1)], [bx, by] = along(Z.all, u);
    trail.push([(bx - OX) / CS - .5, (by - OY) / CS - .5]);
    board(g, Z.M, 1, trail);
    ball(g, bx, by, 0);
    caption(g, "yesterday's maze 🌑", 340, 74);
    if (t < 2.1) caption(g, 'the way out was…', 435, 60);
    else stamp(g, `${DIRARROW[Z.answer]} ${DIRNAME[Z.answer]} ✅`, '#16a34a', 2.1, t);
  }
  function askMaze(g, S, t0, t) {
    const Z = S.Z2, T0 = t0, LOOK = T0 + 3, DARK = LOOK + .35, WALK0 = DARK + .1, STEP_T = .19;
    const light = t < LOOK ? 1 : Math.max(0, 1 - (t - LOOK) / (DARK - LOOK));
    const bg = NIGHT.map((v, i) => Math.round(v + (CREAM[i] - v) * light));
    g.fillStyle = `rgb(${bg})`; g.fillRect(0, 0, W, H);
    const ASK = WALK0 + Z.walk.length * STEP_T + .25;
    const k = Math.max(0, (t - WALK0) / STEP_T), i = Math.min(Z.walk.length, Math.floor(k)), f = i >= Z.walk.length ? 0 : 1 - Math.pow(1 - (k - i), 3);
    const a = Z.cells[i], b = Z.cells[Math.min(Z.walk.length, i + 1)];
    const bx = OX + (a[0] + (b[0] - a[0]) * f + .5) * CS, by = OY + (a[1] + (b[1] - a[1]) * f + .5) * CS;
    board(g, Z.M, light, t > WALK0 ? [...Z.cells.slice(0, i + 1), [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]] : null);
    ball(g, bx, by, 1 - light);
    if (t < LOOK) {
      const r = 1 - (t - T0) / 3;
      g.fillStyle = 'rgba(38,33,58,.12)'; rr(g, OX, OY - 70, CS * 6, 14, 7); g.fill();
      g.fillStyle = r < .34 ? '#e5484d' : '#ff6b4a'; rr(g, OX, OY - 70, CS * 6 * r, 14, 7); g.fill();
    }
    if (t >= ASK) {
      const p = Math.min(1, (t - ASK) / .25), pulse = 1 + Math.sin((t - ASK) * 8) * .06, cols = { N: '#4dabf7', E: '#9c6ade', S: '#34c778', W: '#ffb020' };
      for (const d of Z.opts) { const [dx, dy] = B.DIRS[d]; arrow(g, bx + dx * CS * .78, by + dy * CS * .78, d, CS * .3 * p * pulse, cols[d]); }
    }
    if (t < LOOK) { caption(g, 'today: memorize the way out 🧠', 340, 66); caption(g, String(3 - Math.floor(t - T0)), 450, 96, '#ffd43b'); if (S.cfg.hook) pill(g, S.cfg.hook, 1600, 50, INK, '#ffd43b'); }
    else if (t < ASK) { caption(g, 'lights out 🌑', 340, 84); if (t > WALK0) caption(g, 'walking from memory...', 450, 60); }
    else { caption(g, 'which way now? 👇', 340, 84, '#ffd43b'); caption(g, 'comment the direction', 450, 58); followCta(g, t, ASK + .4); }
  }
  function askKnot(g, S, t0, t) {
    table(g);
    const FREEZE = t0 + 3.2, frozen = t >= FREEZE, tug = frozen ? .9 : clamp((t - t0 - .3) / 2.9, 0, 1);
    drawRope(g, S.R2, S.R2.P, 0, tug, frozen ? FREEZE : t, true);
    if (!frozen) {
      caption(g, 'today: pull both ends 🪢', 340, 74); if (t > t0 + .9) caption(g, `${S.R2.X.length} crossings. does it tie up?`, 440, 58);
      if (S.cfg.hook) pill(g, S.cfg.hook, 1575, 50, INK, '#ffd43b');
    } else {
      caption(g, 'KNOT or NOT? 👇', 340, 96, '#ffd43b'); caption(g, 'comment one word', 450, 58);
      followCta(g, t, FREEZE);
    }
  }
  function durOf(S) { return S.cfg.ask.type === 'knot' ? RV + 5.2 : RV + 3 + .45 + S.Z2.walk.length * .19 + .25 + 2; }
  function draw(g, S, t) {
    const r = S.cfg.reveal, a = S.cfg.ask;
    if (t < RV) { r.type === 'knot' ? revealKnot(g, S, t) : revealMaze(g, S, t); if (S.cfg.shout && t > 2.3) [].concat(S.cfg.shout).forEach((line, i) => caption(g, line, 1560 + i * 62, i ? 44 : 54)); }
    else a.type === 'knot' ? askKnot(g, S, RV, t) : askMaze(g, S, RV, t);
    if (t >= RV && t < RV + .25) { g.fillStyle = `rgba(253,246,236,${1 - (t - RV) / .25})`; g.fillRect(0, 0, W, H); }
    dayBadge(g, S.cfg.day);
  }
  function setup(cfg) {
    const S = { cfg };
    if (cfg.reveal.type === 'knot') { S.R = K.level(cfg.reveal.level); S.T = pullTarget(S.R); } else S.Z = mazeSetup(cfg.reveal);
    if (cfg.ask.type === 'knot') { S.R2 = K.level(cfg.ask.level); S.answer = S.R2.knot ? 'KNOT' : 'NOT'; } else { S.Z2 = mazeSetup(cfg.ask); S.answer = S.Z2.answer; S.opts = S.Z2.opts; }
    S.dur = durOf(S);
    return S;
  }

  function scheduleAudio(ac, dest, t0, S) {
    const tone = (t, f, d, v, type = 'sine', slide = 0) => {
      const o = ac.createOscillator(), gn = ac.createGain(); o.type = type;
      o.frequency.setValueAtTime(f, t0 + t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + t + d);
      gn.gain.setValueAtTime(0, t0 + t); gn.gain.linearRampToValueAtTime(v, t0 + t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t0 + t + d);
      o.connect(gn).connect(dest); o.start(t0 + t); o.stop(t0 + t + d + .05);
    };
    const noise = (t, d, f0, f1, v, q = 5) => {
      const len = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, len, ac.sampleRate), c = b.getChannelData(0);
      for (let i = 0; i < len; i++) c[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
      s.buffer = b; f.type = 'bandpass'; f.Q.value = q; f.frequency.setValueAtTime(f0, t0 + t); f.frequency.exponentialRampToValueAtTime(f1, t0 + t + d);
      gn.gain.setValueAtTime(0, t0 + t); gn.gain.linearRampToValueAtTime(v, t0 + t + .05); gn.gain.setValueAtTime(v, t0 + t + d * .7); gn.gain.linearRampToValueAtTime(0, t0 + t + d);
      s.connect(f).connect(gn).connect(dest); s.start(t0 + t);
    };
    const win = (t) => [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * .08, f, .4, .28, 'triangle'));
    // reveal
    if (S.cfg.reveal.type === 'knot') { noise(.5, 1.5, 300, 900, .5, 6); S.R.knot ? tone(2, 90, .4, .7, 'sine', -30) : noise(1.7, .5, 500, 2400, .45, 2); win(2.05); }
    else { for (let k = 0; k < 9; k++) tone(.6 + k * .17, 560 + (k % 2) * 70, .07, .2, 'triangle'); win(2.15); }
    // question
    if (S.cfg.ask.type === 'maze') {
      const T0 = RV, LOOK = T0 + 3, WALK0 = LOOK + .45;
      for (const s of [0, 1, 2]) { tone(T0 + s, 1320, .08, .25); tone(T0 + s, 660, .12, .18, 'triangle'); }
      tone(LOOK, 520, .7, .3, 'sawtooth', -440); tone(LOOK + .05, 180, .9, .45, 'sine', -120);
      for (let s = LOOK + .4; s < S.dur; s += .75) { tone(s, 70, .18, .8, 'sine', -20); tone(s + .2, 64, .2, .6, 'sine', -20); }
      S.Z2.walk.forEach((_, i) => tone(WALK0 + i * .19 + .03, 560 + (i % 2) * 70, .07, .2, 'triangle'));
      const ask = WALK0 + S.Z2.walk.length * .19 + .25; tone(ask, 660, .25, .28, 'triangle'); tone(ask + .15, 880, .4, .28, 'triangle');
    } else {
      const FREEZE = RV + 3.2;
      noise(RV + .3, 2.9, 220, 700, .7, 7);
      for (let s = RV + .3, step = .6; s < FREEZE; s += step, step = Math.max(.22, step * .9)) tone(s, 1400, .04, .18, 'square');
      tone(FREEZE, 700, .3, .45, 'sawtooth', -600); tone(FREEZE + .4, 660, .25, .35, 'triangle'); tone(FREEZE + .55, 880, .5, .35, 'triangle');
    }
  }
  async function record(cfg, { mime = 'video/mp4;codecs=avc1.42E01F,mp4a.40.2' } = {}) {
    const S = setup(cfg), DUR = S.dur;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); draw(g, S, 0);
    const ac = new (window.AudioContext || window.webkitAudioContext)(); await ac.resume();
    const dest = ac.createMediaStreamDestination();
    const stream = new MediaStream([...cv.captureStream(FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6, audioBitsPerSecond: 160e3 });
    const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    const start = performance.now(); scheduleAudio(ac, dest, ac.currentTime + .05, S);
    rec.start(250);
    const mc = new MessageChannel(); let lastT = 0;
    await new Promise((resolve) => {
      mc.port1.onmessage = () => {
        const t = (performance.now() - start) / 1000;
        if (t - lastT >= 1 / FPS) { draw(g, S, Math.min(t, DUR - .001)); lastT = t; }
        if (t >= DUR) resolve(); else mc.port2.postMessage(0);
      };
      mc.port2.postMessage(0);
    });
    rec.stop(); await done; ac.close();
    return { blob: new Blob(chunks, { type: mime.split(';')[0] }), answer: S.answer, opts: S.opts };
  }
  function frameAt(cfg, t) { const S = setup(cfg); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; draw(cv.getContext('2d'), S, t); return cv; }
  root.DayReel = { record, frameAt, setup };
})(window);
