/* Psychology 2e study guide: shared behaviour (theme toggle, return to top, scroll spy, quizzes). */
(function () {
  var root = document.documentElement;
  var KEY = 'psych2e-theme';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Light / dark toggle */
  function currentTheme() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var themeBtn = document.getElementById('themeToggle');
  function paintToggle() {
    if (!themeBtn) return;
    var dark = currentTheme() === 'dark';
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    themeBtn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    var lbl = themeBtn.querySelector('.lbl');
    if (lbl) lbl.textContent = dark ? 'Light mode' : 'Dark mode';
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      paintToggle();
    });
  }
  paintToggle();

  /* Return to top */
  var topBtn = document.getElementById('toTop');
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  /* Scroll spy for the Contents bar */
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc ol a[href^="#"]'));
  var targets = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });
  var active = null, openPart = null;
  var tocBox = document.querySelector('.toc');
  var strip = tocBox ? tocBox.querySelector(':scope > ol') : null;
  /* nested contents: only the part being read is expanded */
  var hasParts = !!document.querySelector('.toc .toc-part');
  if (hasParts) tocBox.classList.add('js-toc');
  function openFor(link) {
    var part = link.closest('.toc-part');
    if (!part || part === openPart) return;
    if (openPart) { openPart.classList.remove('open'); openPart.firstElementChild.classList.remove('part-active'); }
    openPart = part;
    part.classList.add('open');
    part.firstElementChild.classList.add('part-active');
    root.setAttribute('data-part', part.firstElementChild.getAttribute('href').slice(1));
    window.dispatchEvent(new Event('partchange'));
  }
  /* Sticky ribbon: publish its height so the contents bar and anchor jumps sit below it */
  var headEl = document.querySelector('.site-head'), headH = 0;
  function measureHead() {
    if (!headEl) return;
    headH = Math.round(headEl.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--head-h', headH + 'px');
  }
  measureHead();
  if (headEl && window.ResizeObserver) new ResizeObserver(measureHead).observe(headEl);
  else window.addEventListener('resize', measureHead);

  function spy() {
    if (!links.length) return;
    var offset = (window.innerWidth < 900 ? 96 : 48) + headH;
    var idx = 0;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].getBoundingClientRect().top - offset <= 0) idx = i;
    }
    var doc = document.documentElement;
    if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) idx = links.length - 1;
    var link = links[idx];
    if (link === active) return;
    if (active) { active.classList.remove('active'); active.removeAttribute('aria-current'); }
    active = link;
    active.classList.add('active');
    active.setAttribute('aria-current', 'location');
    if (hasParts) openFor(active);
    var list = hasParts ? strip : active.closest('ol');
    if (list && list.scrollWidth > list.clientWidth + 2) {
      /* phone strip: slide the active chip into view */
      var left = active.offsetLeft - 12;
      list.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
    } else if (tocBox && tocBox.scrollHeight > tocBox.clientHeight + 2) {
      /* tall rail: keep the active link visible inside the rail */
      var r = active.getBoundingClientRect(), b = tocBox.getBoundingClientRect();
      if (r.top < b.top + 30 || r.bottom > b.bottom - 30) {
        tocBox.scrollTop += (r.top - b.top) - b.height / 3;
      }
    }
  }

  var ticking = false;
  function onScroll() {
    if (topBtn) topBtn.hidden = window.scrollY < 400;
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () { spy(); ticking = false; });
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  spy();

  /* Quizzes */
  Array.prototype.forEach.call(document.querySelectorAll('.quiz'), function (quiz) {
    var qs = Array.prototype.slice.call(quiz.querySelectorAll('.q'));
    var scoreEl = quiz.querySelector('.score');
    var right = 0, answered = 0;
    function paintScore() {
      if (scoreEl) scoreEl.textContent = 'Score: ' + right + ' / ' + answered + ' answered (of ' + qs.length + ')';
    }
    qs.forEach(function (q) {
      var ans = q.getAttribute('data-answer');
      var why = q.querySelector('.q-why');
      var btns = Array.prototype.slice.call(q.querySelectorAll('.opts button'));
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          if (q.classList.contains('done')) return;
          q.classList.add('done');
          answered++;
          var ok = b.getAttribute('data-k') === ans;
          if (ok) right++;
          btns.forEach(function (x) {
            x.disabled = true;
            if (x.getAttribute('data-k') === ans) x.classList.add('correct');
          });
          if (!ok) b.classList.add('wrong');
          if (why) {
            why.innerHTML = (ok ? '<b class="ok">Correct.</b> ' : '<b class="no">Not quite.</b> ') + why.getAttribute('data-why');
            why.hidden = false;
          }
          paintScore();
        });
      });
    });
    var reset = quiz.querySelector('.quiz-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        right = 0; answered = 0;
        qs.forEach(function (q) {
          q.classList.remove('done');
          q.querySelectorAll('.opts button').forEach(function (x) {
            x.disabled = false; x.classList.remove('correct', 'wrong');
          });
          var why = q.querySelector('.q-why');
          if (why) { why.hidden = true; why.innerHTML = ''; }
        });
        paintScore();
      });
    }
    paintScore();
  });
})();

/* Floating key-term widget (bottom right) */
(function () {
  var box = document.getElementById('ktWidget');
  if (!box) return;
  var panel = document.getElementById('ktPanel');
  var toggle = document.getElementById('ktToggle');
  var closeBtn = document.getElementById('ktClose');
  var scopeEl = document.getElementById('ktScope');
  var tabs = Array.prototype.slice.call(box.querySelectorAll('.ktw-tabs button'));
  var groups = Array.prototype.slice.call(box.querySelectorAll('.ktw-group'));
  var mode = 'current';

  function render() {
    var part = document.documentElement.getAttribute('data-part');
    var match = groups.filter(function (g) { return g.getAttribute('data-part') === part; })[0];
    var showAll = mode === 'all' || !match;
    groups.forEach(function (g) { g.hidden = !(showAll || g === match); });
    if (scopeEl && !box.hasAttribute('data-static')) scopeEl.textContent = showAll ? 'All sections' : match.querySelector('.ktw-sec').textContent;
    box.classList.toggle('ktw-single', !showAll);
    tabs.forEach(function (t) { t.setAttribute('aria-pressed', t.getAttribute('data-scope') === mode ? 'true' : 'false'); });
  }
  function setOpen(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) render();
  }
  toggle.addEventListener('click', function () { setOpen(panel.hidden); });
  closeBtn.addEventListener('click', function () { setOpen(false); toggle.focus(); });
  tabs.forEach(function (t) {
    t.addEventListener('click', function () { mode = t.getAttribute('data-scope'); render(); });
  });
  box.querySelector('.ktw-more').addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !box.contains(e.target)) setOpen(false);
  });
  window.addEventListener('partchange', function () { if (!panel.hidden) render(); });
  render();
})();

