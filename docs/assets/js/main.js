/* ============================================================
   GAME THEORY — shared interactivity
   Vanilla JS. No frameworks. Loaded as <script defer> sitewide.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. Mobile nav toggle ---------- */
  function initNav() {
    var btn = document.querySelector('.nav-toggle');
    var nav = document.querySelector('nav.primary');
    if (!btn || !nav) return;
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Menu';
    });
    // close on link click (mobile)
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' && nav.classList.contains('open')) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Menu';
      }
    });
  }

  /* ---------- 2. Mark current page in nav ---------- */
  function markCurrent() {
    var here = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav.primary a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop();
      if (href === here || (here === '' && href === 'index.html')) {
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* ---------- 3. Scroll-reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll('.reveal');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. Year stamp ---------- */
  function stampYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---------- 5. Build payoff matrices declaratively ----------
     A page-builder helper. Any element with class .payoff and a
     data-payoff JSON attribute is hydrated into a styled grid.
     Schema:
     {
       title?: "Prisoner's Dilemma",
       rowLabel: "Player A",  colLabel: "Player B",
       rowStrats: ["Cooperate","Defect"],
       colStrats: ["Cooperate","Defect"],
       cells: [[[3,3],[0,5]],[[5,0],[1,1]]],
       equilibria: [[1,1]],
       caption?: "..."
     }
  ---------------------------------------------------------------- */
  function buildPayoff(el) {
    var raw = el.getAttribute('data-payoff');
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }

    var parts = [];
    if (data.title) {
      parts.push('<div class="payoff-title">' + escapeHTML(data.title) + '</div>');
    }
    var rs = data.rowStrats || [], cs = data.colStrats || [];
    var grid = '<div class="payoff-grid" role="table" aria-label="Payoff matrix">';
    grid += '<div class="p-corner" data-row="' + escapeAttr(data.rowLabel || 'Row') + '" data-col="' + escapeAttr(data.colLabel || 'Col') + '"></div>';
    cs.forEach(function (c) { grid += '<div class="p-head">' + escapeHTML(c) + '</div>'; });
    rs.forEach(function (r, i) {
      grid += '<div class="p-head">' + escapeHTML(r) + '</div>';
      cs.forEach(function (c, j) {
        var cell = (data.cells && data.cells[i] && data.cells[i][j]) || [0, 0];
        var isEq = (data.equilibria || []).some(function (eq) { return eq[0] === i && eq[1] === j; });
        grid += '<div class="p-cell' + (isEq ? ' equilibrium' : '') + '">';
        grid += '<span class="pair"><span class="row-val">' + cell[0] + '</span><span class="sep">,</span><span class="col-val">' + cell[1] + '</span></span>';
        grid += '</div>';
      });
    });
    grid += '</div>';
    parts.push(grid);

    if (data.legend !== false) {
      parts.push('<div class="payoff-legend"><span><span class="swatch row-swatch"></span>' + escapeHTML(data.rowLabel || 'Row') + '</span><span><span class="swatch col-swatch"></span>' + escapeHTML(data.colLabel || 'Col') + '</span></div>');
    }
    if (data.caption) {
      parts.push('<div class="payoff-caption">' + escapeHTML(data.caption) + '</div>');
    }
    el.innerHTML = parts.join('');
  }
  function initPayoffs() {
    document.querySelectorAll('.payoff[data-payoff]').forEach(buildPayoff);
  }

  /* ---------- 6. Small utilities exposed ---------- */
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function escapeAttr(s) { return escapeHTML(s); }

  window.GT = {
    buildPayoff: buildPayoff,
    escapeHTML: escapeHTML
  };

  /* ---------- 7. Boot ---------- */
  function boot() {
    initNav();
    markCurrent();
    initPayoffs();
    initReveal();
    stampYear();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
