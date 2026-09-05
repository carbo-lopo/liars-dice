import { describe, it, expect } from "vitest";
import { GameEngine, IllegalActionError } from "../src/engine/game.js";
import { seededRng } from "../src/engine/dice.js";

describe("GameEngine: challenge resolution", () => {
  it("makes the challenger lose a die when the bid was actually true", () => {
    const engine = new GameEngine([
      { id: "a", name: "A", kind: "bot", forcedHand: [1, 2, 3, 4, 5] },
      { id: "b", name: "B", kind: "bot", forcedHand: [6, 6, 6, 6, 6] },
      { id: "c", name: "C", kind: "bot", forcedHand: [2, 2, 2, 2, 2] },
    ]);

    expect(engine.isPlayersTurn("a")).toBe(true);
    engine.placeBid("a", { quantity: 5, face: 6 });
    expect(engine.isPlayersTurn("b")).toBe(true);
    engine.placeBid("b", { quantity: 6, face: 6 });
    expect(engine.isPlayersTurn("c")).toBe(true);

    // Actual 6s: b has five, plus a's single wild ace = 6 total, so the
    // quantity-6 bid on 6s is true. Challenging it should cost c a die.
    engine.challenge("c");

    const snap = engine.getPublicSnapshot();
    const c = snap.players.find((p) => p.id === "c")!;
    expect(c.dice.length).toBe(4);
    expect(snap.lastResolution?.outcome).toBe("bidder-right");
    expect(snap.lastResolution?.loserId).toBe("c");
    expect(snap.lastResolution?.actualCount).toBe(6);
    expect(snap.currentPlayerIndex).toBe(snap.players.findIndex((p) => p.id === "c"));
    expect(snap.roundNumber).toBe(2);
    expect(snap.currentBid).toBeNull();
    expect(snap.phase).toBe("bidding");

    const eventTypes = engine.getEventLog().map((e) => e.type);
    expect(eventTypes).toContain("challenge");
    expect(eventTypes).toContain("reveal");
    expect(eventTypes.filter((t) => t === "round-started")).toHaveLength(2);
  });

  it("makes the bidder lose a die when the bid was false", () => {
    const engine = new GameEngine([
      { id: "a", name: "A", kind: "bot", forcedHand: [2] },
      { id: "b", name: "B", kind: "bot", forcedHand: [3] },
    ]);

    engine.placeBid("a", { quantity: 2, face: 5 }); // impossible: no 5s, no aces at all
    engine.challenge("b");

    const snap = engine.getPublicSnapshot();
    expect(snap.lastResolution?.outcome).toBe("bidder-wrong");
    expect(snap.lastResolution?.loserId).toBe("a");
    const a = snap.players.find((p) => p.id === "a")!;
    expect(a.dice.length).toBe(0);
    expect(a.eliminated).toBe(true);
    expect(snap.phase).toBe("game-over");
    expect(snap.winnerId).toBe("b");
  });

  it("rejects actions taken out of turn or before any bid exists", () => {
    const engine = new GameEngine([
      { id: "a", name: "A", kind: "bot", forcedHand: [1, 2, 3, 4, 5] },
      { id: "b", name: "B", kind: "bot", forcedHand: [1, 2, 3, 4, 5] },
    ]);

    expect(() => engine.placeBid("b", { quantity: 1, face: 2 })).toThrow(IllegalActionError);
    expect(() => engine.challenge("a")).toThrow(IllegalActionError);
  });
});

describe("GameEngine: Palifico lifecycle", () => {
  it("triggers Palifico when a round's starter has exactly one die, and locks the face", () => {
    const engine = new GameEngine([
      { id: "a", name: "A", kind: "bot", forcedHand: [3, 3] },
      { id: "b", name: "B", kind: "bot", forcedHand: [4, 4] },
      { id: "c", name: "C", kind: "bot", forcedHand: [2, 2, 2, 2, 2] },
    ]);

    engine.placeBid("a", { quantity: 1, face: 4 });
    // b challenges a's bid; actual 4-count is 2 (b's own dice), bid was true,
    // so challenger b loses a die and drops from 2 -> 1.
    engine.challenge("b");

    let snap = engine.getPublicSnapshot();
    expect(snap.lastResolution?.loserId).toBe("b");
    expect(snap.players.find((p) => p.id === "b")!.dice.length).toBe(1);
    expect(snap.isPalificoRound).toBe(true);
    expect(snap.currentPlayerIndex).toBe(snap.players.findIndex((p) => p.id === "b"));

    engine.placeBid("b", { quantity: 1, face: 5 });
    snap = engine.getPublicSnapshot();
    expect(snap.palificoFace).toBe(5);

    expect(() => engine.placeBid("c", { quantity: 2, face: 6 })).toThrow(IllegalActionError);
    expect(() => engine.placeBid("c", { quantity: 2, face: 5 })).not.toThrow();
  });
});

describe("GameEngine: sanity across many randomized games", () => {
  it("always terminates with exactly one winner and never lets an eliminated player act", () => {
    for (let seed = 0; seed < 25; seed++) {
      const rng = seededRng(seed * 7919 + 1);
      const engine = new GameEngine(
        [
          { id: "p1", name: "P1", kind: "bot", personality: "cautious" },
          { id: "p2", name: "P2", kind: "bot", personality: "aggressive" },
          { id: "p3", name: "P3", kind: "bot", personality: "unpredictable" },
        ],
        rng,
      );

      let guard = 0;
      while (engine.getPublicSnapshot().phase !== "game-over") {
        guard++;
        if (guard > 5000) throw new Error("Game did not terminate -- possible infinite loop.");

        const snap = engine.getPublicSnapshot();
        const current = snap.players[snap.currentPlayerIndex]!;
        expect(current.eliminated).toBe(false);

        // Simple scripted behavior sufficient for a termination/invariant
        // check: always challenge once the bid is already implausible given
        // total dice, otherwise make the cheapest legal raise.
        if (snap.currentBid && snap.currentBid.quantity > snap.players.reduce((s, p) => s + p.dice.length, 0)) {
          engine.challenge(current.id);
          continue;
        }
        if (snap.currentBid === null) {
          engine.placeBid(current.id, { quantity: 1, face: 2 });
        } else {
          const face = snap.currentBid.face;
          engine.placeBid(current.id, { quantity: snap.currentBid.quantity + 1, face });
        }
      }

      const finalSnap = engine.getPublicSnapshot();
      const survivors = finalSnap.players.filter((p) => !p.eliminated);
      expect(survivors).toHaveLength(1);
      expect(finalSnap.winnerId).toBe(survivors[0]!.id);
    }
  });
});
