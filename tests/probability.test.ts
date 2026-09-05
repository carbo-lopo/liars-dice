import { describe, it, expect } from "vitest";
import {
  perDieHitProbability,
  binomialAtLeast,
  probabilityBidIsTrue,
} from "../src/engine/probability.js";

describe("perDieHitProbability", () => {
  it("is 2/6 for a non-ace face when 1s are wild", () => {
    expect(perDieHitProbability(4, true)).toBeCloseTo(2 / 6);
  });
  it("is 1/6 for an ace bid even when wild (wildness doesn't double-count itself)", () => {
    expect(perDieHitProbability(1, true)).toBeCloseTo(1 / 6);
  });
  it("is 1/6 for any face during Palifico (no wilds)", () => {
    expect(perDieHitProbability(4, false)).toBeCloseTo(1 / 6);
    expect(perDieHitProbability(1, false)).toBeCloseTo(1 / 6);
  });
});

describe("binomialAtLeast", () => {
  it("returns 1 for k<=0 and 0 for k>n", () => {
    expect(binomialAtLeast(5, 0.3, 0)).toBe(1);
    expect(binomialAtLeast(5, 0.3, 6)).toBe(0);
  });

  it("matches known small-case binomial values", () => {
    expect(binomialAtLeast(1, 0.5, 1)).toBeCloseTo(0.5, 10);
    expect(binomialAtLeast(2, 0.5, 1)).toBeCloseTo(0.75, 10);
    expect(binomialAtLeast(2, 0.5, 2)).toBeCloseTo(0.25, 10);
    // P(X>=1) for n=6,p=1/6 (classic "at least one 6 in 6 rolls")
    expect(binomialAtLeast(6, 1 / 6, 1)).toBeCloseTo(1 - Math.pow(5 / 6, 6), 10);
  });

  it("stays within [0,1] and is non-increasing in k", () => {
    const n = 20;
    const p = 0.33;
    let prev = 1;
    for (let k = 0; k <= n + 2; k++) {
      const v = binomialAtLeast(n, p, k);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });
});

describe("probabilityBidIsTrue", () => {
  it("returns 1 when the player's own hand already satisfies the bid", () => {
    const p = probabilityBidIsTrue({
      knownHand: [4, 4, 4],
      bid: { quantity: 2, face: 4 },
      unknownDiceCount: 5,
      onesWild: true,
    });
    expect(p).toBe(1);
  });

  it("returns 0 when there aren't enough unknown dice to possibly satisfy it", () => {
    const p = probabilityBidIsTrue({
      knownHand: [2, 3],
      bid: { quantity: 5, face: 4 },
      unknownDiceCount: 3,
      onesWild: true,
    });
    expect(p).toBe(0);
  });

  it("is monotonically non-increasing as the bid quantity rises", () => {
    let prev = 1;
    for (let q = 1; q <= 10; q++) {
      const p = probabilityBidIsTrue({
        knownHand: [2, 5],
        bid: { quantity: q, face: 5 },
        unknownDiceCount: 8,
        onesWild: true,
      });
      expect(p).toBeLessThanOrEqual(prev + 1e-9);
      prev = p;
    }
  });

  it("credits wild 1s in the known hand toward a non-ace bid", () => {
    const withAce = probabilityBidIsTrue({
      knownHand: [1, 2],
      bid: { quantity: 2, face: 6 },
      unknownDiceCount: 4,
      onesWild: true,
    });
    const withoutAce = probabilityBidIsTrue({
      knownHand: [2, 2],
      bid: { quantity: 2, face: 6 },
      unknownDiceCount: 4,
      onesWild: true,
    });
    expect(withAce).toBeGreaterThan(withoutAce);
  });
});
