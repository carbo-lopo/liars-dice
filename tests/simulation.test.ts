import { describe, it, expect } from "vitest";
import { BOT_STRATEGIES } from "../src/bots/roster.js";
import { GameEngine } from "../src/engine/gameEngine.js";
import type { Game } from "../src/models/game.js";

const MAX_TURNS = 5000;

function playToCompletion(engine: GameEngine, chooseMove: (engine: GameEngine) => void): Game {
  const { game } = engine;
  for (let turn = 0; !game.isOver; turn++) {
    if (turn > MAX_TURNS) throw new Error("Game did not terminate.");
    expect(game.round.currentPlayer.isEliminated()).toBe(false);
    chooseMove(engine);
  }
  return game;
}

describe("full games", () => {
  it("always end with exactly one survivor under scripted play", () => {
    for (let g = 0; g < 25; g++) {
      const engine = GameEngine.start([
        { name: "P1", strategy: null },
        { name: "P2", strategy: null },
        { name: "P3", strategy: null },
      ]);
      const game = playToCompletion(engine, (e) => {
        const { currentBid, totalDice } = e.game.round;
        if (currentBid === null) e.bid({ quantity: 1, face: 2 });
        else if (currentBid.quantity > totalDice) e.call();
        else e.bid({ quantity: currentBid.quantity + 1, face: currentBid.face });
      });
      expect(game.activePlayers).toEqual([game.winner]);
    }
  });

  it("are competitive between every bot strategy, at every supported table size", () => {
    const wins = new Map<string, number>(BOT_STRATEGIES.map((s) => [s.id, 0]));
    const gamesPerSize = 150;

    for (const playerCount of [2, 3, 4, 6]) {
      for (let g = 0; g < gamesPerSize; g++) {
        const seats = Array.from({ length: playerCount }, (_, i) => ({
          name: `Bot ${i}`,
          strategy: BOT_STRATEGIES[(i + g) % BOT_STRATEGIES.length]!,
        }));
        const game = playToCompletion(GameEngine.start(seats), (e) => {
          const player = e.game.round.currentPlayer;
          const action = player.strategy!.decide(e.viewFor(player));
          if (action.type === "call") e.call();
          else e.bid(action.bid);
        });
        const winnerId = game.winner!.strategy!.id;
        wins.set(winnerId, wins.get(winnerId)! + 1);
      }
    }

    const totalGames = 4 * gamesPerSize;
    for (const [, count] of wins) {
      expect(count / totalGames).toBeGreaterThan(0.05);
      expect(count / totalGames).toBeLessThan(0.8);
    }
  });
});