/* Interactive correlation explorer (.corr). Points are generated so their sample r matches the slider exactly. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.corr'), function (box) {
    var svg = box.querySelector('svg');
    var dotsG = box.querySelector('.dots');
    var fit = box.querySelector('.fit');
    var range = box.querySelector('input[type=range]');
    var rOut = box.querySelector('.corr-r');
    var kindOut = box.querySelector('.corr-kind');
    var desc = box.querySelector('.corr-desc');
    var xLab = box.querySelector('.corr-x');
    var yLab = box.querySelector('.corr-y');
    var presets = Array.prototype.slice.call(box.querySelectorAll('.corr-presets button'));
    var defX = xLab ? xLab.textContent : '', defY = yLab ? yLab.textContent : '';
    var N = 48, X0 = 44, X1 = 304, Y0 = 222, Y1 = 22, LIM = 2.6;

    /* seeded random numbers so the cloud is the same on every visit */
    var s = 20260222;
    function rnd() { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    function gauss() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    function standardize(a) {
      var m = a.reduce(function (p, c) { return p + c; }, 0) / a.length;
      var sd = Math.sqrt(a.reduce(function (p, c) { return p + (c - m) * (c - m); }, 0) / a.length);
      return a.map(function (v) { return (v - m) / sd; });
    }
    var x = [], z = [];
    for (var i = 0; i < N; i++) { x.push(gauss()); z.push(gauss()); }
    x = standardize(x);
    z = standardize(z);
    /* remove the part of z that correlates with x, so x and e are exactly uncorrelated */
    var b = x.reduce(function (p, c, k) { return p + c * z[k]; }, 0) / N;
    var e = standardize(z.map(function (v, k) { return v - b * x[k]; }));

    var NS = 'http://www.w3.org/2000/svg';
    var dots = x.map(function () {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', '4.2'); c.setAttribute('class', 'dot');
      dotsG.appendChild(c); return c;
    });
    function px(v) { v = Math.max(-LIM, Math.min(LIM, v)); return X0 + (v + LIM) / (2 * LIM) * (X1 - X0); }
    function py(v) { v = Math.max(-LIM, Math.min(LIM, v)); return Y0 - (v + LIM) / (2 * LIM) * (Y0 - Y1); }

    function draw(r) {
      var q = Math.sqrt(Math.max(0, 1 - r * r));
      dots.forEach(function (d, k) {
        var y = r * x[k] + q * e[k];
        d.style.transform = 'translate(' + px(x[k]).toFixed(1) + 'px,' + py(y).toFixed(1) + 'px)';
      });
      fit.setAttribute('x1', px(-LIM)); fit.setAttribute('y1', py(-LIM * r));
      fit.setAttribute('x2', px(LIM)); fit.setAttribute('y2', py(LIM * r));
      fit.style.opacity = Math.abs(r) < 0.05 ? 0 : 1;
      var sign = r > 0.0001 ? '+' : (r < -0.0001 ? '−' : '');
      rOut.textContent = 'r = ' + sign + Math.abs(r).toFixed(2);
      var kind, text;
      if (Math.abs(r) < 0.05) {
        kind = 'No correlation';
        text = 'The variables are unrelated: knowing one tells you nothing about the other.';
      } else if (r > 0) {
        kind = 'Positive correlation';
        text = 'The variables move in the same direction: as one increases, so does the other.';
      } else {
        kind = 'Negative correlation';
        text = 'The variables move in opposite directions: as one increases, the other decreases.';
      }
      if (Math.abs(r) >= 0.05) text += Math.abs(r) > 0.995 ? ' At ±1 every point sits on the line.' : ' The closer r is to ±1, the tighter the points hug the line.';
      kindOut.textContent = kind;
      desc.textContent = text;
      range.setAttribute('aria-valuetext', rOut.textContent + ', ' + kind.toLowerCase());
    }
    range.addEventListener('input', function () {
      presets.forEach(function (p) { p.setAttribute('aria-pressed', 'false'); });
      if (xLab) xLab.textContent = defX;
      if (yLab) yLab.textContent = defY;
      draw(parseFloat(range.value));
    });
    presets.forEach(function (p) {
      p.addEventListener('click', function () {
        presets.forEach(function (o) { o.setAttribute('aria-pressed', o === p ? 'true' : 'false'); });
        var r = parseFloat(p.getAttribute('data-r'));
        range.value = r;
        if (xLab) xLab.textContent = p.getAttribute('data-x');
        if (yLab) yLab.textContent = p.getAttribute('data-y');
        draw(r);
      });
    });
    var start = presets.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; })[0];
    if (start) start.click(); else draw(parseFloat(range.value));
  });
})();

/* ---- Unit 3 components ---- */
/* Punnett square explorer (.punnett) */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.punnett'), function (box) {
    var s1 = box.querySelector('.pn-p1'), s2 = box.querySelector('.pn-p2');
    var presets = Array.prototype.slice.call(box.querySelectorAll('.pn-presets button'));
    var table = box.querySelector('.pn-square');
    var res = box.querySelector('.pn-result');
    var note = box.querySelector('.pn-note');
    var cfg = {};
    function genos() { return [cfg.D + cfg.D, cfg.D + cfg.r, cfg.r + cfg.r]; }
    function pheno(g) { return g.indexOf(cfg.D) >= 0 ? cfg.dn : cfg.rn; }
    function fill(sel, val) {
      sel.innerHTML = '';
      genos().forEach(function (g) {
        var o = document.createElement('option');
        o.value = g; o.textContent = g + ' (' + pheno(g) + ')';
        sel.appendChild(o);
      });
      sel.value = val;
    }
    function draw() {
      var a = s1.value.split(''), b = s2.value.split('');
      var rows = '<tr><th></th><th scope="col">' + b[0] + '</th><th scope="col">' + b[1] + '</th></tr>';
      var counts = {}; var dom = 0;
      a.forEach(function (x) {
        rows += '<tr><th scope="row">' + x + '</th>';
        b.forEach(function (y) {
          var g = [x, y].sort(function (m, n) { return m === cfg.D ? -1 : n === cfg.D ? 1 : 0; }).join('');
          var isDom = g.indexOf(cfg.D) >= 0;
          if (isDom) dom++;
          counts[g] = (counts[g] || 0) + 1;
          rows += '<td class="' + (isDom ? 'dom' : 'rec') + '"><b>' + g + '</b><span>' + pheno(g) + '</span></td>';
        });
        rows += '</tr>';
      });
      table.innerHTML = rows;
      var pD = dom * 25, pR = 100 - pD;
      res.innerHTML =
        '<div class="row"><span>' + cfg.dn + '</span><span class="track"><span class="fill" style="--w:' + pD + '%"></span></span><span class="pct">' + pD + '%</span></div>' +
        '<div class="row rec"><span>' + cfg.rn + '</span><span class="track"><span class="fill" style="--w:' + pR + '%"></span></span><span class="pct">' + pR + '%</span></div>';
      var parts = Object.keys(counts).map(function (g) { return g + ' ' + counts[g] * 25 + '%'; });
      if (note) note.textContent = 'Genotypes: ' + parts.join(', ') + '. Each box is one equally likely combination (25%).';
    }
    function load(p) {
      presets.forEach(function (o) { o.setAttribute('aria-pressed', o === p ? 'true' : 'false'); });
      cfg = { D: p.getAttribute('data-d'), r: p.getAttribute('data-r'), dn: p.getAttribute('data-dn'), rn: p.getAttribute('data-rn') };
      fill(s1, p.getAttribute('data-p1')); fill(s2, p.getAttribute('data-p2'));
      draw();
    }
    presets.forEach(function (p) { p.addEventListener('click', function () { load(p); }); });
    s1.addEventListener('change', draw); s2.addEventListener('change', draw);
    load(presets.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; })[0] || presets[0]);
  });
})();

