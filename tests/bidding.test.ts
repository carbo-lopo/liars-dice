import { describe, it, expect } from "vitest";
import {
  isValidRaise,
  minimumNextQuantity,
  countActualMatches,
  generateCandidateBids,
} from "../src/engine/bidding.js";
import type { BidContext } from "../src/engine/bidding.js";
import type { Face } from "../src/types.js";

const normalCtx = (totalDiceInPlay: number): BidContext => ({
  totalDiceInPlay,
  isPalificoRound: false,
  palificoFace: null,
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
    expect(isValidRaise(null, { quantity: 3, face: 4 }, normalCtx(15)).valid).toBe(true);
    expect(isValidRaise(null, { quantity: 1, face: 1 }, normalCtx(15)).valid).toBe(true);
  });

  it("requires a higher quantity or higher face at the same quantity", () => {
    const prev = { quantity: 3, face: 4 } as const;
    expect(isValidRaise(prev, { quantity: 4, face: 2 }, normalCtx(15)).valid).toBe(true);
    expect(isValidRaise(prev, { quantity: 3, face: 5 }, normalCtx(15)).valid).toBe(true);
    expect(isValidRaise(prev, { quantity: 3, face: 3 }, normalCtx(15)).valid).toBe(false);
    expect(isValidRaise(prev, { quantity: 2, face: 6 }, normalCtx(15)).valid).toBe(false);
  });

  it("enforces the ace transition minimums", () => {
    const prev = { quantity: 5, face: 5 } as const;
    expect(isValidRaise(prev, { quantity: 2, face: 1 }, normalCtx(15)).valid).toBe(false);
    expect(isValidRaise(prev, { quantity: 3, face: 1 }, normalCtx(15)).valid).toBe(true);

    const aces = { quantity: 3, face: 1 } as const;
    expect(isValidRaise(aces, { quantity: 6, face: 6 }, normalCtx(15)).valid).toBe(false);
    expect(isValidRaise(aces, { quantity: 7, face: 6 }, normalCtx(15)).valid).toBe(true);
  });

  it("locks the face and requires strictly increasing quantity during Palifico", () => {
    const ctx: BidContext = { totalDiceInPlay: 9, isPalificoRound: true, palificoFace: 4 };
    expect(isValidRaise({ quantity: 2, face: 4 }, { quantity: 3, face: 4 }, ctx).valid).toBe(true);
    expect(isValidRaise({ quantity: 2, face: 4 }, { quantity: 3, face: 5 }, ctx).valid).toBe(false);
    expect(isValidRaise({ quantity: 2, face: 4 }, { quantity: 2, face: 4 }, ctx).valid).toBe(false);
  });

  it("allows any face for the opening bid of a Palifico round (it becomes the lock)", () => {
    const ctx: BidContext = { totalDiceInPlay: 9, isPalificoRound: true, palificoFace: null };
    expect(isValidRaise(null, { quantity: 1, face: 6 }, ctx).valid).toBe(true);
  });
});

describe("countActualMatches", () => {
  it("counts wild 1s toward non-ace bids when onesWild is true", () => {
    const hands: Face[][] = [[1, 2, 3], [1, 1, 4], [5, 5, 6]];
    expect(countActualMatches(hands, { quantity: 0, face: 5 }, true)).toBe(2 + 3); // three 1s + two 5s
  });

  it("does not treat 1s as wild when onesWild is false (Palifico)", () => {
    const hands: Face[][] = [[1, 2, 3], [1, 1, 4]];
    expect(countActualMatches(hands, { quantity: 0, face: 2 }, false)).toBe(1);
  });

  it("counts aces at face value only when the bid itself is on aces", () => {
    const hands: Face[][] = [[1, 1, 2], [3, 4, 5]];
    expect(countActualMatches(hands, { quantity: 0, face: 1 }, true)).toBe(2);
  });
});

describe("generateCandidateBids", () => {
  it("only offers the locked face during Palifico", () => {
    const ctx: BidContext = { totalDiceInPlay: 9, isPalificoRound: true, palificoFace: 3 };
    const candidates = generateCandidateBids({ quantity: 2, face: 3 }, ctx);
    expect(candidates.every((b) => b.face === 3)).toBe(true);
    expect(candidates.every((b) => b.quantity > 2)).toBe(true);
  });

  it("is sorted with the cheapest raise first", () => {
    const candidates = generateCandidateBids({ quantity: 3, face: 4 }, normalCtx(15));
    for (let i = 1; i < candidates.length; i++) {
      const a = candidates[i - 1]!;
      const b = candidates[i]!;
      expect(a.quantity < b.quantity || (a.quantity === b.quantity && a.face < b.face)).toBe(true);
    }
  });
});
