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