/* Action potential explorer (.ap) */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(document.querySelectorAll('.ap'), function (box) {
    var path = box.querySelector('.curve');
    var probe = box.querySelector('.probe');
    var btns = Array.prototype.slice.call(box.querySelectorAll('.ap-phases button'));
    var infos = Array.prototype.slice.call(box.querySelectorAll('.ap-info'));
    var zones = Array.prototype.slice.call(box.querySelectorAll('.zone'));
    var fire = box.querySelector('.ap-fire');
    var total = path.getTotalLength();
    function pointAtX(x) {
      var lo = 0, hi = total;
      for (var i = 0; i < 30; i++) { var mid = (lo + hi) / 2; if (path.getPointAtLength(mid).x < x) lo = mid; else hi = mid; }
      return path.getPointAtLength(hi);
    }
    function place(p) { probe.setAttribute('cx', p.x.toFixed(1)); probe.setAttribute('cy', p.y.toFixed(1)); }
    function show(i, move) {
      btns.forEach(function (b, k) { b.setAttribute('aria-pressed', k === i ? 'true' : 'false'); });
      infos.forEach(function (n, k) { n.hidden = k !== i; });
      var b = btns[i];
      zones.forEach(function (z) { z.classList.toggle('on', z.getAttribute('data-i') === String(i)); });
      if (move !== false) place(pointAtX(parseFloat(b.getAttribute('data-x'))));
    }
    var raf = null;
    btns.forEach(function (b, k) { b.addEventListener('click', function () { if (raf) cancelAnimationFrame(raf); raf = null; show(k); }); });
    if (fire) fire.addEventListener('click', function () {
      if (raf) cancelAnimationFrame(raf);
      if (reduce) { show(btns.length - 1); return; }
      var t0 = null, dur = 4200, cur = -1;
      var ends = btns.map(function (b) { return parseFloat(b.getAttribute('data-end')); });
      function step(t) {
        if (t0 === null) t0 = t;
        var f = Math.min(1, (t - t0) / dur);
        var p = path.getPointAtLength(f * total);
        place(p);
        var idx = 0; while (idx < ends.length - 1 && p.x > ends[idx]) idx++;
        if (idx !== cur) { cur = idx; show(idx, false); }
        raf = f < 1 ? requestAnimationFrame(step) : null;
      }
      raf = requestAnimationFrame(step);
    });
    show(0);
  });
})();

/* Clickable brain map (.brainmap) */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.brainmap'), function (box) {
    var hits = Array.prototype.slice.call(box.querySelectorAll('[data-k]'));
    var infos = Array.prototype.slice.call(box.querySelectorAll('.bm-info'));
    function pick(k) {
      hits.forEach(function (h) {
        var on = h.getAttribute('data-k') === k;
        if (h.tagName === 'BUTTON') h.setAttribute('aria-pressed', on ? 'true' : 'false');
        else h.classList.toggle('is-on', on);
      });
      infos.forEach(function (n) { n.hidden = n.getAttribute('data-for') !== k; });
      var svg = box.querySelector('svg'); if (svg) svg.classList.add('has-pick');
    }
    hits.forEach(function (h) {
      h.addEventListener('click', function () { pick(h.getAttribute('data-k')); });
      if (h.tagName !== 'BUTTON') h.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(h.getAttribute('data-k')); }
      });
    });
    var first = box.querySelector('.pill-row button[aria-pressed="true"]') || hits[0];
    pick(first.getAttribute('data-k'));
  });
})();

/* Sympathetic / parasympathetic switch (.ans) */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.ans'), function (box) {
    var btns = Array.prototype.slice.call(box.querySelectorAll('.ans-modes button'));
    var items = Array.prototype.slice.call(box.querySelectorAll('.ans-list span[data-sym]'));
    var pupil = box.querySelector('.pupil');
    var state = box.querySelector('.ans-state');
    function set(mode) {
      box.setAttribute('data-mode', mode);
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === mode ? 'true' : 'false'); });
      items.forEach(function (s) { s.textContent = s.getAttribute('data-' + mode); });
      if (pupil) pupil.setAttribute('r', mode === 'sym' ? '11' : '5');
      if (state) state.textContent = box.querySelector('.ans-modes button[data-mode="' + mode + '"]').getAttribute('data-state');
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-mode')); }); });
    set(box.getAttribute('data-mode') || 'sym');
  });
})();

/* ---- Unit 4 components ---- */
/* Generic picker (.picker, .lightsw, .syn2): buttons with data-k show the panel with matching data-for, or set data-mode */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.picker'), function (box) {
    var btns = Array.prototype.slice.call(box.querySelectorAll('.pill-row button[data-k]'));
    var panels = Array.prototype.slice.call(box.querySelectorAll('[data-for]'));
    function pick(k) {
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-k') === k ? 'true' : 'false'); });
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-for') !== k; });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { pick(b.getAttribute('data-k')); }); });
    var first = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0];
    if (first) pick(first.getAttribute('data-k'));
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-modes]'), function (box) {
    var btns = Array.prototype.slice.call(box.querySelectorAll('.pill-row button[data-mode]'));
    var state = box.querySelector('.mode-state');
    function set(m) {
      box.setAttribute('data-mode', m);
      btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-mode') === m ? 'true' : 'false'); });
      var on = btns.filter(function (b) { return b.getAttribute('data-mode') === m; })[0];
      if (state && on) state.innerHTML = on.getAttribute('data-state');
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-mode')); }); });
    set(box.getAttribute('data-mode') || (btns[0] && btns[0].getAttribute('data-mode')));
  });
})();

