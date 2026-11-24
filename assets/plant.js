/* Seed-to-plant portfolio.
 *
 * Everything on screen is a pure function of one number, u: how far the visitor has scrolled through
 * the #grow section, measured in screen heights. render(u) draws the seed, roots, stem, one branch per
 * project, the cards and the labels for that u, so scrolling back up reverses the growth exactly.
 *
 * The projects come from the list #project-list further down the page (generated from
 * projects/projects.json by tools/build_projects.py). Add or remove projects there; the plant,
 * branch spacing and scroll length adapt to the count.
 *
 * Without JavaScript, or with "reduce motion" switched on, the page still shows the intro and the full
 * project list. With reduced motion, a still, fully grown plant is drawn instead of the animation.
 */
(function () {
  'use strict';
  var grow = document.getElementById('grow');
  if (!grow || !window.requestAnimationFrame || !document.createElementNS) return;

  var NS = 'http://www.w3.org/2000/svg';
  var root = document.documentElement;
  var stage = grow.querySelector('.stage');
  var svg = grow.querySelector('svg.plant');
  var hero = grow.querySelector('.hero');
  var hint = grow.querySelector('.scroll-hint');
  var finale = grow.querySelector('.finale');
  var cardsLayer = grow.querySelector('.scene-cards');
  var labelsLayer = grow.querySelector('.scene-labels');
  var list = document.getElementById('project-list');
  var items = list ? [].slice.call(list.children).filter(function (li) { return li.classList.contains('project'); }) : [];
  var N = items.length;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animated = !reduce;

  // ---- Timeline, in screen heights of scrolling ----
  var A = 0.55;          // seed opens, first root
  var B = 0.75;          // germination: root deepens, shoot and first leaves
  var C = 0.75;          // the stem grows to full height
  var P = 1.25;          // per project: branch grows, card shows, time to read, card retreats
  var EE = 1.1;          // mature plant and contact invitation
  var S0 = A + B + C, END = S0 + N * P, TOTAL = END + EE;

  // ---- Small helpers ----
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function k(u, a, b) { return clamp((u - a) / (b - a), 0, 1); }
  function eo(x) { return 1 - Math.pow(1 - x, 3); }
  function eio(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function f1(n) { return Math.round(n * 10) / 10; }
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function cubic(p0, p1, p2, p3, n) {
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, m = 1 - t;
      pts.push({ x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x,
                 y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y });
    }
    return measure(pts);
  }
  function measure(pts) {
    var L = 0; pts[0].l = 0;
    for (var i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); pts[i].l = L; }
    pts.L = L; return pts;
  }
  function at(pts, f) { // point and direction (degrees) at a fraction of the curve's length
    var t = clamp(f, 0, 1) * pts.L, i = 1;
    while (i < pts.length - 1 && pts[i].l < t) i++;
    var a = pts[i - 1], b = pts[i], s = (t - a.l) / ((b.l - a.l) || 1);
    return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s, ang: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
  }
  function line(pts) { return 'M' + pts.map(function (p) { return f1(p.x) + ' ' + f1(p.y); }).join('L'); }
  function taper(pts, w0, w1) { // a filled outline that narrows from w0 to w1 along the curve
    var L = [], R = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      var dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
      var w = (w0 + (w1 - w0) * Math.pow(pts[i].l / pts.L, 0.8)) / 2;
      L.push(f1(pts[i].x - dy / d * w) + ' ' + f1(pts[i].y + dx / d * w));
      R.push(f1(pts[i].x + dy / d * w) + ' ' + f1(pts[i].y - dx / d * w));
    }
    return 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
  }

  // ---- Scene state (rebuilt on resize) ----
  var W, H, g, mobile, cx, dxFinal, topY, navH, sE, defs, cam, maskN;
  var seed, rootMain, rootlets, stem, shootFrac, cotys, stemLeaves, branches, finaleH;
  var trackTop = 0, Hs = 1, uD = -1, raf = 0, lastCam = '';

  function grower(parent, pts, w0, w1, cls) { // tapered shape revealed along its length through a stroked mask
    var id = 'pm' + (maskN++);
    var m = el('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -W, y: -H, width: W * 3, height: H * 3 }, defs);
    var mp = el('path', { d: line(pts), fill: 'none', stroke: '#fff', 'stroke-width': Math.max(w0, w1) + 6,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': '1 2', 'stroke-dashoffset': 1 }, m);
    var shape = el('path', { d: taper(pts, w0, w1), 'class': cls, mask: 'url(#' + id + ')' }, parent);
    shape.style.visibility = 'hidden';
    return { pts: pts, p: -1, set: function (p) {
      if (Math.abs(p - this.p) < 1e-4) return; this.p = p;
      mp.setAttribute('stroke-dashoffset', (1 - p).toFixed(4));
      shape.style.visibility = p > 0.003 ? 'visible' : 'hidden';
    } };
  }
  function leaf(parent, x, y, ang, len, fold, cls, ratio) { // unfolds from its attachment point
    var w = len * (ratio || 0.34), gEl = el('g', {}, parent);
    el('path', { 'class': 'leaf' + (cls ? ' ' + cls : ''), d: 'M0 0C' + f1(len * .2) + ' ' + f1(-w * .95) + ' ' + f1(len * .66) + ' ' + f1(-w * 1.05) + ' ' + f1(len) + ' 0C' + f1(len * .64) + ' ' + f1(w * .82) + ' ' + f1(len * .2) + ' ' + f1(w * .78) + ' 0 0Z' }, gEl);
    el('path', { 'class': 'rib', d: 'M' + f1(len * .08) + ' 0Q' + f1(len * .5) + ' ' + f1(-w * .1) + ' ' + f1(len * .88) + ' 0' }, gEl);
    gEl.style.visibility = 'hidden';
    return { v: -1, set: function (v) {
      if (Math.abs(v - this.v) < 1e-4) return; this.v = v;
      if (v <= 0.002) { gEl.style.visibility = 'hidden'; return; }
      var e = eo(v);
      gEl.style.visibility = 'visible';
      gEl.setAttribute('transform', 'translate(' + f1(x) + ' ' + f1(y) + ') rotate(' + f1(ang + (1 - e) * fold) + ') scale(' + (0.1 + 0.9 * e).toFixed(3) + ')');
    } };
  }

  function buildDefs() {
    defs = el('defs', {}, svg);
    var lg = el('linearGradient', { id: 'leafA', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: 0, style: 'stop-color:var(--forest)' }, lg); el('stop', { offset: 1, style: 'stop-color:var(--leaf)' }, lg);
    lg = el('linearGradient', { id: 'leafB', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: 0, style: 'stop-color:var(--leaf)' }, lg); el('stop', { offset: 1, style: 'stop-color:#A9B99B' }, lg);
    lg = el('linearGradient', { id: 'groundTone', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, style: 'stop-color:var(--fg);stop-opacity:.06' }, lg); el('stop', { offset: 1, style: 'stop-color:var(--fg);stop-opacity:0' }, lg);
    var rg = el('radialGradient', { id: 'seedFill', cx: '.36', cy: '.3', r: '.8' }, defs);
    el('stop', { offset: 0, 'stop-color': '#E2AE8F' }, rg); el('stop', { offset: '.45', 'stop-color': '#BA7355' }, rg); el('stop', { offset: 1, 'stop-color': '#6E3F2B' }, rg);
    rg = el('radialGradient', { id: 'seedShadow' }, defs);
    el('stop', { offset: 0, style: 'stop-color:var(--fg);stop-opacity:.32' }, rg); el('stop', { offset: 1, style: 'stop-color:var(--fg);stop-opacity:0' }, rg);
  }

  function buildSeed(x, y, sc) {
    var gS = el('g', { transform: 'translate(' + f1(x) + ' ' + f1(y) + ') scale(' + sc + ')' }, cam);
    el('ellipse', { 'class': 'seed-shadow', cx: 1, cy: 1.5, rx: 13, ry: 3.2 }, gS);
    var body = el('g', { transform: 'rotate(-16)' }, gS);
    var left = el('path', { 'class': 'seed-half', d: 'M0 -17C-7.5 -15 -9.5 -5 -1 0.6L0 0.8Z' }, body);
    var right = el('path', { 'class': 'seed-half', d: 'M0 -17C7.5 -15 9.5 -5 1 0.6L0 0.8Z' }, body);
    var shine = el('ellipse', { 'class': 'seed-shine', cx: 3.4, cy: -11, rx: 1.6, ry: 3.6, transform: 'rotate(18 3.4 -11)' }, body);
    return { v: -1, set: function (o) {
      if (Math.abs(o - this.v) < 1e-4) return; this.v = o;
      left.setAttribute('transform', 'translate(' + f1(-1.6 * o) + ' 0) rotate(' + f1(-17 * o) + ' 0 0.6)');
      right.setAttribute('transform', 'translate(' + f1(1.6 * o) + ' 0) rotate(' + f1(17 * o) + ' 0 0.6)');
      shine.setAttribute('transform', 'translate(' + f1(1.6 * o) + ' 0) rotate(' + f1(17 * o) + ' 0 0.6) rotate(18 3.4 -11)');
    } };
  }

  function build() {
    W = stage.clientWidth; navH = 60;
    mobile = W < 760;
    if (animated) {
      H = stage.clientHeight;
    } else {
      H = Math.round(clamp(window.innerHeight * 0.78, 460, 820));
      grow.style.setProperty('--static-h', H + 'px');
    }
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.textContent = ''; maskN = 0; lastCam = '';
    buildDefs();

    g = Math.round(H * (mobile ? 0.9 : 0.87));
    if (!animated) g = H - 46;
    cx = Math.round(W / 2);
    dxFinal = mobile ? 34 - cx : 0;
    topY = animated ? navH + Math.max(26, H * 0.06) : 34;

    // Ground: a delicate line and a faint tonal change, outside the camera so it stays put
    el('rect', { 'class': 'ground-tone', x: 0, y: g, width: W, height: H - g }, svg);
    var gd = 'M-10 ' + (g + 1);
    for (var x = 0; x <= W + 40; x += 40) gd += 'L' + x + ' ' + f1(g + Math.sin(x / 97) * 1.2 + Math.sin(x / 31) * 0.5);
    el('path', { 'class': 'ground', d: gd }, svg);

    var connLayer = el('g', {}, svg);
    cam = el('g', {}, svg);
    var rootLayer = el('g', {}, cam);

    // Roots
    var rl = Math.min(H - g - 10, mobile ? 40 : 74);
    rootMain = grower(rootLayer, cubic({ x: cx, y: g - 3 }, { x: cx + 3, y: g + rl * 0.35 }, { x: cx - 11, y: g + rl * 0.6 }, { x: cx - 6, y: g + rl }, 18), mobile ? 2.4 : 3, 0.5, 'root');
    rootlets = [];
    if (!mobile) {
      var r1 = at(rootMain.pts, 0.42), r2 = at(rootMain.pts, 0.66);
      rootlets.push(grower(rootLayer, cubic(r1, { x: r1.x - 8, y: r1.y + 4 }, { x: r1.x - 18, y: r1.y + 8 }, { x: r1.x - 30, y: r1.y + 20 }, 10), 1.6, 0.4, 'root'));
      rootlets.push(grower(rootLayer, cubic(r2, { x: r2.x + 8, y: r2.y + 3 }, { x: r2.x + 16, y: r2.y + 9 }, { x: r2.x + 24, y: r2.y + 20 }, 10), 1.4, 0.4, 'root'));
    }

    // Stem: slightly irregular, tapering towards the top
    var amp = mobile ? 3.5 : 9, M = 64, sp = [];
    for (var i = 0; i <= M; i++) {
      var s = i / M;
      sp.push({ x: cx + amp * (Math.sin(s * 4.1 + 0.4) * 0.7 + Math.sin(s * 9.3 + 1.3) * 0.3) * Math.min(1, s * 2.5),
                y: g - 5 - (g - 5 - topY) * s });
    }
    measure(sp);
    stem = grower(cam, sp, mobile ? 5 : 7.5, 1.3, 'stem');
    shootFrac = (mobile ? 58 : 92) / sp.L;

    // Seed leaves (cotyledons), low on the stem
    var cp = at(sp, (mobile ? 34 : 50) / sp.L), cl = mobile ? 15 : 22;
    cotys = [leaf(cam, cp.x - 1, cp.y, -158, cl, 68, 'b', 0.5), leaf(cam, cp.x + 1, cp.y, -22, cl, -68, 'b', 0.5)];

    // Branches: one per project, alternating sides, natural variation in length and angle
    var cardW = mobile ? 0 : Math.round(clamp(W * 0.27, 290, 350));
    var maxLen = clamp(W / 2 - cardW - 70, 80, 290);
    var attachFrac = [];
    branches = [];
    items.forEach(function (li, i) {
      var fa = 0.25 + 0.71 * (i + 0.5) / Math.max(N, 1);
      attachFrac.push(fa);
      var S = at(sp, fa), dir = mobile ? 1 : (i % 2 ? 1 : -1);
      var len = mobile ? 30 + rnd(i + 2) * 10 : maxLen * (0.62 + 0.38 * rnd(i + 3));
      var rise = mobile ? 6 : 16 + rnd(i + 7) * 34;
      var E = { x: S.x + dir * len, y: S.y - rise };
      var bp = cubic(S, { x: S.x + dir * len * 0.3, y: S.y + 4 }, { x: S.x + dir * len * 0.7, y: S.y - rise * 0.85 }, E, 26);
      var b = { i: i, dir: dir, E: E, br: grower(cam, bp, mobile ? 3.2 : 4.8, 1.1, 'branch'), leaves: [] };
      var spots = mobile ? [[0.45, -1], [0.75, 1]] : [[0.34, -1], [0.58, 1], [0.82, -1]];
      spots.forEach(function (sp2, j) {
        var q = at(bp, sp2[0]), a = q.ang;
        var ang = sp2[1] < 0 ? a - (44 + rnd(i * 5 + j) * 10) * dir : a + (38 + rnd(i * 7 + j) * 10) * dir;
        var ln = mobile ? 11 : 15 + rnd(i * 3 + j) * 9;
        b.leaves.push({ f: sp2[0], l: leaf(cam, q.x, q.y, ang, ln, a - ang, j % 2 ? 'b' : '') });
      });
      b.ring = el('circle', { 'class': 'bud-ring', cx: f1(E.x), cy: f1(E.y), r: 8 }, cam);
      b.bud = el('circle', { 'class': 'bud', cx: f1(E.x), cy: f1(E.y), r: mobile ? 3.4 : 4 }, cam);
      b.ring.style.opacity = 0; b.bud.style.opacity = 0;
      branches.push(b);
    });

    // A few leaves along the stem between branches (fewer on phones)
    stemLeaves = [];
    var fl = mobile ? [0.33, 0.7] : [0.2, 0.33, 0.47, 0.6, 0.74, 0.87, 0.96];
    fl.forEach(function (f, j) {
      if (attachFrac.some(function (a) { return Math.abs(a - f) < 0.035; })) f += 0.03;
      var q = at(sp, f), side = j % 2 ? 1 : -1;
      var ang = side > 0 ? -38 - rnd(j + 11) * 14 : -142 + rnd(j + 13) * 14;
      var ln = mobile ? 12 : 17 + rnd(j + 17) * 10;
      stemLeaves.push({ f: f, l: leaf(cam, q.x + side, q.y, ang, ln, -90 - ang, j % 3 ? '' : 'b') });
    });

    seed = buildSeed(cx, g - 1, mobile ? 1.15 : 1.45);

    // Cards and labels: copies of the list items, placed at their branch ends
    cardsLayer.textContent = ''; labelsLayer.textContent = '';
    branches.forEach(function (b, i) {
      var li = items[i];
      var title = li.querySelector('.pcard-title');
      var lab = document.createElement('a');
      lab.className = 'plant-label' + (b.dir < 0 && !mobile ? ' left' : '');
      lab.href = '#' + li.id; lab.tabIndex = -1;
      lab.innerHTML = '<span class="n">' + String(i + 1).padStart(2, '0') + '</span><span class="t"></span>';
      lab.querySelector('.t').textContent = title ? title.textContent : '';
      lab.addEventListener('click', function (e) { if (!animated) return; e.preventDefault(); goTo(i); });
      labelsLayer.appendChild(lab);
      b.label = lab;
      if (!animated) return;
      var c = li.cloneNode(true);
      c.removeAttribute('id');
      [].forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); });
      c.querySelector('.pcard').removeAttribute('aria-labelledby');
      [].forEach.call(c.querySelectorAll('a'), function (a) { a.tabIndex = -1; });
      var ex = b.E.x + dxFinal;
      var w = mobile ? Math.round(W - (ex + 12) - 14) : cardW;
      c.style.width = w + 'px';
      cardsLayer.appendChild(c);
      var h = c.offsetHeight;
      var x = mobile ? ex + 12 : (b.dir < 0 ? ex - 28 - w : ex + 28);
      x = clamp(x, 14, W - 14 - w);
      var y = clamp(b.E.y - h * 0.4, navH + 12, H - h - 14);
      c.style.left = Math.round(x) + 'px'; c.style.top = Math.round(y) + 'px';
      b.card = c; b.box = { x: x, y: y, w: w, h: h };
      var edgeX = b.dir < 0 && !mobile ? x + w : x;
      b.conn = el('path', { 'class': 'connector', d: 'M' + f1(ex + b.dir * 6) + ' ' + f1(b.E.y) + 'L' + f1(edgeX) + ' ' + f1(clamp(b.E.y, y + 18, y + h - 18)) }, connLayer);
      b.conn.style.opacity = 0;
    });
    // Which labels would sit under which card (so they hide while that card is open)
    branches.forEach(function (b) {
      b.under = branches.map(function (o) {
        if (!o.box) return 0;
        var lx = b.E.x + dxFinal, ly = b.E.y;
        var x0 = mobile ? lx : (b.dir < 0 ? lx - 240 : lx), x1 = mobile ? lx + 40 : x0 + 240;
        return (x1 > o.box.x - 8 && x0 < o.box.x + o.box.w + 8 && ly > o.box.y - 22 && ly < o.box.y + o.box.h + 22) ? 1 : 0;
      });
    });

    // Camera scale for the mature plant, leaving room for the contact invitation above it
    finaleH = animated ? finale.offsetHeight : 0;
    var room = animated ? navH + Math.max(18, H * 0.06) + finaleH + (mobile ? 16 : 28) : 0;
    sE = animated ? clamp((g - room) / (g - topY + 34), 0.42, 1) : 1;

    // Track length follows the number of projects
    if (animated) {
      Hs = H;
      grow.style.height = Math.round(TOTAL * Hs + Hs) + 'px';
      trackTop = grow.getBoundingClientRect().top + window.scrollY;
    }
  }

  // ---- Draw the state for scroll position u ----
  function render(u) {
    // Opening screen: intro text stays fully readable until scrolling starts
    var hv = animated ? 1 - k(u, 0.14, A + 0.12) : 1;
    hero.style.opacity = hv.toFixed(3);
    hero.style.transform = hv < 1 ? 'translateY(' + f1(-28 * (1 - hv)) + 'px)' : '';
    hero.style.visibility = hv > 0.01 ? 'visible' : 'hidden';
    if (hint) hint.style.opacity = (1 - k(u, 0.02, 0.22)).toFixed(3);

    // A: the seed opens and a root appears. B: the root deepens, a shoot rises, seed leaves unfold.
    seed.set(eo(k(u, 0.08, A * 0.95)));
    rootMain.set(0.3 * eo(k(u, 0.2, A)) + 0.7 * eio(k(u, A, A + B * 0.8)));
    rootlets.forEach(function (r, j) { r.set(eo(k(u, A + B * (0.3 + j * 0.15), A + B))); });
    var ps = shootFrac * eo(k(u, A * 0.7, A + B * 0.85)) + (1 - shootFrac) * eio(k(u, A + B * 0.65, S0 - 0.05));
    stem.set(ps);
    cotys.forEach(function (c, j) { c.set(k(u, A + B * (0.35 + j * 0.06), A + B * 0.95)); });
    // C: leaves along the stem unfold as the stem passes them
    stemLeaves.forEach(function (s) { s.l.set(k(ps, s.f + 0.004, s.f + 0.07)); });

    // D: one branch per project
    var vis = [];
    branches.forEach(function (b, i) {
      var s0 = S0 + i * P;
      var bp = eio(k(u, s0, s0 + 0.4));
      b.br.set(bp);
      b.leaves.forEach(function (L) { L.l.set(k(bp, L.f - 0.02, L.f + 0.26)); });
      var budV = k(bp, 0.9, 1);
      b.bud.style.opacity = budV.toFixed(3);
      var cv = 0;
      if (b.card) {
        var cin = eo(k(u, s0 + 0.32, s0 + 0.5)), cout = 1 - k(u, s0 + P - 0.22, s0 + P + 0.02);
        cv = Math.min(cin, cout);
        var c = b.card;
        if (cv <= 0.002) { if (c.style.visibility !== 'hidden') { c.style.visibility = 'hidden'; c.style.opacity = 0; c.classList.remove('live'); } }
        else {
          c.style.visibility = 'visible';
          c.style.opacity = cv.toFixed(3);
          c.style.transform = 'translate3d(0,' + f1((1 - cin) * 18 - (1 - cout) * 10) + 'px,0)';
          c.classList.toggle('live', cv > 0.6);
        }
        b.conn.style.opacity = (cv * 0.9).toFixed(3);
      }
      b.ring.style.opacity = (cv * 0.9).toFixed(3);
      vis.push(cv);
    });

    // Camera: on phones the plant moves to the side to make room; at the end it steps back to show the whole map
    var dx = animated ? dxFinal * eio(k(u, A + B * 0.6, S0 - 0.1)) : dxFinal;
    var fin = animated ? eio(k(u, END + 0.05, END + 0.6)) : 0;
    var s = 1 - (1 - sE) * fin;
    var tx = dx + cx * (1 - s), ty = g * (1 - s);
    var camStr = 'translate(' + f1(tx) + ' ' + f1(ty) + ') scale(' + s.toFixed(4) + ')';
    if (camStr !== lastCam) { cam.setAttribute('transform', camStr); lastCam = camStr; }

    // Labels: each project keeps a small marker on its branch once its card has been read
    var offY = animated ? 0 : svg.getBoundingClientRect().top - stage.getBoundingClientRect().top;
    branches.forEach(function (b, i) {
      var s0 = S0 + i * P, lv;
      if (!animated) lv = 1;
      else if (mobile) lv = k(u, s0 + 0.3, s0 + 0.42);
      else lv = Math.max(k(u, s0 + P - 0.16, s0 + P + 0.04), fin);
      var hide = 0;
      for (var j = 0; j < vis.length; j++) if (b.under[j] && j !== i) hide = Math.max(hide, vis[j]);
      if (!mobile && vis[i] > 0) hide = Math.max(hide, vis[i]);
      lv *= 1 - hide;
      var lab = b.label;
      if (lv <= 0.01) { if (lab.style.visibility !== 'hidden') { lab.style.visibility = 'hidden'; lab.classList.remove('live'); } return; }
      var X = tx + s * b.E.x, Y = ty + s * b.E.y + offY;
      lab.style.visibility = 'visible';
      lab.style.opacity = lv.toFixed(3);
      lab.style.transform = 'translate3d(' + f1(b.dir < 0 && !mobile ? X - 10 : X + 8) + 'px,' + f1(Y) + 'px,0) translate(' + (b.dir < 0 && !mobile ? '-100%' : '0') + ',-50%)';
      lab.classList.toggle('live', lv > 0.6);
    });

    // E: invitation to get in touch
    if (animated) {
      var fv = eo(k(u, END + 0.3, END + 0.75));
      finale.style.opacity = fv.toFixed(3);
      finale.style.visibility = fv > 0.01 ? 'visible' : 'hidden';
      finale.style.transform = 'translateY(' + f1((1 - fv) * 16) + 'px)';
      finale.classList.toggle('live', fv > 0.6);
    }
  }

  // ---- Scroll handling: normal browser scrolling; we only read the position ----
  function target() { return clamp((window.scrollY - trackTop) / Hs, 0, TOTAL); }
  function tick() {
    raf = 0;
    var t = target(), d = t - uD;
    if (Math.abs(d) > 2) uD = t - (d > 0 ? 1 : -1);   // big jumps (links, Home/End) ease in over the last bit
    else if (Math.abs(d) < 0.0006) uD = t;
    else uD += d * 0.22;                                // light smoothing; stops as soon as it catches up
    render(uD);
    if (uD !== t) raf = requestAnimationFrame(tick);
  }
  function onScroll() { if (!raf) raf = requestAnimationFrame(tick); }
  function goTo(i) {
    window.scrollTo({ top: trackTop + (S0 + i * P + 0.66) * Hs, behavior: reduce ? 'auto' : 'smooth' });
  }

  function start() {
    root.classList.add('plant-ready');
    grow.classList.add(animated ? 'is-animated' : 'is-static');
    var keepU = uD >= 0 ? uD : null;
    build();
    if (animated) {
      if (keepU !== null && window.scrollY > trackTop && window.scrollY < trackTop + TOTAL * Hs) {
        window.scrollTo(0, trackTop + keepU * Hs);
      }
      uD = target();
      render(uD);
      window.addEventListener('scroll', onScroll, { passive: true });
    } else {
      render(END);
    }
  }

  start();
  var lastW = W, lastH = H, rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      var w = stage.clientWidth, h = animated ? stage.clientHeight : H;
      if (w === lastW && Math.abs(h - lastH) < 2) return;   // ignore phone toolbar show/hide
      lastW = w; lastH = h;
      var u = uD;
      build();
      if (animated) {
        var inside = u > 0 && u < TOTAL;
        if (inside) window.scrollTo(0, trackTop + u * Hs);
        uD = u; render(uD);
      } else render(END);
    }, 140);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { var u = uD; build(); if (animated) { uD = u >= 0 ? u : target(); render(uD); } else render(END); });

  // Buttons that should travel through the growth rather than jump past it
  var explore = document.getElementById('explore');
  if (explore && animated) explore.addEventListener('click', function (e) { e.preventDefault(); goTo(0); });
})();
