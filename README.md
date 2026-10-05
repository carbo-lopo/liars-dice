# Liar's Dice — Game Engine & Bot AI (v0.1)

Singleplayer Liar's Dice: you against bots, played in the terminal.

## Setup

```
npm install
```

## Play

```
npm run play          # you + 2 bots
npm run play -- 5     # 2 to 8 players in total, including you
```

Type `bid <quantity> <face>` (e.g. `bid 4 5`) to raise, or `call` to call
liar on the current bid.

## Test

```
npm test
```

Covers bidding rules (wild-ace transitions, Palifico locking), the
probability estimates, game lifecycle (calls, elimination, Palifico, turn
order, winning), CLI input parsing, bot legality and differentiation, and
full bot-vs-bot games at several table sizes.

## Project layout

```
src/
  types/        Shared types and constants (Bid, PlayerView, BotStrategy, ...)
  models/       Game state: Player, Round (Normal / Palifico), Phase, Game
  events/       GameEvent classes, each able to format itself as narration
  engine/       Rules and logic: GameEngine, bidding, dice, probability
  bots/
    candidates.ts      Shared bot helpers: scoring and choosing bids
    personalities/     One BotStrategy class per bot personality
    roster.ts          The strategies available to the CLI
  cli/          Terminal game: main loop, input parsing, rendering, options
tests/          Vitest suite, including full-game integration tests
```

To add a bot personality, add a class implementing `BotStrategy` under
`src/bots/personalities/` and list it in `src/bots/roster.ts`.
