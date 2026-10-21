/* =========================================================
   Psychology 2e Study Guide — shared behaviour
   Theme toggle · Contents scrollspy · Return to top
   Used by index.html and every unit{n}.html page.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'psych2e-theme';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Light / dark toggle ---------- */
  function storeTheme(value) {
    try { localStorage.setItem(THEME_KEY, value); } catch (e) { /* storage unavailable */ }
  }
  var toggle = document.querySelector('[data-theme-toggle]');
  function syncToggle() {
    if (!toggle) return;
    var dark = root.getAttribute('data-theme') === 'dark';
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('title', dark ? 'Light mode' : 'Dark mode');
    toggle.setAttribute('aria-pressed', String(dark));
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      storeTheme(next);
      syncToggle();
    });
    syncToggle();
  }

  /* ---------- Return to top ---------- */
  var topBtn = document.querySelector('[data-back-to-top]');
  if (topBtn) {
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Contents navbar: highlight current section ---------- */
  var toc = document.querySelector('.toc');
  var mobile = window.matchMedia('(max-width: 999px)');
  var items = [];
  var current = null;

  function collect() {
    if (!toc) return;
    items = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'))
      .map(function (a) {
        var id = decodeURIComponent(a.getAttribute('href').slice(1));
        var el = document.getElementById(id);
        return el ? { a: a, el: el } : null;
      })
      .filter(Boolean);
  }

  function parentLink(a) {
    var sub = a.closest('.toc-sub');
    if (!sub) return null;
    return sub.parentElement.querySelector(':scope > a');
  }

  function keepInView(a) {
    if (!toc) return;
    if (mobile.matches) {
      var chip = parentLink(a) || a;
      var left = chip.offsetLeft - (toc.clientWidth - chip.offsetWidth) / 2;
      toc.scrollTo({ left: Math.max(0, left), behavior: reduceMotion ? 'auto' : 'smooth' });
    } else if (toc.scrollHeight > toc.clientHeight) {
      var top = a.offsetTop, bottom = top + a.offsetHeight;
      if (top < toc.scrollTop + 40 || bottom > toc.scrollTop + toc.clientHeight - 40) {
        toc.scrollTo({ top: Math.max(0, top - toc.clientHeight / 3), behavior: 'auto' });
      }
    }
  }

  function update() {
    var y = window.scrollY || window.pageYOffset;
    if (topBtn) topBtn.classList.toggle('show', y > 400);
    if (!items.length) return;

    var offset = (mobile.matches && toc ? toc.offsetHeight : 0) + 40;
    var active = null;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.el.offsetParent === null && it.el !== document.body) continue; // hidden (e.g. filtered out)
      if (it.el.getBoundingClientRect().top - offset <= 0) active = it;
    }
    var atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 2;
    if (atBottom) active = items[items.length - 1];
    if (!active) active = items[0];

    if (active !== current) {
      items.forEach(function (it) { it.a.classList.remove('active', 'parent-active'); it.a.removeAttribute('aria-current'); });
      /* Side-by-side targets (e.g. cards in one grid row) share a top edge:
         highlight every one of them, not just the last. */
      var activeTop = active.el.getBoundingClientRect().top;
      var activeParent = parentLink(active.a);
      items.forEach(function (it) {
        if (it === active || (it.el.offsetParent !== null && parentLink(it.a) === activeParent && activeParent &&
            Math.abs(it.el.getBoundingClientRect().top - activeTop) < 2)) {
          it.a.classList.add('active');
        }
      });
      active.a.setAttribute('aria-current', 'location');
      if (activeParent) activeParent.classList.add('parent-active');
      current = active;
      keepInView(active.a);
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { ticking = false; update(); });
  }

  collect();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { current = null; onScroll(); });
  update();

  /* Pages that build content dynamically can call this afterwards. */
  window.StudyGuide = {
    refresh: function () { collect(); current = null; update(); }
  };
})();
