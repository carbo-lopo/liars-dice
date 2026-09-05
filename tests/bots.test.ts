import { describe, it, expect } from "vitest";
import { decideBotAction } from "../src/bots/botPlayer.js";
import { isValidRaise, generateCandidateBids } from "../src/engine/bidding.js";
import { seededRng } from "../src/engine/dice.js";
import type { Face, PersonalityName, PlayerView } from "../src/types.js";

function makeView(opts: {
  personality: PersonalityName;
  hand: Face[];
  totalDice: number;
  currentBid?: PlayerView["currentBid"];
  isPalificoRound?: boolean;
  palificoFace?: Face | null;
}): PlayerView {
  const { personality, hand, totalDice, currentBid = null, isPalificoRound = false, palificoFace = null } = opts;
  return {
    selfId: "bot",
    self: { id: "bot", name: "Bot", kind: "bot", personality, dice: hand, eliminated: false },
    others: [
      { id: "o1", name: "O1", kind: "bot", diceCount: totalDice - hand.length, eliminated: false },
    ],
    currentPlayerId: "bot",
    currentBid,
    bidHistory: currentBid ? [{ playerId: "o1", bid: currentBid }] : [],
    roundNumber: 1,
    phase: "bidding",
    isPalificoRound,
    palificoFace,
    totalDiceInPlay: totalDice,
    winnerId: null,
    lastResolution: null,
  };
}

const PERSONALITIES: PersonalityName[] = ["cautious", "aggressive", "unpredictable"];

describe("decideBotAction: never produces an illegal action", () => {
  it("opening bids are always legal across personalities and hands", () => {
    const rng = seededRng(123);
    for (const personality of PERSONALITIES) {
      for (let trial = 0; trial < 100; trial++) {
        const hand: Face[] = Array.from({ length: 5 }, () => ((Math.floor(rng() * 6) + 1) as Face));
        const totalDice = 5 + Math.floor(rng() * 10) + 1;
        const view = makeView({ personality, hand, totalDice });
        const action = decideBotAction(view, rng);
        expect(action.type).toBe("bid");
        if (action.type === "bid") {
          const ctx = { totalDiceInPlay: totalDice, isPalificoRound: false, palificoFace: null };
          expect(isValidRaise(null, action.bid, ctx).valid).toBe(true);
        }
      }
    }
  });

  it("response actions (raise or challenge) are always legal, including under Palifico", () => {
    const rng = seededRng(456);
    for (const personality of PERSONALITIES) {
      for (let trial = 0; trial < 150; trial++) {
        const hand: Face[] = Array.from({ length: 3 }, () => ((Math.floor(rng() * 6) + 1) as Face));
        const totalDice = hand.length + Math.floor(rng() * 12) + 1;
        const isPalificoRound = trial % 3 === 0;
        const face = ((Math.floor(rng() * 6) + 1) as Face);
        const currentBid = { quantity: Math.floor(rng() * 4) + 1, face };
        const view = makeView({
          personality,
          hand,
          totalDice,
          currentBid,
          isPalificoRound,
          palificoFace: isPalificoRound ? face : null,
        });
        const ctx = {
          totalDiceInPlay: totalDice,
          isPalificoRound,
          palificoFace: isPalificoRound ? face : null,
        };
        const action = decideBotAction(view, rng);
        if (action.type === "challenge") {
          expect(view.currentBid).not.toBeNull();
        } else {
          expect(isValidRaise(currentBid, action.bid, ctx).valid).toBe(true);
          expect(generateCandidateBids(currentBid, ctx)).toContainEqual(action.bid);
        }
      }
    }
  });
});

describe("decideBotAction: personalities are actually differentiated", () => {
  it("aggressive bots open with higher quantities on average than cautious bots", () => {
    const hand: Face[] = [2, 3, 4, 5, 6];
    const trials = 400;

    const avgFor = (personality: PersonalityName) => {
      const rng = seededRng(999);
      let sum = 0;
      for (let i = 0; i < trials; i++) {
        const view = makeView({ personality, hand, totalDice: 15 });
        const action = decideBotAction(view, rng);
        if (action.type === "bid") sum += action.bid.quantity;
      }
      return sum / trials;
    };

    const cautiousAvg = avgFor("cautious");
    const aggressiveAvg = avgFor("aggressive");
    const unpredictableAvg = avgFor("unpredictable");

    expect(aggressiveAvg).toBeGreaterThan(cautiousAvg);
    // Unpredictable should land somewhere between the two steady archetypes,
    // not off in its own extreme.
    expect(unpredictableAvg).toBeGreaterThan(cautiousAvg * 0.8);
    expect(unpredictableAvg).toBeLessThan(aggressiveAvg * 1.2);
  });
});
