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
