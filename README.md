# Liar's Dice — Game Engine & Bot AI (v0.1)

Singleplayer Liar's Dice: you vs. two bots. This first milestone is the
**gameflow and bot decision-making**, with no visuals yet — everything is
driven through a text CLI so the rules and the bots can be tuned and felt
before any UI work starts. See `DESIGN.md` for the full writeup of the rules
chosen and how the bots think.

## Setup

```
npm install
```

## Play it (human vs. 2 bots, in your terminal)

```
npm run play
```

Type `bid <quantity> <face>` (e.g. `bid 4 5`) to raise, or `call` to call
liar on the current bid.

## Run the automated tests

```
npm test
```

31 tests cover the bidding rules (including the wild-ace transition math and
Palifico locking), the probability engine, full game lifecycle (challenge
resolution, elimination, Palifico triggering, win condition), and bot
legality/differentiation.

## Run the bot-vs-bot simulation

```
npm run sim            # 500 games by default
npm run sim -- 2000    # or specify a game count
```

Prints win rates, average game length, challenge accuracy, and an
aggression proxy (average bid quantity) per personality — the sanity check
that the bots are competitive and actually play differently from each
other, not just a coin flip with extra steps.

## Project layout

```
src/
  types.ts              Shared types (Bid, Player, GameState, events, ...)
  engine/
    dice.ts              Rolling + a seedable RNG for reproducible tests/sims
    bidding.ts           Bid legality, wild-ace transitions, Palifico locking
    probability.ts       Binomial estimate of "is this bid true?"
    game.ts              GameEngine — the full round/game state machine
  bots/
    personality.ts       Tunable cautious / aggressive / unpredictable profiles
    botPlayer.ts          decideBotAction(): raise, bluff, or call liar
  cli/
    play.ts              Text CLI: human vs. 2 bots
  sim/
    simulate.ts           Bot-vs-bot simulation harness
tests/                   Vitest suite
```

## What's next

Visuals and animation — the engine emits a structured `GameEvent` log
(`bid-placed`, `challenge`, `reveal`, `palifico-declared`, `player-eliminated`,
`game-over`, ...) specifically so a future UI layer can drive
animations/narration straight off of it without re-deriving "what just
happened" from state diffs.