/* Sleep-debt calculator (.debt): age groups carry the Table 4.1 ranges */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.debt'), function (box) {
    var sel = box.querySelector('select');
    var range = box.querySelector('input[type=range]');
    var hrs = box.querySelector('.debt-hours b');
    var scale = box.querySelector('.debt-scale');
    var may = scale.querySelector('.may'), rec = scale.querySelector('.rec'), pin = scale.querySelector('.pin');
    var verdict = box.querySelector('.debt-verdict');
    var week = box.querySelector('.debt-week');
    var note = box.querySelector('.debt-note');
    var MIN = parseFloat(range.min), MAX = parseFloat(range.max);
    function pct(v) { return ((Math.max(MIN, Math.min(MAX, v)) - MIN) / (MAX - MIN) * 100) + '%'; }
    function fmt(v) { return (Math.round(v * 10) / 10).toString().replace(/\.0$/, ''); }
    function draw() {
      var o = sel.options[sel.selectedIndex];
      var rl = parseFloat(o.getAttribute('data-rl')), rh = parseFloat(o.getAttribute('data-rh'));
      var ml = parseFloat(o.getAttribute('data-ml')), mh = parseFloat(o.getAttribute('data-mh'));
      var h = parseFloat(range.value);
      hrs.textContent = fmt(h);
      range.setAttribute('aria-valuetext', fmt(h) + ' hours a night');
      may.style.left = pct(ml); may.style.width = 'calc(' + pct(mh) + ' - ' + pct(ml) + ')';
      rec.style.left = pct(rl); rec.style.width = 'calc(' + pct(rh) + ' - ' + pct(rl) + ')';
      pin.style.left = pct(h);
      var v, cls;
      if (h >= rl && h <= rh) { v = 'Recommended'; cls = 'yes'; }
      else if (h >= ml && h <= mh) { v = 'May be appropriate'; cls = 'may'; }
      else { v = 'Not recommended'; cls = 'no'; }
      verdict.textContent = v;
      verdict.className = 'verdict debt-verdict ' + (cls === 'may' ? '' : cls);
      if (cls === 'may') { verdict.style.background = 'var(--note-bg)'; verdict.style.color = 'var(--note)'; }
      else { verdict.style.background = ''; verdict.style.color = ''; }
      var short = Math.max(0, rl - h);
      week.textContent = fmt(short * 7) + ' h';
      note.textContent = short > 0
        ? 'That is ' + fmt(short) + ' h a night below the low end of the recommended ' + fmt(rl) + '–' + fmt(rh) + ' h. Night after night, the shortfall builds into a sleep debt.'
        : (h > rh ? 'No shortfall, though this is more than the recommended ' + fmt(rl) + '–' + fmt(rh) + ' h.' : 'No shortfall: this is inside the recommended ' + fmt(rl) + '–' + fmt(rh) + ' h.');
    }
    sel.addEventListener('change', function () {
      var o = sel.options[sel.selectedIndex];
      range.value = o.getAttribute('data-start') || o.getAttribute('data-rl');
      draw();
    });
    range.addEventListener('input', draw);
    draw();
  });
})();

/* EEG explorer (.eeg): draws a scrolling schematic trace for each stage */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.eeg'), function (box) {
    var btns = Array.prototype.slice.call(box.querySelectorAll('.pill-row button[data-k]'));
    var infos = Array.prototype.slice.call(box.querySelectorAll('.eeg-info'));
    var wave = box.querySelector('.wave');
    var marks = box.querySelector('.marks');
    var waveName = box.querySelector('.eeg-wave'), hz = box.querySelector('.eeg-hz');
    var ampM = box.querySelector('.eeg-amp i'), frqM = box.querySelector('.eeg-frq i');
    var W = 600, MID = 70;
    /* seeded noise so each stage looks the same every visit */
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    /* window = 2 seconds over 600 px */
    function trace(k) {
      seed = 7;
      var pts = [], N = 1200, i, t, y, x;
      var phase2 = rnd() * 6, jit = [];
      for (i = 0; i <= 2 * N; i++) jit.push((rnd() - .5));
      for (i = 0; i <= 2 * N; i++) {
        x = i * (2 * W) / (2 * N);
        t = (x % W) / W * 2; /* seconds within one 600px window, so the trace tiles seamlessly */
        var j = jit[i % N] ;
        if (k === 'awake') y = 5 * Math.sin(2 * Math.PI * 21 * t) + 3 * Math.sin(2 * Math.PI * 27 * t + phase2) + 2.2 * j;
        else if (k === 'rem') y = 6 * Math.sin(2 * Math.PI * 18 * t) + 3 * Math.sin(2 * Math.PI * 9 * t + phase2) + 2.5 * j;
        else if (k === 'stage1') {
          var a = 12 * Math.sin(2 * Math.PI * 10 * t), th = 17 * Math.sin(2 * Math.PI * 5.5 * t + 1);
          var mix = Math.max(0, Math.min(1, (t - .8) / .4));
          y = a * (1 - mix) + th * mix + 2 * j;
        } else if (k === 'stage2') {
          var sp = Math.exp(-Math.pow((t - .45) / .11, 2));
          y = 15 * (1 - .85 * sp) * Math.sin(2 * Math.PI * 5 * t) + 2 * j;
          y += 17 * sp * Math.sin(2 * Math.PI * 14 * t);
          var kc = t - 1.35;
          y += -48 * Math.exp(-Math.pow(kc / .05, 2)) + 30 * Math.exp(-Math.pow((kc - .12) / .07, 2));
        } else y = 46 * Math.sin(2 * Math.PI * 1.5 * t) + 6 * Math.sin(2 * Math.PI * 4 * t + phase2) + 2 * j;
        pts.push((i ? 'L' : 'M') + x.toFixed(1) + ' ' + (MID - y).toFixed(1));
      }
      return pts.join('');
    }
    function show(k) {
      var b = btns.filter(function (x) { return x.getAttribute('data-k') === k; })[0];
      btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      infos.forEach(function (n) { n.hidden = n.getAttribute('data-for') !== k; });
      wave.setAttribute('d', trace(k));
      waveName.textContent = b.getAttribute('data-wave');
      hz.textContent = b.getAttribute('data-hz');
      ampM.style.setProperty('--w', b.getAttribute('data-amp') + '%');
      frqM.style.setProperty('--w', b.getAttribute('data-frq') + '%');
      marks.innerHTML = k === 'stage2'
        ? '<g><line class="mark-l" x1="135" y1="8" x2="135" y2="132"/><text class="mark" x="141" y="20">sleep spindle</text><line class="mark-l" x1="405" y1="8" x2="405" y2="132"/><text class="mark" x="411" y="20">K-complex</text></g><g transform="translate(600 0)"><line class="mark-l" x1="135" y1="8" x2="135" y2="132"/><text class="mark" x="141" y="20">sleep spindle</text><line class="mark-l" x1="405" y1="8" x2="405" y2="132"/><text class="mark" x="411" y="20">K-complex</text></g>'
        : k === 'stage1' ? '<g><text class="mark" x="8" y="20">alpha</text><text class="mark" x="390" y="20">→ theta</text></g><g transform="translate(600 0)"><text class="mark" x="8" y="20">alpha</text><text class="mark" x="390" y="20">→ theta</text></g>' : '';
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-k')); }); });
    show((btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || btns[0]).getAttribute('data-k'));
  });
})();

