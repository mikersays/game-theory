# STYLE.md — Game Theory & Co.

A design specification for the *Game Theory & Co.* field guide. Downstream
page-builder agents MUST follow this verbatim so the site reads as one
publication. If anything here is ambiguous, prefer the existing `index.html`
as canonical reference.

---

## 1. Aesthetic direction

**"Editorial Print, Strategy Edition."**
A scholarly publication crossed with the visual language of mid-century
strategic thinking — RAND reports, Schelling lectures, ledger books. Warm
paper background, oxblood ink, single mathematical-blue accent. Heavy use of
typography for hierarchy; ornamental dividers; ruled section heads with
Roman numerals; drop caps; marginalia. Payoff matrices look like they belong
in a 1960s journal.

**The site should never look like a generic Tailwind landing page.** No
neon gradients. No glassmorphism. No giant rounded buttons. No emoji.

---

## 2. Palette (CSS variables — already in `main.css`)

| Token | Hex | Semantic role |
|---|---|---|
| `--bg` | `#f4ecd8` | Aged paper page background |
| `--bg-deep` | `#ece2c8` | Pressed paper / table headers / footer |
| `--surface` | `#fbf6e7` | Cards, payoff matrices, callouts |
| `--ink` | `#1a1410` | Primary text & strong rules |
| `--ink-soft` | `#3b302a` | Secondary text |
| `--muted` | `#7a6b5d` | Captions, labels, metadata |
| `--rule` | `#c9b894` | Hairline rules, borders |
| `--accent` | `#7a1f1f` | Oxblood — links, row payoffs, emphasis |
| `--accent-2` | `#1f3a5f` | Strategic blue — column payoffs, callouts |
| `--highlight` | `#e9d27a` | Marginalia highlighter, selection |

Two accents only. Do not introduce a third color.

---

## 3. Typography

All loaded from Google Fonts in the `<head>`; do not add more families.

| Use | Family | CSS var |
|---|---|---|
| Display headings, italics, ornaments | **Fraunces** (variable, opsz + SOFT) | `--font-display` |
| Body prose | **Source Serif 4** | `--font-body` |
| Code, payoff cells, technical labels | **JetBrains Mono** | `--font-mono` |
| Eyebrows, nav, captions (small caps replacement) | **IBM Plex Sans** | `--font-label` |

Headings are Fraunces italic by default at `h1` (especially the hero), upright
for `h2`–`h5`. `h6` is repurposed as a label and uses IBM Plex Sans, uppercase
0.1em letter-spacing.

**Font sizes:** use the `--fs-*` scale (xs through 5xl). Never hard-code px
sizes. The body is 1.0625rem with 1.65 line-height.

**Paragraphs:** body paragraphs after the first in a section get a 1.25em
text-indent (`p + p`). This is intentional and editorial. The `.lede` class
strips the indent.

---

## 4. Spacing & layout tokens

Spacing: `--s-1` (0.25rem) … `--s-10` (8rem). Always use tokens.

Layout containers:
- `.wrap` — `min(1100px, 100% - 2*--s-5)` — default page-width
- `.wrap-narrow` — `min(720px, ...)` — long-form prose column
- `--measure: 68ch` — max paragraph width, applied automatically

Sections: use `<section class="wrap">`. Section dividers (`section + section`)
get an automatic `1px var(--rule)` top border. Don't add manual hr's.

---

## 5. Component patterns already in `main.css`

Every page-builder agent should use these existing classes before inventing
new CSS. If you must add CSS, append to `main.css` under a new commented
section — never inline styles in HTML except for one-off `style="margin-…"`
nudges.

### Navigation
Page-level masthead lives in `<header class="masthead">` and must contain
`.brand`, `nav.primary`, `.issue-meta`, and `.nav-toggle`. The JS
auto-marks `[aria-current="page"]` based on file name.

### Hero
- `.hero` section with `.hero-grid`
- `.hero-title` (giant Fraunces italic) — wrap a key phrase in `.accent` for
  oxblood, decorative glyph in `.ornament`
- `.hero-rule` is the dotted hairline beneath
- `.hero-meta` for the masthead-style metadata strip

### Section head
```html
<div class="section-head">
  <div>
    <span class="eyebrow">Section label</span>
    <h2>Section title.</h2>
  </div>
  <span class="roman" aria-hidden="true">II.</span>
</div>
```
Use Roman numerals I–VII per page in order.

### Payoff matrix (the signature component)
Two ways to invoke. **Prefer the declarative form** — the JS builder in
`main.js` renders it on load:

```html
<div class="payoff" data-payoff='{
  "title": "Prisoner&apos;s Dilemma",
  "rowLabel":"You","colLabel":"Them",
  "rowStrats":["Cooperate","Defect"],
  "colStrats":["Cooperate","Defect"],
  "cells":[[[3,3],[0,5]],[[5,0],[1,1]]],
  "equilibria":[[1,1]],
  "caption":"Mutual defection is the unique Nash equilibrium."
}'></div>
```

`cells` is `[row][col]` → `[rowPayoff, colPayoff]`. Equilibria are
`[rowIndex, colIndex]` pairs and get a striped NE badge. Set
`"legend": false` to suppress the row/col swatch legend (useful inside
cards). If you need full manual control, write `.payoff-grid` markup by
hand — see `.payoff-grid` rules in `main.css`.

### Cards
- `.game-card` — for game previews (see four homepage cards). Pair with
  `.games-grid`. Always include `.game-num` eyebrow.
- `.app-item` — for application/topic lists, in an `.applications` grid.
  Auto-numbered with `counter-reset: app` and `counter(app, decimal-leading-zero)`.

