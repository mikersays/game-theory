# Game Theory & Co.

A comprehensive field guide to strategic decision-making, built as a static site. Five pages covering foundations, equilibria, real-world applications, and an interactive Prisoner's Dilemma tournament simulator you can run in your browser.

## Pages

| # | Page | What it covers |
|---|------|---------------|
| 01 | **Index** | Overview and navigation |
| 02 | **Foundations** | Players, strategies, payoffs, dominant strategies, zero-sum games |
| 03 | **Equilibria** | Nash equilibrium, subgame perfection, folk theorem, repeated games |
| 04 | **Applications** | Arms races, climate negotiations, OPEC, auction design |
| 05 | **Simulator** | Axelrod's iterated Prisoner's Dilemma tournament — configurable strategies, payoffs, noise |

## Running locally

Open `docs/index.html` in a browser. No build step, no dependencies.

## The simulator

The tournament simulator lets you pit classic strategies (Tit-for-Tat, Grim Trigger, Pavlov, Detective, and others) against each other in a round-robin. Configurable payoff matrices, noise levels, and seeded PRNG for reproducibility.

To add your own strategy, open the browser console:

```js
GT.simulator.registerStrategy({
  id: 'mine',
  name: 'My Strategy',
  short: 'MINE',
  blurb: 'Description of what it does',
  decide: function (ctx) {
    return ctx.round === 0 ? 'C' : ctx.theirActual[ctx.round - 1];
  }
});
```

## Game Theory Council (Claude Code skill)

This repo includes a Claude Code skill that convenes a council of five game theory experts to analyze any strategic scenario. Each expert applies a distinct theoretical lens:

| Expert | Lens |
|--------|------|
| **The Strategist** | Classical game theory — Nash equilibria, dominant strategies, backward induction |
| **The Evolutionist** | Repeated games, evolutionary stability, replicator dynamics |
| **The Behavioralist** | Bounded rationality, prospect theory, focal points, cognitive biases |
| **The Mechanist** | Mechanism design, information asymmetries, signaling, contract theory |
| **The Coalitionist** | Coalition formation, Shapley value, bargaining theory, BATNA analysis |

### Usage

In Claude Code, run:

```
/game-theory-council <your scenario>
```

Example:

```
/game-theory-council Two ride-sharing companies are competing in a new city.
One has more capital, the other has better local partnerships. Both must
decide on launch pricing. What happens?
```

The skill spawns all five experts in parallel, synthesizes their debate, and writes a structured prediction to `predictions/`. Prediction files are gitignored so each user's queries stay local.

## Design

Editorial print aesthetic inspired by mid-century RAND reports and Schelling-era strategy literature. Set in Fraunces, Source Serif 4, and JetBrains Mono. See `docs/STYLE.md` for the full design specification.

## License

MIT
