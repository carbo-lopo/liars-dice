import type { Bid } from "../types/bid.js";
import type { Face } from "../types/face.js";
import { countActualMatches } from "./bidding.js";

/** Chance that a single unseen die counts toward a bid on `face`. */
export function perDieHitProbability(face: Face, isPalifico: boolean): number {
  const onesAreWild = !isPalifico && face !== 1;
  return onesAreWild ? 2 / 6 : 1 / 6;
}

/**
 * Chance of at least `k` successes out of `n` tries, when each try succeeds
 * with chance `p`. Here: the chance that at least `k` of `n` unseen dice match.
 */
export function binomialAtLeast(n: number, p: number, k: number): number {
  if (k <= 0) return 1;
  if (k > n || p <= 0) return 0;
  if (p >= 1) return 1;

  // Sum the chances of exactly 0..k-1 successes, then take the complement.
  // Each "exactly i" term is computed from the previous one to avoid factorials.
  const q = 1 - p;
  let exactly = Math.pow(q, n);
  let fewerThanK = exactly;
  for (let i = 1; i < k; i++) {
    exactly = (exactly * (n - i + 1) * p) / (i * q);
    fewerThanK += exactly;
  }
  return Math.min(1, Math.max(0, 1 - fewerThanK));
}

interface BidProbabilityInput {
  hand: readonly Face[];
  bid: Bid;
  unknownDiceCount: number;
  isPalifico: boolean;
}

/** Chance that `bid` is true, given one's own hand and how many dice are hidden. */
export function probabilityBidIsTrue({ hand, bid, unknownDiceCount, isPalifico }: BidProbabilityInput): number {
  const stillNeeded = bid.quantity - countActualMatches([hand], bid, isPalifico);
  if (stillNeeded <= 0) return 1;
  return binomialAtLeast(unknownDiceCount, perDieHitProbability(bid.face, isPalifico), stillNeeded);
}