/* Hypnogram (.hypno): data-seq = "stage:minutes,..." ; a playhead walks through the night */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(document.querySelectorAll('.hypno'), function (box) {
    var svg = box.querySelector('svg');
    var seq = box.getAttribute('data-seq').split(',').map(function (s) { var p = s.split(':'); return { s: p[0], m: parseFloat(p[1]) }; });
    var X0 = 70, X1 = 590, Ytop = 24, step = 34;
    var LV = { W: 0, R: 1, '1': 2, '2': 3, '3': 4 };
    var NAMES = { W: 'Awake', R: 'REM sleep', '1': 'NREM stage 1', '2': 'NREM stage 2', '3': 'NREM stage 3 (slow-wave)' };
    var total = seq.reduce(function (a, b) { return a + b.m; }, 0);
    function X(min) { return X0 + min / total * (X1 - X0); }
    function Y(s) { return Ytop + LV[s] * step; }
    var d = '', t = 0, rem = '', deep = '';
    seq.forEach(function (seg, i) {
      var x1 = X(t), x2 = X(t + seg.m), y = Y(seg.s);
      d += (i ? 'L' : 'M') + x1.toFixed(1) + ' ' + y + 'L' + x2.toFixed(1) + ' ' + y;
      if (seg.s === 'R') rem += 'M' + x1.toFixed(1) + ' ' + y + 'L' + x2.toFixed(1) + ' ' + y;
      if (seg.s === '3') deep += '<rect class="deep" x="' + x1.toFixed(1) + '" y="' + (y - 4) + '" width="' + (x2 - x1).toFixed(1) + '" height="' + (Ytop + 4 * step + 4 - (y - 4)) + '"/>';
      seg.a = t; t += seg.m;
    });
    box.querySelector('.deep-g').innerHTML = deep;
    box.querySelector('.path').setAttribute('d', d);
    box.querySelector('.rem').setAttribute('d', rem);
    var head = box.querySelector('.head-g'), dot = box.querySelector('.head-dot');
    var read = box.querySelector('.hypno-read');
    var playBtn = box.querySelector('.hypno-play');
    function at(min) {
      var seg = seq[seq.length - 1];
      for (var i = 0; i < seq.length; i++) if (min < seq[i].a + seq[i].m) { seg = seq[i]; break; }
      head.setAttribute('transform', 'translate(' + X(min).toFixed(1) + ' 0)');
      dot.setAttribute('cy', Y(seg.s));
      var h = Math.floor(min / 60), m = Math.floor(min % 60);
      read.innerHTML = '<b>' + h + ' h ' + (m < 10 ? '0' : '') + m + ' min</b> into the night: ' + NAMES[seg.s] + '.';
    }
    var raf = null;
    function play() {
      if (raf) cancelAnimationFrame(raf);
      if (reduce) { at(total - 1); return; }
      var t0 = null, dur = 16000;
      function stepF(ts) {
        if (t0 === null) t0 = ts;
        var f = Math.min(1, (ts - t0) / dur);
        at(f * (total - 0.01));
        raf = f < 1 ? requestAnimationFrame(stepF) : null;
      }
      raf = requestAnimationFrame(stepF);
    }
    if (playBtn) playBtn.addEventListener('click', play);
    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      var vx = (e.clientX - r.left) / r.width * 600;
      if (vx < X0 || vx > X1) return;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      at((vx - X0) / (X1 - X0) * (total - 0.01));
    });
    at(0);
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: .5 });
      io.observe(svg);
    }
  });
})();

