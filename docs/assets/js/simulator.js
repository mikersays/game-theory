/* ============================================================
   GAME THEORY — Iterated Prisoner's Dilemma simulator
   Vanilla JS. No deps. Loaded as <script defer> on simulator.html.

   ------------------------------------------------------------
   STRATEGY API
   ------------------------------------------------------------
   A strategy is a plain object:
     {
       id:          'tft',                       // unique slug
       name:        'Tit-for-Tat',               // display name
       short:       'TFT',                       // 3-4 char badge
       blurb:       'short one-line description',
       nice:        true,                        // never defects first (informational)
       decide:      function (ctx) { return 'C' | 'D'; }
     }

   `decide(ctx)` is a PURE function. `ctx` looks like:
     {
       round:        0-indexed round number
       myMoves:      ['C','D',...]   my own historical INTENDED moves
       theirMoves:   ['C','D',...]   opponent's historical INTENDED moves
       myActual:     ['C','D',...]   what was actually played by me (noise may flip)
       theirActual:  ['C','D',...]   what actually landed from them
       myScores:     [3,5,0,...]     per-round points I received
       theirScores:  [3,0,5,...]     per-round points the opponent received
       payoffs:      {T,R,P,S}       the matrix in force
       rng:          () => float     seeded PRNG, [0,1)
     }

   `decide` MUST be deterministic except for explicit calls to ctx.rng().
   Do not read globals or DOM. Do not mutate anything.

   To add your own strategy from the console or another script:
     window.GT.simulator.registerStrategy({
       id: 'my-strat', name: 'My Strategy', short: 'MINE',
       blurb: 'what it does',
       decide: function (c) { return c.round === 0 ? 'C' : 'D'; }
     });
   ============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------
  // Seeded PRNG (Mulberry32). Deterministic for repeatable demos.
  // ----------------------------------------------------------
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Hash a string into a 32-bit seed (so the user can type words).
  function strSeed(s) {
    var h = 2166136261 >>> 0;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ----------------------------------------------------------
  // The strategy zoo. All strategies are pure.
  // ----------------------------------------------------------
  var STRATEGIES = [];

  function registerStrategy(s) {
    if (!s || !s.id || !s.name || typeof s.decide !== 'function') {
      throw new Error('Invalid strategy');
    }
    STRATEGIES.push(s);
  }

  // --- 1. Always Cooperate ---
  registerStrategy({
    id: 'allc', name: 'Always Cooperate', short: 'ALLC',
    blurb: 'Never defects. The pure altruist — a feast for cynics.',
    nice: true,
    decide: function () { return 'C'; }
  });

  // --- 2. Always Defect ---
  registerStrategy({
    id: 'alld', name: 'Always Defect', short: 'ALLD',
    blurb: 'Never cooperates. The pure cynic. Unbeatable head-to-head — but a poison in long tournaments.',
    nice: false,
    decide: function () { return 'D'; }
  });

  // --- 3. Tit-for-Tat ---
  registerStrategy({
    id: 'tft', name: 'Tit-for-Tat', short: 'TFT',
    blurb: 'Cooperates first, then echoes the opponent’s previous move. Rapoport’s four-line winner of Axelrod 1980.',
    nice: true,
    decide: function (c) {
      if (c.round === 0) return 'C';
      return c.theirActual[c.round - 1];
    }
  });

  // --- 4. Generous Tit-for-Tat ---
  registerStrategy({
    id: 'gtft', name: 'Generous Tit-for-Tat', short: 'GTFT',
    blurb: 'Tit-for-Tat that forgives ~10% of defections. Recovers from noise where pure TFT spirals.',
    nice: true,
    decide: function (c) {
      if (c.round === 0) return 'C';
      var prev = c.theirActual[c.round - 1];
      if (prev === 'D' && c.rng() < 0.10) return 'C';
      return prev;
    }
  });

  // --- 5. Tit-for-Two-Tats ---
  registerStrategy({
    id: 'tf2t', name: 'Tit-for-Two-Tats', short: 'TF2T',
    blurb: 'Retaliates only after TWO defections in a row. Kinder than TFT; exploitable by alternating defectors.',
    nice: true,
    decide: function (c) {
      if (c.round < 2) return 'C';
      if (c.theirActual[c.round - 1] === 'D' && c.theirActual[c.round - 2] === 'D') return 'D';
      return 'C';
    }
  });

  // --- 6. Grim Trigger ---
  registerStrategy({
    id: 'grim', name: 'Grim Trigger', short: 'GRIM',
    blurb: 'Cooperates until the first defection — then defects forever. No forgiveness, no second chances.',
    nice: true,
    decide: function (c) {
      for (var i = 0; i < c.round; i++) {
        if (c.theirActual[i] === 'D') return 'D';
      }
      return 'C';
    }
  });

  // --- 7. Pavlov (Win-Stay, Lose-Shift) ---
  registerStrategy({
    id: 'pavlov', name: 'Pavlov', short: 'PAV',
    blurb: 'Win-Stay, Lose-Shift. Repeats its last move if it scored ≥3; otherwise flips. Self-correcting, exploitable by ALLC.',
    nice: true,
    decide: function (c) {
      if (c.round === 0) return 'C';
      var last = c.myActual[c.round - 1];
      var score = c.myScores[c.round - 1];
      if (score >= 3) return last;
      return last === 'C' ? 'D' : 'C';
    }
  });

  // --- 8. Random ---
  registerStrategy({
    id: 'random', name: 'Random', short: 'RAND',
    blurb: 'Flips a fair coin every round. A noise baseline; teaches nothing, scores middling.',
    nice: false,
    decide: function (c) { return c.rng() < 0.5 ? 'C' : 'D'; }
  });

  // --- 9. Detective ---
  registerStrategy({
    id: 'detective', name: 'Detective', short: 'DET',
    blurb: 'Probes with C, D, C, C. If the opponent ever retaliates, plays Tit-for-Tat thereafter. If not, defects forever.',
    nice: false,
    decide: function (c) {
      var probe = ['C', 'D', 'C', 'C'];
      if (c.round < 4) return probe[c.round];
      // Did opponent EVER defect during the four-round probe?
      var retaliated = false;
      for (var i = 0; i < 4; i++) {
        if (c.theirActual[i] === 'D') { retaliated = true; break; }
      }
      if (retaliated) {
        // Tit-for-Tat from here on out.
        return c.theirActual[c.round - 1];
      }
      // Sucker spotted — exploit.
      return 'D';
    }
  });

  // --- 10. Gradual ---
  registerStrategy({
    id: 'gradual', name: 'Gradual', short: 'GRAD',
    blurb: 'After the n-th defection, retaliates with n defections, then offers two cooperations as a peace gesture.',
    nice: true,
    decide: function (c) {
      if (c.round === 0) return 'C';
      // Count opponent defections in their history.
      var defections = 0;
      for (var i = 0; i < c.round; i++) {
        if (c.theirActual[i] === 'D') defections++;
      }
      if (defections === 0) return 'C';
      // Look back to find the most recent defection and count how many
      // consecutive D's we have already played since then.
      // Plan: after the k-th opponent defection, play D for k rounds, then CC.
      // Walk back through my own moves to figure out where we are in the plan.
      // Simpler approach: tally how many D's the opponent has played up to
      // and including round t-1, and ensure we've played (sum of 1..k) D's
      // plus 2k C's in response. Implementation: replay our own plan.

      // Replay the canonical Gradual schedule:
      //   timeline of "punishment owed" increments each time opp defects.
      //   we owe: punishD(k) D's then 2 C's after the k-th defection.
      // Whenever a new opponent D arrives, queue a new (k D's, 2 C's) block.
      // We append to a single queue and consume one slot per round.
      var queue = [];
      var consumed = 0;
      var defCount = 0;
      for (var t = 0; t < c.round; t++) {
        // Process opponent's move from round t.
        if (c.theirActual[t] === 'D') {
          defCount++;
          for (var d = 0; d < defCount; d++) queue.push('D');
          queue.push('C'); queue.push('C');
        }
        // Consume the slot we used this round (whatever we chose then).
        consumed++;
      }
      // Now figure out what slot this current round occupies.
      var slot = consumed; // 0-indexed
      if (slot < queue.length) return queue[slot];
      return 'C';
    }
  });

  // ----------------------------------------------------------
  // Core engine
  // ----------------------------------------------------------

  // Default canonical Prisoner's Dilemma payoffs.
  var DEFAULT_PAYOFFS = { T: 5, R: 3, P: 1, S: 0 };

  // Compute one round's payoff for both players.
  function score(a, b, p) {
    if (a === 'C' && b === 'C') return [p.R, p.R];
    if (a === 'C' && b === 'D') return [p.S, p.T];
    if (a === 'D' && b === 'C') return [p.T, p.S];
    return [p.P, p.P]; // DD
  }

  // Validate PD conditions: T > R > P > S  and  2R > T + S.
  function validatePayoffs(p) {
    var ok = (p.T > p.R) && (p.R > p.P) && (p.P > p.S) && (2 * p.R > p.T + p.S);
    var msg = '';
    if (!(p.T > p.R)) msg = 'Need T > R (defection must tempt against a cooperator).';
    else if (!(p.R > p.P)) msg = 'Need R > P (mutual cooperation must beat mutual defection).';
    else if (!(p.P > p.S)) msg = 'Need P > S (punishment must beat being the sucker).';
    else if (!(2 * p.R > p.T + p.S)) msg = 'Need 2R > T + S (so alternating C/D doesn’t out-score mutual C).';
    return { ok: ok, msg: msg };
  }

  // Play one match between two strategies for N rounds.
  // Returns { aMoves, bMoves, aActual, bActual, aScores, bScores, aTotal, bTotal }.
  function playMatch(stratA, stratB, rounds, payoffs, noise, rng) {
    var aMoves = [], bMoves = [];        // intended
    var aActual = [], bActual = [];      // after noise flip
    var aScores = [], bScores = [];

    var ctxA = {
      round: 0,
      myMoves: aMoves, theirMoves: bMoves,
      myActual: aActual, theirActual: bActual,
      myScores: aScores, theirScores: bScores,
      payoffs: payoffs, rng: rng
    };
    var ctxB = {
      round: 0,
      myMoves: bMoves, theirMoves: aMoves,
      myActual: bActual, theirActual: aActual,
      myScores: bScores, theirScores: aScores,
      payoffs: payoffs, rng: rng
    };

    for (var r = 0; r < rounds; r++) {
      ctxA.round = r; ctxB.round = r;
      var ai = stratA.decide(ctxA);
      var bi = stratB.decide(ctxB);
      if (ai !== 'C' && ai !== 'D') ai = 'C';
      if (bi !== 'C' && bi !== 'D') bi = 'C';
      var aa = (noise > 0 && rng() < noise) ? (ai === 'C' ? 'D' : 'C') : ai;
      var bb = (noise > 0 && rng() < noise) ? (bi === 'C' ? 'D' : 'C') : bi;
      aMoves.push(ai); bMoves.push(bi);
      aActual.push(aa); bActual.push(bb);
      var s = score(aa, bb, payoffs);
      aScores.push(s[0]); bScores.push(s[1]);
    }

    var aTotal = aScores.reduce(function (x, y) { return x + y; }, 0);
    var bTotal = bScores.reduce(function (x, y) { return x + y; }, 0);
    return {
      aMoves: aMoves, bMoves: bMoves,
      aActual: aActual, bActual: bActual,
      aScores: aScores, bScores: bScores,
      aTotal: aTotal, bTotal: bTotal
    };
  }

  // Round-robin: every strategy plays every strategy (including itself).
  // Self-play is one match (counted once); cross-pairs are one match scored
  // from both sides. Total per strategy = sum across all matches.
  function runTournament(rounds, payoffs, noise, seed) {
    var n = STRATEGIES.length;
    var totals = STRATEGIES.map(function () { return 0; });
    var perOpp = STRATEGIES.map(function () {
      return STRATEGIES.map(function () { return null; });
    });

    for (var i = 0; i < n; i++) {
      for (var j = i; j < n; j++) {
        // Distinct seed per pair, derived from the global seed so the whole
        // tournament is reproducible.
        var pairSeed = (seed ^ (i * 73856093) ^ (j * 19349663)) >>> 0;
        var rng = mulberry32(pairSeed);
        var m = playMatch(STRATEGIES[i], STRATEGIES[j], rounds, payoffs, noise, rng);
        totals[i] += m.aTotal;
        perOpp[i][j] = m.aTotal;
        if (i !== j) {
          totals[j] += m.bTotal;
          perOpp[j][i] = m.bTotal;
        }
      }
    }
    return { totals: totals, perOpp: perOpp };
  }

  // ----------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return (window.GT && window.GT.escapeHTML) ? window.GT.escapeHTML(s) : String(s); }

  function findStrategy(id) {
    for (var i = 0; i < STRATEGIES.length; i++) if (STRATEGIES[i].id === id) return STRATEGIES[i];
    return null;
  }
  function strategyIndex(id) {
    for (var i = 0; i < STRATEGIES.length; i++) if (STRATEGIES[i].id === id) return i;
    return -1;
  }

  // Populate a <select> with all strategies; mark `selectedId` if given.
  function fillStrategySelect(el, selectedId) {
    el.innerHTML = STRATEGIES.map(function (s) {
      var mark = (s.id === selectedId) ? ' selected' : '';
      return '<option value="' + s.id + '"' + mark + '>' + esc(s.name) + '</option>';
    }).join('');
  }

  // ----------------------------------------------------------
  // UI: payoff matrix editor & validation
  // ----------------------------------------------------------
  function readPayoffsFromUI() {
    var T = parseFloat($('#pay-T').value);
    var R = parseFloat($('#pay-R').value);
    var P = parseFloat($('#pay-P').value);
    var S = parseFloat($('#pay-S').value);
    if (!isFinite(T)) T = DEFAULT_PAYOFFS.T;
    if (!isFinite(R)) R = DEFAULT_PAYOFFS.R;
    if (!isFinite(P)) P = DEFAULT_PAYOFFS.P;
    if (!isFinite(S)) S = DEFAULT_PAYOFFS.S;
    return { T: T, R: R, P: P, S: S };
  }
  function validateAndShow() {
    var p = readPayoffsFromUI();
    var v = validatePayoffs(p);
    var warn = $('#pay-warning');
    if (v.ok) {
      warn.textContent = '';
      warn.hidden = true;
    } else {
      warn.textContent = v.msg;
      warn.hidden = false;
    }
    return v.ok;
  }
  function readNoise() {
    var n = parseFloat($('#noise').value);
    if (!isFinite(n)) n = 0;
    n = Math.max(0, Math.min(0.5, n));
    $('#noise-readout').textContent = (n * 100).toFixed(0) + '%';
    return n;
  }
  function readSeed() {
    var v = $('#seed').value.trim();
    if (!v) return strSeed('axelrod-1980');
    var asNum = parseInt(v, 10);
    if (isFinite(asNum) && String(asNum) === v) return asNum >>> 0;
    return strSeed(v);
  }

  // ----------------------------------------------------------
  // UI: tournament results
  // ----------------------------------------------------------
  function renderTournament(result, myId, rounds) {
    var n = STRATEGIES.length;
    var myIdx = strategyIndex(myId);

    // Build ranked list.
    var ranked = STRATEGIES.map(function (s, i) {
      return { idx: i, strat: s, total: result.totals[i], vsMine: (myIdx >= 0 ? result.perOpp[i][myIdx] : null) };
    });
    ranked.sort(function (a, b) { return b.total - a.total; });

    var maxTotal = ranked[0].total || 1;
    var mineRow = ranked.find(function (r) { return r.idx === myIdx; });
    var minePoints = mineRow ? mineRow.total : 0;
    var rank = ranked.findIndex(function (r) { return r.idx === myIdx; }) + 1;

    // --- Summary line ---
    var summaryHTML = '';
    if (mineRow) {
      summaryHTML =
        '<p class="result-summary">Your strategy &mdash; <strong>' + esc(mineRow.strat.name) + '</strong> &mdash; finished ' +
        '<span class="rank">No.&nbsp;' + rank + ' of ' + n + '</span> with ' +
        '<strong>' + minePoints + '</strong> points across ' + (n) + ' opponents over ' + rounds + ' rounds each ' +
        '(<span class="muted">mean ' + (minePoints / n).toFixed(1) + ' per match</span>).</p>';
    }
    $('#tournament-summary').innerHTML = summaryHTML;

    // --- Leaderboard table ---
    var rows = ranked.map(function (r, idx) {
      var isMine = r.idx === myIdx;
      var perMatch = (r.total / n).toFixed(1);
      var vsMineCell = (myIdx >= 0 && !isMine)
        ? '<td class="num">' + r.vsMine + '</td>'
        : (isMine ? '<td class="num muted">&mdash;</td>' : '<td class="num muted">&mdash;</td>');
      return '<tr' + (isMine ? ' class="mine"' : '') + '>' +
        '<td class="num">' + (idx + 1) + '</td>' +
        '<td><span class="strat-badge" style="--badge:' + (r.strat.nice ? 'var(--accent-2)' : 'var(--accent)') + '">' + esc(r.strat.short) + '</span> ' + esc(r.strat.name) + (isMine ? ' <span class="you">(you)</span>' : '') + '</td>' +
        '<td class="num strong">' + r.total + '</td>' +
        '<td class="num muted">' + perMatch + '</td>' +
        vsMineCell +
        '</tr>';
    }).join('');
    var headVsMine = (myIdx >= 0)
      ? '<th scope="col" class="num">vs you</th>'
      : '<th scope="col" class="num">&nbsp;</th>';
    $('#tournament-table').innerHTML =
      '<thead><tr>' +
        '<th scope="col" class="num">#</th>' +
        '<th scope="col">Strategy</th>' +
        '<th scope="col" class="num">Total</th>' +
        '<th scope="col" class="num">Per match</th>' +
        headVsMine +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>';

    // --- SVG bar chart ---
    renderBarChart(ranked, maxTotal, myIdx);

    // Show the results region.
    $('#tournament-results').hidden = false;
  }

  function renderBarChart(ranked, maxTotal, myIdx) {
    var n = ranked.length;
    var rowH = 30;
    var pad = { top: 28, right: 56, bottom: 28, left: 116 };
    var w = 760;
    var h = pad.top + pad.bottom + n * rowH;

    // Axis grid: round maxTotal up to a nice number
    var niceMax = niceCeil(maxTotal);
    var axisTicks = 5;
    var tickVals = [];
    for (var t = 0; t <= axisTicks; t++) tickVals.push(Math.round(niceMax * t / axisTicks));

    var innerW = w - pad.left - pad.right;
    var scale = function (v) { return (v / niceMax) * innerW; };

    var svg = '';
    svg += '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Total tournament score by strategy">';
    svg += '<title>Total tournament score by strategy</title>';

    // Vertical gridlines + axis labels
    tickVals.forEach(function (tv) {
      var x = pad.left + scale(tv);
      svg += '<line x1="' + x + '" x2="' + x + '" y1="' + pad.top + '" y2="' + (h - pad.bottom) + '" stroke="#c9b894" stroke-width="0.5" stroke-dasharray="2 3"/>';
      svg += '<text x="' + x + '" y="' + (h - pad.bottom + 16) + '" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#7a6b5d">' + tv + '</text>';
    });
    // X-axis baseline
    svg += '<line x1="' + pad.left + '" x2="' + (w - pad.right) + '" y1="' + (h - pad.bottom) + '" y2="' + (h - pad.bottom) + '" stroke="#1a1410" stroke-width="1"/>';
    // X-axis title
    svg += '<text x="' + (pad.left + innerW / 2) + '" y="' + (h - 6) + '" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" font-size="10" letter-spacing="0.12em" fill="#7a6b5d">TOTAL POINTS</text>';

    // Bars
    ranked.forEach(function (r, i) {
      var y = pad.top + i * rowH + 4;
      var bh = rowH - 10;
      var bw = scale(r.total);
      var isMine = r.idx === myIdx;
      var fill = r.strat.nice ? '#1f3a5f' : '#7a1f1f';
      var labelColor = '#1a1410';

      // Row label (strategy name)
      svg += '<text x="' + (pad.left - 8) + '" y="' + (y + bh / 2 + 4) + '" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="11" fill="' + labelColor + '">' + esc(r.strat.short) + '</text>';

      // Bar with title for accessibility
      svg += '<g>';
      svg += '<title>' + esc(r.strat.name) + ': ' + r.total + ' points</title>';
      svg += '<rect x="' + pad.left + '" y="' + y + '" width="' + Math.max(2, bw) + '" height="' + bh + '" fill="' + fill + '" />';
      // Stripe for "you"
      if (isMine) {
        svg += '<rect x="' + pad.left + '" y="' + y + '" width="' + Math.max(2, bw) + '" height="' + bh + '" fill="url(#youStripe)" />';
        svg += '<rect x="' + pad.left + '" y="' + y + '" width="' + Math.max(2, bw) + '" height="' + bh + '" fill="none" stroke="#1a1410" stroke-width="1.5"/>';
      }
      // Numeric label, just right of bar
      svg += '<text x="' + (pad.left + bw + 6) + '" y="' + (y + bh / 2 + 4) + '" font-family="JetBrains Mono, monospace" font-size="11" fill="#1a1410">' + r.total + (isMine ? '  ◀ you' : '') + '</text>';
      svg += '</g>';
    });

    // Defs (stripe pattern for "you")
    svg += '<defs><pattern id="youStripe" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">' +
           '<rect width="6" height="6" fill="transparent"/>' +
           '<line x1="0" y1="0" x2="0" y2="6" stroke="rgba(244,236,216,0.55)" stroke-width="2"/>' +
           '</pattern></defs>';

    svg += '</svg>';

    $('#tournament-chart').innerHTML = svg;
  }

  function niceCeil(x) {
    if (x <= 0) return 10;
    var pow = Math.pow(10, Math.floor(Math.log10(x)));
    var n = x / pow;
    var nice;
    if (n <= 1) nice = 1;
    else if (n <= 2) nice = 2;
    else if (n <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }

  // ----------------------------------------------------------
  // UI: single-matchup move tape
  // ----------------------------------------------------------
  var matchupState = { match: null, sa: null, sb: null, payoffs: null };

  function renderMatchup(sa, sb, match, payoffs, opts) {
    matchupState = { match: match, sa: sa, sb: sb, payoffs: payoffs };
    var rounds = match.aMoves.length;

    // Cumulative totals to show alongside
    var aRun = 0, bRun = 0;
    var aCoop = 0, bCoop = 0;
    for (var i = 0; i < rounds; i++) {
      aRun += match.aScores[i];
      bRun += match.bScores[i];
      if (match.aActual[i] === 'C') aCoop++;
      if (match.bActual[i] === 'C') bCoop++;
    }

    // --- Header strip ---
    var head =
      '<div class="tape-head">' +
        '<div class="tape-side tape-side-a">' +
          '<span class="eyebrow">Left &mdash; your pick</span>' +
          '<h4>' + esc(sa.name) + '</h4>' +
          '<div class="tape-stat"><span class="big">' + match.aTotal + '</span><span class="muted">pts</span>' +
          ' <span class="muted dot">&middot;</span> <span class="muted">' + aCoop + '/' + rounds + ' C</span></div>' +
        '</div>' +
        '<div class="tape-vs" aria-hidden="true">vs</div>' +
        '<div class="tape-side tape-side-b">' +
          '<span class="eyebrow">Right &mdash; opponent</span>' +
          '<h4>' + esc(sb.name) + '</h4>' +
          '<div class="tape-stat"><span class="big">' + match.bTotal + '</span><span class="muted">pts</span>' +
          ' <span class="muted dot">&middot;</span> <span class="muted">' + bCoop + '/' + rounds + ' C</span></div>' +
        '</div>' +
      '</div>';

    // --- The tape itself: two parallel rows of pills, indexed 1..N ---
    var cellsTop = [];
    var cellsBot = [];
    var indexRow = [];
    var aRunning = 0, bRunning = 0;
    for (var r = 0; r < rounds; r++) {
      aRunning += match.aScores[r];
      bRunning += match.bScores[r];
      var aMove = match.aActual[r];
      var bMove = match.bActual[r];
      var aIntended = match.aMoves[r];
      var bIntended = match.bMoves[r];
      var aFlip = aMove !== aIntended ? ' flipped' : '';
      var bFlip = bMove !== bIntended ? ' flipped' : '';
      var aTip = sa.name + ' — round ' + (r + 1) + ': played ' + aMove + (aFlip ? ' (intended ' + aIntended + ', flipped by noise)' : '') + ', +' + match.aScores[r] + ' (running ' + aRunning + ')';
      var bTip = sb.name + ' — round ' + (r + 1) + ': played ' + bMove + (bFlip ? ' (intended ' + bIntended + ', flipped by noise)' : '') + ', +' + match.bScores[r] + ' (running ' + bRunning + ')';
      cellsTop.push('<div class="tape-cell ' + (aMove === 'C' ? 'c' : 'd') + aFlip + '" title="' + esc(aTip) + '"><span class="m">' + aMove + '</span><span class="p">+' + match.aScores[r] + '</span></div>');
      cellsBot.push('<div class="tape-cell ' + (bMove === 'C' ? 'c' : 'd') + bFlip + '" title="' + esc(bTip) + '"><span class="m">' + bMove + '</span><span class="p">+' + match.bScores[r] + '</span></div>');
      indexRow.push('<div class="tape-idx">' + (r + 1) + '</div>');
    }

    var tape =
      '<div class="tape" role="group" aria-label="Move-by-move history">' +
        '<div class="tape-row tape-row-idx" aria-hidden="true">' + indexRow.join('') + '</div>' +
        '<div class="tape-row tape-row-a" aria-label="' + esc(sa.name) + ' moves">' + cellsTop.join('') + '</div>' +
        '<div class="tape-row tape-row-b" aria-label="' + esc(sb.name) + ' moves">' + cellsBot.join('') + '</div>' +
      '</div>';

    // --- Breakdown footer ---
    var aMutC = 0, bMutC = 0, cdR = 0, dcR = 0, ddR = 0, ccR = 0;
    for (var k = 0; k < rounds; k++) {
      var aa = match.aActual[k], bb = match.bActual[k];
      if (aa === 'C' && bb === 'C') ccR++;
      else if (aa === 'C' && bb === 'D') cdR++;
      else if (aa === 'D' && bb === 'C') dcR++;
      else ddR++;
    }
    var foot =
      '<div class="tape-foot">' +
        '<span><strong>' + ccR + '</strong> CC <span class="muted">(' + (ccR * payoffs.R) + ' / ' + (ccR * payoffs.R) + ')</span></span>' +
        '<span><strong>' + cdR + '</strong> CD <span class="muted">(' + (cdR * payoffs.S) + ' / ' + (cdR * payoffs.T) + ')</span></span>' +
        '<span><strong>' + dcR + '</strong> DC <span class="muted">(' + (dcR * payoffs.T) + ' / ' + (dcR * payoffs.S) + ')</span></span>' +
        '<span><strong>' + ddR + '</strong> DD <span class="muted">(' + (ddR * payoffs.P) + ' / ' + (ddR * payoffs.P) + ')</span></span>' +
      '</div>';

    $('#matchup-out').innerHTML = head + tape + foot;
    $('#matchup-out').hidden = false;

    // Animate, if requested.
    if (opts && opts.animate) {
      var cells = $$('.tape-cell, .tape-idx', $('#matchup-out'));
      cells.forEach(function (c, i) {
        c.style.opacity = '0';
        c.style.transform = 'translateY(4px)';
        setTimeout(function () {
          c.style.transition = 'opacity 180ms ease, transform 180ms ease';
          c.style.opacity = '';
          c.style.transform = '';
        }, Math.min(1500, i * 6));
      });
    }
  }

  // ----------------------------------------------------------
  // Wiring
  // ----------------------------------------------------------
  function init() {
    // Populate strategy selects
    var myStrat = $('#my-strategy');
    var luStrat = $('#lookup-a');
    var lvStrat = $('#lookup-b');
    if (!myStrat) return; // page didn't load us
    fillStrategySelect(myStrat, 'tft');
    fillStrategySelect(luStrat, 'tft');
    fillStrategySelect(lvStrat, 'alld');

    // Describe the picked strategy
    function describe(selectEl, descEl) {
      var s = findStrategy(selectEl.value);
      if (s) descEl.innerHTML = '<span class="strat-badge" style="--badge:' + (s.nice ? 'var(--accent-2)' : 'var(--accent)') + '">' + esc(s.short) + '</span> ' + esc(s.blurb);
    }
    describe(myStrat, $('#my-strategy-desc'));
    myStrat.addEventListener('change', function () { describe(myStrat, $('#my-strategy-desc')); });
    describe(luStrat, $('#lookup-a-desc'));
    luStrat.addEventListener('change', function () { describe(luStrat, $('#lookup-a-desc')); });
    describe(lvStrat, $('#lookup-b-desc'));
    lvStrat.addEventListener('change', function () { describe(lvStrat, $('#lookup-b-desc')); });

    // Advanced disclosure
    var adv = $('#advanced');
    var advBtn = $('#advanced-toggle');
    advBtn.addEventListener('click', function () {
      var open = adv.hasAttribute('hidden') ? false : true;
      if (open) {
        adv.setAttribute('hidden', '');
        advBtn.setAttribute('aria-expanded', 'false');
        advBtn.textContent = 'Advanced controls — show';
      } else {
        adv.removeAttribute('hidden');
        advBtn.setAttribute('aria-expanded', 'true');
        advBtn.textContent = 'Advanced controls — hide';
      }
    });

    // Payoff inputs validate live
    ['#pay-T', '#pay-R', '#pay-P', '#pay-S'].forEach(function (sel) {
      $(sel).addEventListener('input', validateAndShow);
    });
    // Reset payoffs
    $('#pay-reset').addEventListener('click', function (e) {
      e.preventDefault();
      $('#pay-T').value = DEFAULT_PAYOFFS.T;
      $('#pay-R').value = DEFAULT_PAYOFFS.R;
      $('#pay-P').value = DEFAULT_PAYOFFS.P;
      $('#pay-S').value = DEFAULT_PAYOFFS.S;
      validateAndShow();
    });
    // Noise readout
    $('#noise').addEventListener('input', readNoise);
    readNoise();

    // Run tournament
    $('#run-tournament').addEventListener('click', function () {
      if (!validateAndShow()) return;
      var rounds = parseInt($('#rounds').value, 10) || 100;
      var payoffs = readPayoffsFromUI();
      var noise = readNoise();
      var seed = readSeed();
      var result = runTournament(rounds, payoffs, noise, seed);
      renderTournament(result, $('#my-strategy').value, rounds);
      // Scroll into view
      var anchor = $('#tournament-results');
      anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Run matchup
    $('#run-matchup').addEventListener('click', function () {
      if (!validateAndShow()) return;
      var rounds = parseInt($('#matchup-rounds').value, 10) || 100;
      var payoffs = readPayoffsFromUI();
      var noise = readNoise();
      var seed = readSeed();
      var sa = findStrategy($('#lookup-a').value);
      var sb = findStrategy($('#lookup-b').value);
      if (!sa || !sb) return;
      var rng = mulberry32((seed ^ 0xA5A5A5A5) >>> 0);
      var match = playMatch(sa, sb, rounds, payoffs, noise, rng);
      renderMatchup(sa, sb, match, payoffs, { animate: true });
    });

    // Quick-pick chips ("try this matchup")
    $$('.chip[data-a][data-b]').forEach(function (chip) {
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        $('#lookup-a').value = chip.getAttribute('data-a');
        $('#lookup-b').value = chip.getAttribute('data-b');
        describe(luStrat, $('#lookup-a-desc'));
        describe(lvStrat, $('#lookup-b-desc'));
        $('#run-matchup').click();
      });
    });
  }

  // ----------------------------------------------------------
  // Expose
  // ----------------------------------------------------------
  window.GT = window.GT || {};
  window.GT.simulator = {
    registerStrategy: registerStrategy,
    strategies: function () { return STRATEGIES.slice(); },
    playMatch: playMatch,
    runTournament: runTournament,
    mulberry32: mulberry32,
    validatePayoffs: validatePayoffs
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
