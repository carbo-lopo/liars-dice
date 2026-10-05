#!/usr/bin/env node
import { GameEngine } from "../engine/gameEngine.js";
import { IllegalActionError } from "../engine/illegalActionError.js";
import type { GameEvent } from "../events/gameEvent.js";
import type { Player } from "../models/player.js";
import type { BotStrategy } from "../types/botStrategy.js";
import type { PlayerAction } from "../types/playerAction.js";
import { buildSeats, parsePlayerCount } from "./options.js";
import { Prompt } from "./input.js";
import { printEvents, printTurnPrompt } from "./render.js";

function apply(engine: GameEngine, action: PlayerAction): GameEvent[] {
  return action.type === "call" ? engine.call() : engine.bid(action.bid);
}

async function humanTurn(engine: GameEngine, human: Player, prompt: Prompt): Promise<GameEvent[]> {
  printTurnPrompt(engine.viewFor(human));
  while (true) {
    try {
      return apply(engine, await prompt.readAction());
    } catch (err) {
      if (!(err instanceof IllegalActionError)) throw err;
      console.log(`Illegal move: ${err.message}`);
    }
  }
}

function botTurn(engine: GameEngine, bot: Player, strategy: BotStrategy): GameEvent[] {
  const view = engine.viewFor(bot);
  try {
    return apply(engine, strategy.decide(view));
  } catch (err) {
    // Bots are tested to only make legal moves; if one slips through, call rather than stall the game.
    if (err instanceof IllegalActionError && view.currentBid) return engine.call();
    throw err;
  }
}

async function main(prompt: Prompt): Promise<void> {
  const engine = GameEngine.start(buildSeats(parsePlayerCount(process.argv.slice(2))));
  const { game } = engine;
  const human = game.players.find((p) => p.isHuman)!;

  console.log("=== Liar's Dice ===");
  console.log(game.players.map((p) => (p.strategy ? `${p.name} (${p.strategy.label})` : p.name)).join(", "));
  printEvents(game.events, human);

  // Bot moves before the human's first turn don't need a pause; there's nothing to have missed yet.
  let humanHasActed = false;
  while (!game.isOver) {
    const player = game.round.currentPlayer;
    if (player.strategy === null) {
      printEvents(await humanTurn(engine, player, prompt), human);
      humanHasActed = true;
    } else {
      printEvents(botTurn(engine, player, player.strategy), human);
      if (humanHasActed && !game.isOver) await prompt.pause();
    }
  }
}

const prompt = new Prompt();
main(prompt)
  .catch((err) => {
    console.error(err instanceof RangeError ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prompt.close());