/* ---- Unit 5 components ---- */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function onVisible(el, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { fn(); io.disconnect(); } }, { threshold: .4 });
    io.observe(el);
  }

  /* Wavelength (nm) to an approximate display colour (after Dan Bruton's approximation) */
  function nmToRgb(w) {
    var r = 0, g = 0, b = 0;
    if (w < 440) { r = -(w - 440) / 60; b = 1; }
    else if (w < 490) { g = (w - 440) / 50; b = 1; }
    else if (w < 510) { g = 1; b = -(w - 510) / 20; }
    else if (w < 580) { r = (w - 510) / 70; g = 1; }
    else if (w < 645) { r = 1; g = -(w - 645) / 65; }
    else { r = 1; }
    var f = 1;
    if (w < 420) f = .3 + .7 * (w - 380) / 40;
    else if (w > 700) f = .3 + .7 * (740 - w) / 40;
    return [r * f, g * f, b * f];
  }
  function rgbCss(c, k) { k = k == null ? 1 : k; return 'rgb(' + c.map(function (v) { return Math.round(255 * Math.pow(Math.max(0, v * k), .8)); }).join(',') + ')'; }
  function colourName(w) {
    if (w < 450) return 'Violet';
    if (w < 485) return 'Blue';
    if (w < 500) return 'Blue-green';
    if (w < 550) return 'Green';
    if (w < 570) return 'Yellow-green';
    if (w < 590) return 'Yellow';
    if (w < 625) return 'Orange';
    return 'Red';
  }

  /* Step chain (.chain-fig): one step lit at a time, with play / pause / step */
  $$('.chain-fig').forEach(function (box) {
    var items = $$('.chain li', box), say = $('.chain-say', box);
    var btnPlay = $('.ch-play', box), btnPrev = $('.ch-prev', box), btnNext = $('.ch-next', box);
    var i = 0, timer = null;
    function show(k) {
      i = (k + items.length) % items.length;
      items.forEach(function (li, n) { li.classList.toggle('on', n === i); li.classList.toggle('done', n < i); });
      if (say) say.innerHTML = '<b>Step ' + (i + 1) + ' of ' + items.length + ':</b> ' + items[i].getAttribute('data-say');
    }
    function stop() { clearInterval(timer); timer = null; if (btnPlay) btnPlay.textContent = 'Play'; }
    function play() { stop(); timer = setInterval(function () { show(i + 1); }, 2600); if (btnPlay) btnPlay.textContent = 'Pause'; }
    if (btnPlay) btnPlay.addEventListener('click', function () { timer ? stop() : play(); });
    if (btnPrev) btnPrev.addEventListener('click', function () { stop(); show(i - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { stop(); show(i + 1); });
    items.forEach(function (li, n) { li.addEventListener('click', function () { stop(); show(n); }); });
    show(0);
    if (!reduce) onVisible(box, play);
  });

  /* Inattentional blindness demo (.ib), modelled on Most et al. (2000) */
  $$('.ib').forEach(function (box) {
    var svg = $('svg', box), layer = $('.ib-layer', box), cover = $('.ib-cover-g', box);
    var startBtn = $('.ib-start', box), msg = $('.ib-msg', box), askRow = $('.ib-ask', box);
    var W = 520, H = 300, shapes = [], cross, raf = null, t0 = 0, bounces = 0, DUR = 14000;
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function make(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    function build() {
      layer.innerHTML = ''; shapes = []; bounces = 0;
      for (var n = 0; n < 8; n++) {
        var white = n < 4, sq = n % 2 === 0, s = 26;
        var el = sq ? make('rect', { width: s, height: s, class: white ? 'ib-w' : 'ib-b' }) : make('circle', { r: s / 2, class: white ? 'ib-w' : 'ib-b' });
        layer.appendChild(el);
        var sp = rnd(1.4, 2.2), a = rnd(0, Math.PI * 2);
        shapes.push({ el: el, sq: sq, s: s, white: white, x: rnd(30, W - 60), y: rnd(30, H - 60), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
      }
      cross = make('path', { d: 'M-6 -18h12v12h12v12h-12v12h-12v-12h-12v-12h12z', class: 'ib-x', transform: 'translate(-40,' + (H / 2) + ')' });
      layer.appendChild(cross);
    }
    function frame(t) {
      if (!t0) t0 = t;
      var el = t - t0;
      shapes.forEach(function (o) {
        o.x += o.vx; o.y += o.vy;
        var hit = false;
        if (o.x < 0) { o.x = 0; o.vx *= -1; hit = true; }
        if (o.x > W - o.s) { o.x = W - o.s; o.vx *= -1; hit = true; }
        if (o.y < 0) { o.y = 0; o.vy *= -1; hit = true; }
        if (o.y > H - o.s) { o.y = H - o.s; o.vy *= -1; hit = true; }
        if (hit && o.white) bounces++;
        if (o.sq) { o.el.setAttribute('x', o.x); o.el.setAttribute('y', o.y); }
        else { o.el.setAttribute('cx', o.x + o.s / 2); o.el.setAttribute('cy', o.y + o.s / 2); }
      });
      /* the red cross crosses the screen between 5 s and 10 s */
      var p = Math.min(1, Math.max(0, (el - 5000) / 5000));
      cross.setAttribute('transform', 'translate(' + (-40 + p * (W + 80)) + ',' + (H / 2) + ')');
      if (el < DUR) raf = requestAnimationFrame(frame);
      else finish();
    }
    function finish() {
      raf = null; layer.innerHTML = ''; cover.style.display = '';
      $('text', cover).textContent = 'Time is up';
      msg.innerHTML = '<b>How many bounces did you count?</b> Before checking, answer one more question:';
      askRow.hidden = false; startBtn.disabled = false; startBtn.textContent = 'Run it again';
    }
    $$('button[data-saw]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var saw = b.getAttribute('data-saw') === 'yes';
        askRow.hidden = true;
        msg.innerHTML = (saw ? '<b>You spotted it.</b> ' : '<b>You missed it, like many people do.</b> ') +
          'A red cross slid across the middle of the screen for about five seconds. The white shapes bounced about ' + bounces +
          ' times. In Most and colleagues’ study, about one third of participants who were counting did not notice the cross.';
      });
    });
    startBtn.addEventListener('click', function () {
      if (raf) return;
      build(); cover.style.display = 'none'; askRow.hidden = true; startBtn.disabled = true;
      msg.innerHTML = '<b>Count every time a white shape bounces off an edge.</b> Ignore the black shapes.';
      t0 = 0; raf = requestAnimationFrame(frame);
    });
  });

  /* Wave anatomy explorer (.wavex): labels sit in a left margin so they never cross the wave */
  $$('.wavex:not(.lightx)').forEach(function (box) {
    var path = $('.w', box), amp = $('input[name=amp]', box), wl = $('input[name=wl]', box);
    var read = $('.fig-read', box), oA = $('output[name=oa]', box), oW = $('output[name=ow]', box);
    var X0 = 130, X1 = 585, MID = 130, BX = 108;
    function set(sel, attrs) { var e = $(sel, box); for (var k in attrs) e.setAttribute(k, attrs[k]); }
    function draw() {
      var A = +amp.value, L = +wl.value, d = '';
      for (var x = X0; x <= X1; x += 2) {
        var y = MID - A * Math.cos(2 * Math.PI * (x - X0 - L / 4) / L);
        d += (x === X0 ? 'M' : 'L') + x + ' ' + y.toFixed(1);
      }
      path.setAttribute('d', d);
      var c1 = X0 + L / 4, t1 = c1 + L / 2, wy = MID - A - 16;
      set('.g-amp', { d: 'M' + BX + ' ' + MID + 'V' + (MID - A) + 'M' + (BX - 5) + ' ' + (MID - A) + 'h10M' + (BX - 5) + ' ' + MID + 'h10' });
      set('.gd-crest', { x1: BX + 6, x2: c1, y1: MID - A, y2: MID - A });
      set('.gd-trough', { x1: BX + 6, x2: t1, y1: MID + A, y2: MID + A });
      set('.t-amp', { x: BX - 10, y: MID - A / 2 + 4 });
      set('.lbl-crest', { x: BX - 10, y: MID - A + 4 });
      set('.lbl-trough', { x: BX - 10, y: MID + A + 4 });
      set('.g-wl', { d: 'M' + c1 + ' ' + wy + 'H' + (c1 + L) + 'M' + c1 + ' ' + (wy - 6) + 'v12M' + (c1 + L) + ' ' + (wy - 6) + 'v12' });
      set('.t-wl', { x: c1 + L / 2, y: wy - 9 });
      var waves = (X1 - X0) / L;
      oA.textContent = A <= 45 ? 'Small' : A <= 70 ? 'Medium' : 'Large';
      oW.textContent = L <= 120 ? 'Short' : L <= 220 ? 'Medium' : 'Long';
      read.innerHTML = '<b>' + waves.toFixed(1) + ' waves</b> fit across the box. ' +
        (L <= 120 ? 'Short wavelength, so more waves pass a point each second: <b>high frequency</b>.' :
          L <= 220 ? 'A middle wavelength gives a <b>middle frequency</b>.' : 'Long wavelength, so fewer waves pass a point each second: <b>low frequency</b>.');
    }
    amp.addEventListener('input', draw); wl.addEventListener('input', draw); draw();
  });

  /* Light explorer (.lightx): wavelength to colour, amplitude to brightness */
  $$('.lightx').forEach(function (box) {
    var nm = $('input[name=nm]', box), am = $('input[name=am]', box), path = $('.w', box);
    var sw = $('.swatch', box), name = $('.name', box), oN = $('output[name=on]', box), oA = $('output[name=oa]', box);
    function draw() {
      var w = +nm.value, A = +am.value, c = nmToRgb(w), k = .25 + .75 * A / 100;
      var L = 40 + (w - 380) / 360 * 120, d = '';
      for (var x = 10; x <= 590; x += 2) {
        var y = 70 - (A * .55) * Math.sin(2 * Math.PI * (x - 10) / L);
        d += (x === 10 ? 'M' : 'L') + x + ' ' + y.toFixed(1);
      }
      path.setAttribute('d', d); path.style.stroke = rgbCss(c, 1);
      sw.style.background = rgbCss(c, k);
      oN.textContent = w + ' nm'; oA.textContent = A < 35 ? 'Low' : A < 70 ? 'Medium' : 'High';
      name.innerHTML = colourName(w) + '<small>' + (A < 35 ? 'dim' : A < 70 ? 'moderately bright' : 'bright') + ' · ' + (w < 500 ? 'shorter wavelength' : w < 600 ? 'middle wavelength' : 'longer wavelength') + '</small>';
    }
    nm.addEventListener('input', draw); am.addEventListener('input', draw); draw();
  });

  /* Tone player (.tone): Web Audio, kept quiet on purpose */
  $$('.tone').forEach(function (box) {
    var f = $('input[name=fq]', box), v = $('input[name=vol]', box), oF = $('output[name=of]', box), oV = $('output[name=ov]', box);
    var btn = $('.play', box), read = $('.fig-read', box), shapeBtns = $$('.pill-row button[data-wave]', box);
    var ctx = null, osc = null, gain = null, shape = 'sine';
    function hz() { return Math.round(20 * Math.pow(1000, +f.value / 1000)); }
    function paint() {
      var h = hz();
      oF.textContent = h.toLocaleString('en-US') + ' Hz';
      oV.textContent = +v.value < 34 ? 'Soft' : +v.value < 67 ? 'Medium' : 'Louder';
      read.innerHTML = h < 250 ? '<b>Low frequency:</b> heard as a low pitch.' : h < 2000 ? '<b>Middle frequency:</b> a middle pitch, where hearing is most sensitive.' : h < 12000 ? '<b>High frequency:</b> heard as a high pitch.' : '<b>Very high frequency:</b> near the top of the human range; some listeners and many speakers cannot reproduce it.';
      if (osc) { osc.frequency.setValueAtTime(h, ctx.currentTime); gain.gain.setTargetAtTime(level(), ctx.currentTime, .02); }
    }
    function level() { return .02 + .1 * (+v.value / 100); }
    function stop() {
      if (!osc) return;
      var o = osc, g = gain; osc = null;
      g.gain.setTargetAtTime(0, ctx.currentTime, .03); setTimeout(function () { try { o.stop(); } catch (e) {} }, 200);
      btn.lastChild.textContent = ' Play tone';
    }
    btn.addEventListener('click', function () {
      if (osc) { stop(); return; }
      try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { read.textContent = 'This browser cannot play audio.'; return; }
      if (ctx.state === 'suspended') ctx.resume();
      osc = ctx.createOscillator(); gain = ctx.createGain();
      osc.type = shape; osc.frequency.value = hz(); gain.gain.value = 0;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      gain.gain.setTargetAtTime(level(), ctx.currentTime, .03);
      btn.lastChild.textContent = ' Stop';
      setTimeout(function () { if (osc) stop(); }, 4000);
    });
    shapeBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        shape = b.getAttribute('data-wave');
        shapeBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (osc) osc.type = shape;
      });
    });
    f.addEventListener('input', paint); v.addEventListener('input', paint); paint();
  });

  /* Cone sensitivity explorer (.cones): curves drawn from three peaks */
  $$('.cones').forEach(function (box) {
    var PEAK = { s: 455, m: 535, l: 580 }, SIG = { s: 30, m: 42, l: 45 };
    var X0 = 50, X1 = 570, Y0 = 210, Y1 = 30;
    function px(w) { return X0 + (w - 380) / 360 * (X1 - X0); }
    function resp(k, w) { var z = (w - PEAK[k]) / SIG[k]; return Math.exp(-z * z / 2); }
    ['s', 'm', 'l'].forEach(function (k) {
      var d = '';
      for (var w = 380; w <= 740; w += 4) d += (w === 380 ? 'M' : 'L') + px(w).toFixed(1) + ' ' + (Y0 - resp(k, w) * (Y0 - Y1)).toFixed(1);
      $('.c-' + k, box).setAttribute('d', d);
    });
    var nm = $('input[name=nm]', box), cur = $('.cursor', box), sw = $('.swatch', box), out = $('output[name=on]', box);
    function draw() {
      var w = +nm.value, x = px(w);
      cur.setAttribute('x1', x); cur.setAttribute('x2', x);
      out.textContent = w + ' nm · ' + colourName(w);
      sw.style.background = rgbCss(nmToRgb(w));
      ['s', 'm', 'l'].forEach(function (k) {
        var r = resp(k, w);
        $('.cb-' + k + ' i', box).style.width = (r * 100).toFixed(0) + '%';
        $('.cb-' + k + ' .v', box).textContent = Math.round(r * 100) + '%';
      });
    }
    nm.addEventListener('input', draw); draw();
  });

  /* Negative afterimage (.after) */
  $$('.after').forEach(function (box) {
    var go = $('.af-go', box), now = $('.af-now', box), reset = $('.af-reset', box), count = $('.count', box), ans = $('.ans', box);
    var timer = null, left = 0;
    function blank() {
      clearInterval(timer); timer = null; box.classList.add('is-blank');
      count.textContent = 'Look now';
      ans.innerHTML = '<b>What do you see?</b> Keep your eyes on the same spot. <button type="button" class="btn af-show">Show the answer</button>';
      $('.af-show', box).addEventListener('click', function () {
        ans.innerHTML = '<b>Expected afterimage:</b> where the green was, a reddish patch; where the yellow was, a bluish disc; and where the black ring was, a light ring. Each color is replaced by its opponent partner (green–red, yellow–blue, black–white).';
      });
    }
    go.addEventListener('click', function () {
      clearInterval(timer); box.classList.remove('is-blank'); left = 30; count.textContent = left + ' s';
      ans.textContent = 'Stare at the small white dot in the centre and keep your eyes still.';
      timer = setInterval(function () { left--; count.textContent = left + ' s'; if (left <= 0) blank(); }, 1000);
    });
    now.addEventListener('click', blank);
    reset.addEventListener('click', function () { clearInterval(timer); timer = null; box.classList.remove('is-blank'); count.textContent = '30 s'; ans.textContent = 'Press Start, then stare at the white dot until the timer ends.'; });
  });

  /* Basilar membrane explorer (.bmx): place along the membrane by frequency */
  $$('.bmx').forEach(function (box) {
    var f = $('input[name=fq]', box), peak = $('.env', box), dot = $('.peak', box), out = $('output[name=of]', box);
    var bRate = $('.b-rate', box), bPlace = $('.b-place', box), read = $('.fig-read', box);
    var XB = 70, XT = 550; /* base on the left, tip on the right */
    function hz() { return Math.round(20 * Math.pow(1000, +f.value / 1000)); }
    function draw() {
      var h = hz(), p = 1 - Math.log(h / 20) / Math.log(1000); /* 0 = base (high), 1 = tip (low) */
      var x = XB + p * (XT - XB);
      peak.setAttribute('d', 'M' + (x - 70) + ' 100 C ' + (x - 30) + ' 100 ' + (x - 18) + ' 58 ' + x + ' 58 C ' + (x + 18) + ' 58 ' + (x + 30) + ' 100 ' + (x + 70) + ' 100 Z');
      dot.setAttribute('cx', x);
      out.textContent = h.toLocaleString('en-US') + ' Hz';
      var rate = h <= 4000;
      bRate.className = 'badge ' + (rate ? 'yes' : 'no'); bRate.textContent = rate ? 'Firing rate: helps code it' : 'Firing rate: too fast to follow';
      bPlace.className = 'badge yes'; bPlace.textContent = 'Place: codes it';
      read.innerHTML = 'Strongest response ' + (p < .33 ? 'near the <b>base</b>' : p < .66 ? 'in the <b>middle</b>' : 'near the <b>tip</b>') + ' of the basilar membrane. ' +
        (rate ? 'Up to about 4,000 Hz, both the rate of action potentials and the place of activation contribute to pitch.' : 'Above about 4,000 Hz, pitch can only be encoded by place.');
    }
    f.addEventListener('input', draw); draw();
  });

  /* Apparent motion (.phi): two lights flashing in turn */
  $$('.phi').forEach(function (box) {
    var a = $('.dot-a', box), b = $('.dot-b', box), s = $('input[name=gap]', box), out = $('output[name=og]', box), read = $('.fig-read', box);
    var on = 0, timer = null;
    function tick() { on = 1 - on; a.style.opacity = on ? 1 : 0; b.style.opacity = on ? 0 : 1; }
    function run() {
      clearInterval(timer);
      var ms = +s.value; out.textContent = ms + ' ms';
      read.innerHTML = ms >= 500 ? '<b>Slow:</b> most people see two separate lights taking turns.' : ms >= 200 ? '<b>Middle speeds:</b> the light starts to seem to jump across the gap.' : '<b>Fast:</b> many people now see a single light moving back and forth, although nothing moves.';
      if (reduce) { a.style.opacity = 1; b.style.opacity = .35; return; }
      timer = setInterval(tick, ms);
    }
    s.addEventListener('input', run); onVisible(box, run);
  });

  /* Proximity slider (.grp-prox): move column pairs apart */
  $$('.grp-prox').forEach(function (box) {
    var s = $('input[name=gap]', box), dots = $$('.d', box), read = $('.fig-read', box);
    function draw() {
      var g = +s.value;
      dots.forEach(function (d) {
        var col = +d.getAttribute('data-col'), pair = Math.floor(col / 2), side = col % 2 ? 1 : -1;
        var shift = (pair - 1) * g * 1.6 + side * -g * .55;
        d.style.transform = 'translateX(' + shift.toFixed(1) + 'px)';
      });
      read.innerHTML = g < 4 ? 'Evenly spaced: you see <b>one block</b> of dots.' : g < 10 ? 'The columns start to pair up.' : 'Pairs of columns sit close together: you see <b>three columns</b>.';
    }
    s.addEventListener('input', draw); draw();
  });
})();

