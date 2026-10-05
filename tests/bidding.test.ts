import { describe, it, expect } from "vitest";
import {
  isValidRaise,
  minimumNextQuantity,
  countActualMatches,
  generateCandidateBids,
} from "../src/engine/bidding.js";
import type { BiddingRules } from "../src/engine/bidding.js";
import type { Bid } from "../src/types/bid.js";
import type { Face } from "../src/types/face.js";

const normal = (currentBid: Bid | null, totalDiceInPlay = 15): BiddingRules => ({
  currentBid,
  isPalifico: false,
  totalDiceInPlay,
});

const palifico = (currentBid: Bid | null, totalDiceInPlay = 9): BiddingRules => ({
  currentBid,
  isPalifico: true,
  totalDiceInPlay,
});

describe("minimumNextQuantity (wild-ace transitions)", () => {
  it("halves (rounding up) when switching from a non-ace face to aces", () => {
    expect(minimumNextQuantity(4, 5, 1)).toBe(2);
    expect(minimumNextQuantity(5, 5, 1)).toBe(3);
    expect(minimumNextQuantity(1, 6, 1)).toBe(1);
  });

  it("doubles and adds one when switching from aces to a non-ace face", () => {
    expect(minimumNextQuantity(2, 1, 6)).toBe(5);
    expect(minimumNextQuantity(3, 1, 4)).toBe(7);
  });

  it("requires a strict quantity increase within the same regime", () => {
    expect(minimumNextQuantity(3, 4, 5)).toBe(4);
    expect(minimumNextQuantity(3, 1, 1)).toBe(4);
  });
});

describe("isValidRaise", () => {
  it("allows any opening bid", () => {
    expect(isValidRaise(normal(null), { quantity: 3, face: 4 }).valid).toBe(true);
    expect(isValidRaise(normal(null), { quantity: 1, face: 1 }).valid).toBe(true);
  });

  it("requires a higher quantity or higher face at the same quantity", () => {
    const prev = { quantity: 3, face: 4 } as const;
    expect(isValidRaise(normal(prev), { quantity: 4, face: 2 }).valid).toBe(true);
    expect(isValidRaise(normal(prev), { quantity: 3, face: 5 }).valid).toBe(true);
    expect(isValidRaise(normal(prev), { quantity: 3, face: 3 }).valid).toBe(false);
    expect(isValidRaise(normal(prev), { quantity: 2, face: 6 }).valid).toBe(false);
  });

  it("enforces the ace transition minimums", () => {
    const prev = { quantity: 5, face: 5 } as const;
    expect(isValidRaise(normal(prev), { quantity: 2, face: 1 }).valid).toBe(false);
    expect(isValidRaise(normal(prev), { quantity: 3, face: 1 }).valid).toBe(true);

    const aces = { quantity: 3, face: 1 } as const;
    expect(isValidRaise(normal(aces), { quantity: 6, face: 6 }).valid).toBe(false);
    expect(isValidRaise(normal(aces), { quantity: 7, face: 6 }).valid).toBe(true);
  });

  it("locks the face and requires strictly increasing quantity during Palifico", () => {
    const rules = palifico({ quantity: 2, face: 4 });
    expect(isValidRaise(rules, { quantity: 3, face: 4 }).valid).toBe(true);
    expect(isValidRaise(rules, { quantity: 3, face: 5 }).valid).toBe(false);
    expect(isValidRaise(rules, { quantity: 2, face: 4 }).valid).toBe(false);
  });

  it("allows any face for the opening bid of a Palifico round (it becomes the lock)", () => {
    expect(isValidRaise(palifico(null), { quantity: 1, face: 6 }).valid).toBe(true);
  });
});

describe("countActualMatches", () => {
  it("counts wild 1s toward non-ace bids outside Palifico", () => {
    const hands: Face[][] = [[1, 2, 3], [1, 1, 4], [5, 5, 6]];
    expect(countActualMatches(hands, { quantity: 0, face: 5 }, false)).toBe(2 + 3); // three 1s + two 5s
  });

  it("does not treat 1s as wild during Palifico", () => {
    const hands: Face[][] = [[1, 2, 3], [1, 1, 4]];
    expect(countActualMatches(hands, { quantity: 0, face: 2 }, true)).toBe(1);
  });

  it("counts aces at face value only when the bid itself is on aces", () => {
    const hands: Face[][] = [[1, 1, 2], [3, 4, 5]];
    expect(countActualMatches(hands, { quantity: 0, face: 1 }, false)).toBe(2);
  });
});

describe("generateCandidateBids", () => {
  it("only offers the locked face during Palifico", () => {
    const candidates = generateCandidateBids(palifico({ quantity: 2, face: 3 }));
    expect(candidates.every((b) => b.face === 3)).toBe(true);
    expect(candidates.every((b) => b.quantity > 2)).toBe(true);
  });

  it("is sorted with the cheapest raise first", () => {
    const candidates = generateCandidateBids(normal({ quantity: 3, face: 4 }));
    for (let i = 1; i < candidates.length; i++) {
      const a = candidates[i - 1]!;
      const b = candidates[i]!;
      expect(a.quantity < b.quantity || (a.quantity === b.quantity && a.face < b.face)).toBe(true);
    }
  });
});
