# Liar's Dice — Game Engine & Bot AI (v0.1)

Singleplayer Liar's Dice: you against bots, in the terminal or the browser.

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

## Play in the browser

The latest version of `main` is published at https://carbo-lopo.github.io/liars-dice/.

To run it locally:

```
cd web
npm ci
npm run dev           # then open the local address it prints
```

`npm run build` (inside `web/`) produces a static site in `web/dist/`.

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
  rules/        Pure rule logic: bid legality, dice matching, probability, IllegalActionError
  engine/       GameEngine (applies moves to a Game) and dice rolling
  bots/
    matrix/            Bots driven by a fixed RiskTolerance ("matrix" bots):
                         AbstractMatrixStrategy (shared logic) and one class per personality
    roster.ts          The strategies available to the CLI
  cli/          Terminal game: main loop, input parsing, rendering, options
web/            Browser game (React + Vite); imports the engine from src/ via @engine
tools/          process-sounds.sh, which prepares the browser game's sound files
tests/          Vitest suite, including full-game integration tests
```

To add a matrix bot, extend `AbstractMatrixStrategy` with new tolerance
values. A different style of bot can implement `BotStrategy` directly. Either
way, list it in `src/bots/roster.ts`.

## Credits

The browser version's music and sound effects, with their licences, are listed in [CREDITS.md](CREDITS.md).