/* Stimulus-to-perception pathway (.s2p): five stations, four example senses */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TEXT = {
    vision: ['Light from the environment enters the eye.',
      'Photoreceptors in the retina, rods and cones, detect the light. Detection by a receptor is <b>sensation</b>.',
      'The light causes chemical changes in the photoreceptors, which convert its energy into action potentials. This conversion is <b>transduction</b>.',
      'Action potentials travel along the optic nerve to the brain.',
      'The occipital lobe organizes and interprets the signals, and you consciously see. This is <b>perception</b>.'],
    hearing: ['Sound waves travel down the auditory canal and set the eardrum and ossicles vibrating.',
      'Moving fluid in the cochlea stimulates hair cells on the basilar membrane. Detection by a receptor is <b>sensation</b>.',
      'Hair-cell activation is mechanical: activated hair cells generate neural impulses. This conversion is <b>transduction</b>.',
      'Impulses travel along the auditory nerve, through the inferior colliculus and the thalamus.',
      'The auditory cortex in the temporal lobe processes them, and you hear a meaningful sound. This is <b>perception</b>.'],
    smell: ['Odor molecules in the air reach the mucous membrane at the top of the nose and dissolve in the mucus.',
      'The molecules bind to receptors on the hair-like extensions of olfactory receptor cells. Detection by a receptor is <b>sensation</b>.',
      'Binding causes chemical changes in the cell that produce neural signals. This conversion is <b>transduction</b>.',
      'Signals go to the olfactory bulb, at the tip of the frontal lobe, where the olfactory nerves begin.',
      'From the bulb, information reaches the limbic system and the primary olfactory cortex, and you recognize the smell. This is <b>perception</b>.'],
    touch: ['Pressure, vibration or stretch acts on the skin.',
      'Skin receptors respond: Meissner’s and Pacinian corpuscles to pressure and vibration, Merkel’s disks to light touch, Ruffini corpuscles to stretch. Detection by a receptor is <b>sensation</b>.',
      'The receptor converts the mechanical energy into action potentials. This conversion is <b>transduction</b>.',
      'Signals travel up the spinal cord to the medulla and the thalamus.',
      'The somatosensory cortex, in the parietal lobe, processes them, and you feel the touch. This is <b>perception</b>.']
  };
  var NAMES = ['Stimulus energy', 'Sensory receptor', 'Transduction', 'Action potentials', 'Brain'];
  Array.prototype.forEach.call(document.querySelectorAll('.s2p'), function (box) {
    var items = Array.prototype.slice.call(box.querySelectorAll('.s2p-track li'));
    var say = box.querySelector('.s2p-say'), fill = box.querySelector('.s2p-rail');
    var senseBtns = Array.prototype.slice.call(box.querySelectorAll('.pill-row button[data-sense]'));
    var btnPlay = box.querySelector('.ch-play'), btnPrev = box.querySelector('.ch-prev'), btnNext = box.querySelector('.ch-next');
    var i = 0, timer = null;
    function show(k) {
      i = (k + items.length) % items.length;
      items.forEach(function (li, n) {
        li.classList.toggle('on', n === i); li.classList.toggle('done', n < i);
        li.querySelector('.stn').setAttribute('aria-current', n === i ? 'step' : 'false');
      });
      fill.style.setProperty('--p', i / (items.length - 1));
      say.classList.toggle('last', i === items.length - 1);
      say.innerHTML = '<b>' + (i + 1) + ' · ' + NAMES[i] + '.</b> ' + TEXT[box.getAttribute('data-sense')][i];
    }
    function stop() { clearInterval(timer); timer = null; btnPlay.textContent = 'Play'; }
    function play() { stop(); timer = setInterval(function () { show(i + 1); }, 3200); btnPlay.textContent = 'Pause'; }
    btnPlay.addEventListener('click', function () { timer ? stop() : play(); });
    btnPrev.addEventListener('click', function () { stop(); show(i - 1); });
    btnNext.addEventListener('click', function () { stop(); show(i + 1); });
    items.forEach(function (li, n) { li.querySelector('.stn').addEventListener('click', function () { stop(); show(n); }); });
    senseBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        box.setAttribute('data-sense', b.getAttribute('data-sense'));
        senseBtns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        show(i);
      });
    });
    show(0);
    if (!reduce && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: .5 });
      io.observe(box);
    }
  });
})();
