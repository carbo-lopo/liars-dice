import { describe, it, expect } from "vitest";
import { GameEngine } from "../src/engine/gameEngine.js";
import { IllegalActionError } from "../src/engine/illegalActionError.js";
import { PalificoDeclared, RoundStarted } from "../src/events/gameEvent.js";
import { Game } from "../src/models/game.js";
import { Player } from "../src/models/player.js";
import { PalificoRound } from "../src/models/round.js";
import type { Face } from "../src/types/face.js";

function setUp(hands: Record<string, Face[]>) {
  const players = Object.entries(hands).map(([name, dice]) => new Player(name, dice));
  const game = new Game(players);
  return { game, engine: new GameEngine(game), players };
}

describe("Game", () => {
  it("rejects too few players and duplicate names", () => {
    expect(() => new Game([new Player("A", [1])])).toThrow();
    expect(() => new Game([new Player("A", [1]), new Player("A", [2])])).toThrow();
  });

  it("treats a player with no dice as eliminated", () => {
    const { players } = setUp({ A: [1], B: [2] });
    players[0]!.loseDie();
    expect(players[0]!.isEliminated()).toBe(true);
  });

  it("throws if every player has been eliminated", () => {
    const { game, players } = setUp({ A: [1], B: [2] });
    for (const p of players) p.loseDie();
    expect(() => game.winner).toThrow();
  });
});

describe("GameEngine: calling a bid", () => {
  it("costs the challenger a die when the bid was true", () => {
    const { game, engine, players } = setUp({ A: [1, 2, 3, 4, 5], B: [6, 6, 6, 6, 6], C: [2, 2, 2, 2, 2] });
    const [, , c] = players;
    const firstRound = game.round;

    engine.bid({ quantity: 5, face: 6 });
    engine.bid({ quantity: 6, face: 6 });
    expect(game.round.currentPlayer).toBe(c);
    // Five 6s from B plus A's wild 1.
    const events = engine.call();

    expect(firstRound.resolution?.outcome).toBe("challenger-wrong");
    expect(firstRound.resolution?.loser).toBe(c);
    expect(firstRound.resolution?.actualCount).toBe(6);
    expect(c!.diceCount).toBe(4);

    expect(game.round.index).toBe(1);
    expect(game.round.currentPlayer).toBe(c);
    expect(game.round.currentBid).toBeNull();
    expect(game.round.phase.name).toBe("opening");
    expect(events.at(-1)).toBeInstanceOf(RoundStarted);
  });

  it("costs the bidder a die when the bid was false, and ends the game at one survivor", () => {
    const { game, engine, players } = setUp({ A: [2], B: [3] });
    const [a, b] = players;
    const round = game.round;

    engine.bid({ quantity: 2, face: 5 });
    engine.call();

    expect(round.resolution?.outcome).toBe("challenger-right");
    expect(round.resolution?.loser).toBe(a);
    expect(a!.isEliminated()).toBe(true);
    expect(game.isOver).toBe(true);
    expect(game.winner).toBe(b);
    expect(() => engine.bid({ quantity: 1, face: 2 })).toThrow(IllegalActionError);
  });

  it("starts the next round with the player after the loser when the loser is eliminated", () => {
    const { game, engine, players } = setUp({ A: [2], B: [3], C: [4, 4] });
    const [, b, c] = players;

    engine.bid({ quantity: 2, face: 5 });
    engine.call();

    expect(game.isOver).toBe(false);
    expect(game.round.currentPlayer).toBe(b);
    expect(game.round.turnOrder).toEqual([b, c]);
  });

  it("rejects calling before any bid and illegal raises", () => {
    const { engine } = setUp({ A: [1, 2, 3, 4, 5], B: [1, 2, 3, 4, 5] });
    expect(() => engine.call()).toThrow(IllegalActionError);
    engine.bid({ quantity: 3, face: 4 });
    expect(() => engine.bid({ quantity: 3, face: 3 })).toThrow(IllegalActionError);
  });
});

describe("GameEngine: Palifico", () => {
  it("plays a Palifico round when the starter has one die, and locks the opening face", () => {
    const { game, engine, players } = setUp({ A: [3, 3], B: [4, 4], C: [2, 2, 2, 2, 2] });
    const [, b] = players;

    engine.bid({ quantity: 1, face: 4 });
    engine.call(); // B holds two 4s, so B's call is wrong and B drops to one die.

    expect(b!.diceCount).toBe(1);
    expect(game.round).toBeInstanceOf(PalificoRound);
    expect(game.round.currentPlayer).toBe(b);

    const events = engine.bid({ quantity: 1, face: 5 });
    expect(events[0]).toBeInstanceOf(PalificoDeclared);
    expect((game.round as PalificoRound).lockedFace).toBe(5);
    expect(() => engine.bid({ quantity: 2, face: 6 })).toThrow(IllegalActionError);
    expect(() => engine.bid({ quantity: 2, face: 5 })).not.toThrow();
  });
});

describe("GameEngine: player view", () => {
  it("shows the player's own hand, everyone else's dice counts, and the turn order", () => {
    const { game, engine, players } = setUp({ A: [1, 2], B: [3, 4, 5], C: [6] });
    const [, b] = players;
    engine.bid({ quantity: 1, face: 2 });

    const view = engine.viewFor(b!);
    expect(view.hand).toEqual([3, 4, 5]);
    expect(view.turnOrder.map((p) => p.name)).toEqual(["B", "C", "A"]);
    expect(view.turnOrder[1]).toEqual({ name: "C", diceCount: 1 });
    expect(view.bidHistory).toEqual([{ bidder: { name: "A", diceCount: 2 }, bid: { quantity: 1, face: 2 } }]);
    expect(view.totalDiceInPlay).toBe(6);
    expect(game.round.currentPlayer).toBe(b);
  });
});