### Callout / aside
- `.callout` — for boxed key statements; gets a `§` glyph and blue rule
- `.sidenote` — for marginalia / Schelling-style asides, gets a `¶` marker
- `<blockquote>` — for actual quoted text; include `<cite>` tag inside

### Buttons
- `.btn` — default ghost button
- `.btn-primary` — solid ink button; on dark `.sim-cta` it inverts
- Always include `<span class="arrow">&rarr;</span>` for forward action

### Footnotes / drop caps
- Add `.dropcap` to the first paragraph of a chapter
- Use `.sidenote` blocks for footnoted asides

### Ornamental divider
```html
<div class="ornament-divider" aria-hidden="true">&sect; &sect; &sect;</div>
```

### Figures
```html
<figure class="fig">
  <svg>…</svg>
  <figcaption><span class="num">Fig. 3</span> Caption text.</figcaption>
</figure>
```

### Scroll reveal
Add `.reveal` to any block to fade-in on scroll. The JS adds `.in` when it
enters the viewport. Already-visible (hero) content should have both
`reveal in` to render statically.

---

## 6. Voice & tone

Write like a confident editor of a smart magazine — *The Economist* meets
*The New Yorker* meets a graduate seminar. Specifics over generalities. One
named example beats three abstract claims. Use em-dashes — like this — for
asides. Use British-or-American spelling consistently within a page (the
homepage uses American).

**Do:**
- Quote real thinkers (von Neumann, Morgenstern, Nash, Schelling, Axelrod,
  Maynard Smith, Vickrey, Arrow, Schelling, Aumann, Selten, Harsanyi).
- Name historical events (1944 publication, 1980 Axelrod tournament, 1994
  FCC spectrum auction).
- Use italics for first occurrences of technical terms: *utility*,
  *strategy*, *equilibrium*.
- Use short sentences for emphasis. Then longer ones for the texture.

**Don't:**
- Use marketing voice ("Unlock the power of…", "Discover how…").
- Use emoji.
- Fake citations or invent quotes. If you don't have the exact line, paraphrase
  in your own voice.
- Use "We" unless writing as the publication. Prefer the reader-direct "you"
  or the analytic "one".

Hero titles should be six to ten words, italic, with one phrase in
`.accent` color. Section headings end with a period — `.` — like editorial
deck-heads.

---

## 7. Page template

Every new page MUST follow this skeleton. Copy the masthead and footer
markup from `index.html` verbatim. Set `<title>` to `"Page — Game Theory & Co."`
and `<meta name="description">` to a one-sentence summary.

```html
<!doctype html>
<html lang="en">
<head>
  <!-- charset, viewport, title, description, theme-color -->
  <!-- Google Fonts: Fraunces + Source Serif 4 + JetBrains Mono + IBM Plex Sans -->
  <link rel="stylesheet" href="assets/css/main.css" />
  <script defer src="assets/js/main.js"></script>
</head>
<body>
  <header class="masthead">…</header>   <!-- copy from index.html -->
  <main>
    <section class="hero wrap">…</section>
    <section class="wrap">…</section>
    …
  </main>
  <footer class="colophon">…</footer>   <!-- copy from index.html -->
</body>
</html>
```

Hero of subpages can be smaller than home: keep `.hero` with a single
`<h1>` and a `.lede` paragraph — no need for the full meta strip.

---

## 8. Class & id naming conventions

- **Components:** lowercase kebab-case (`.game-card`, `.payoff-grid`)
- **Modifiers:** suffixed (`.btn-primary`, `.p-cell.equilibrium`)
- **State:** `.open`, `.in` (set by JS), `[aria-current="page"]`
- **IDs:** only for anchor targets and aria relationships. Use kebab-case
  matching the slug, e.g. `id="prisoners-dilemma"`.
- **Data attributes:** `data-payoff` for matrix JSON; `data-year` for year
  stamps; reserve `data-gt-*` for any new shared behaviour.

---

## 9. SVG conventions

All diagrams are inline SVG. No external images. Use the palette tokens
directly (e.g. `fill="#7a1f1f"`). Wrap in `<figure class="fig">` with
`<figcaption>`. For schematic dot/line work, mimic the Axelrod round-robin
diagram on the homepage (`viewBox`-sized, mono labels, oxblood + blue nodes
on the ink background).

---

## 10. Accessibility

- All payoff matrices have `role="table"` and `aria-label`.
- Nav has `aria-label="Primary"`.
- `[aria-current="page"]` is added by JS — don't hard-code it.
- Color contrast: body text on `--bg` clears WCAG AA (`--ink` on `--bg`
  ≈ 14:1). Don't drop `--muted` on `--bg` below 14px.
- Decorative glyphs (`§`, Roman numerals, ornaments) get `aria-hidden="true"`.

---

## 11. JavaScript API

`assets/js/main.js` exposes `window.GT`:
- `GT.buildPayoff(el)` — re-render a payoff matrix from `data-payoff`
- `GT.escapeHTML(str)` — for any UI you build (simulator)

Boot is automatic on `DOMContentLoaded`. No frameworks. No build step.
If `simulator.html` needs more JS, add it as `assets/js/simulator.js` and
load with `<script defer>`, but reuse `window.GT` helpers.

---

## 12. What not to do

- Do not add a CSS framework (Tailwind, Bootstrap, etc.).
- Do not change the color palette without updating this file.
- Do not introduce a sans-serif body. The body MUST stay Source Serif 4.
- Do not use rounded corners larger than `--radius` (2px).
- Do not use box-shadows for "lift" effects except the `6px 8px 0 -2px var(--ink)`
  card-hover already defined — it's a deliberate letterpress feel.
- Do not center body prose. Keep `max-width: var(--measure)` and left-align.

When in doubt: open the homepage in a browser, screenshot a section, and
match its rhythm. Restraint is the aesthetic.
