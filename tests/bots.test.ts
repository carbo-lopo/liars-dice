import { describe, it, expect } from "vitest";
import { BOT_STRATEGIES } from "../src/bots/roster.js";
import { generateCandidateBids, isValidRaise } from "../src/engine/bidding.js";
import { rollHand } from "../src/engine/dice.js";
import type { Bid } from "../src/types/bid.js";
import type { BotStrategy } from "../src/types/botStrategy.js";
import type { Face } from "../src/types/face.js";
import type { PlayerView } from "../src/types/playerView.js";

function makeView(opts: { hand: Face[]; totalDice: number; currentBid?: Bid | null; isPalifico?: boolean }): PlayerView {
  const { hand, totalDice, currentBid = null, isPalifico = false } = opts;
  const self = { name: "Bot", diceCount: hand.length };
  const other = { name: "Other", diceCount: totalDice - hand.length };
  return {
    self,
    hand,
    turnOrder: [self, other],
    currentBid,
    bidHistory: currentBid ? [{ bidder: other, bid: currentBid }] : [],
    roundNumber: 0,
    isPalifico,
    totalDiceInPlay: totalDice,
  };
}

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

function strategy(id: string): BotStrategy {
  return BOT_STRATEGIES.find((s) => s.id === id)!;
}

describe.each(BOT_STRATEGIES.map((s) => [s.id, s] as const))("%s bot", (_id, bot) => {
  it("always opens with a legal bid", () => {
    for (let trial = 0; trial < 100; trial++) {
      const totalDice = randomInt(6, 15);
      const view = makeView({ hand: rollHand(5), totalDice, isPalifico: trial % 4 === 0 });
      const action = bot.decide(view);
      expect(action.type).toBe("bid");
      if (action.type === "bid") expect(isValidRaise(view, action.bid).valid).toBe(true);
    }
  });

  it("always responds with a legal raise or a call, including under Palifico", () => {
    for (let trial = 0; trial < 150; trial++) {
      const hand = rollHand(3);
      const view = makeView({
        hand,
        totalDice: hand.length + randomInt(1, 12),
        currentBid: { quantity: randomInt(1, 4), face: randomInt(1, 6) as Face },
        isPalifico: trial % 3 === 0,
      });
      const action = bot.decide(view);
      if (action.type === "bid") {
        expect(isValidRaise(view, action.bid).valid).toBe(true);
        expect(generateCandidateBids(view)).toContainEqual(action.bid);
      }
    }
  });
});

describe("bot strategies are differentiated", () => {
  it("aggressive bots open with higher quantities on average than cautious bots", () => {
    const averageOpening = (bot: BotStrategy) => {
      const trials = 2000;
      let sum = 0;
      for (let i = 0; i < trials; i++) {
        const action = bot.decide(makeView({ hand: [2, 3, 4, 5, 6], totalDice: 15 }));
        if (action.type === "bid") sum += action.bid.quantity;
      }
      return sum / trials;
    };

    const cautious = averageOpening(strategy("cautious"));
    const aggressive = averageOpening(strategy("aggressive"));
    const unpredictable = averageOpening(strategy("unpredictable"));

    expect(aggressive).toBeGreaterThan(cautious);
    expect(unpredictable).toBeGreaterThan(cautious * 0.8);
    expect(unpredictable).toBeLessThan(aggressive * 1.2);
  });
});
