import type { Bid, Face } from "../types.js";

/**
 * Probability that a single *unknown* die counts toward a bid on `face`,
 * given whether 1s are wild this round.
 *  - Palifico (no wilds): any face, including 1 itself, is a 1-in-6 shot.
 *  - Normal rounds, bidding on a non-ace face: the die counts if it shows
 *    that face OR a wild 1 -> 2-in-6.
 *  - Normal rounds, bidding on aces: wildness doesn't apply to the ace bid
 *    itself (a 1 either is or isn't rolled) -> 1-in-6.
 */
export function perDieHitProbability(face: Face, onesWild: boolean): number {
  if (!onesWild) return 1 / 6;
  if (face === 1) return 1 / 6;
  return 2 / 6;
}

/** P(X >= k) for X ~ Binomial(n, p). Computed via a stable forward recurrence
 * over the pmf rather than raw factorials, so it stays accurate for the
 * dice counts this game ever sees (well under n=90). */
export function binomialAtLeast(n: number, p: number, k: number): number {
  if (k <= 0) return 1;
  if (k > n) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  const q = 1 - p;
  let pmf = Math.pow(q, n); // P(X = 0)
  let cumulativeBelow = pmf; // sum_{i=0}^{0} pmf(i)

  for (let i = 1; i < k; i++) {
    pmf = (pmf * (n - i + 1) * p) / (i * q);
    cumulativeBelow += pmf;
  }
  const result = 1 - cumulativeBelow;
  // Guard against floating point drift landing just outside [0,1].
  return Math.min(1, Math.max(0, result));
}

export interface BidProbabilityInput {
  /** The dice this player can actually see (their own hand). */
  knownHand: Face[];
  bid: Bid;
  /** Count of dice held by every other player still in the round. */
  unknownDiceCount: number;
  onesWild: boolean;
}

/**
 * Estimates P(bid is currently true), i.e. the probability a challenge
 * against `bid` would fail (bidder was right). Assumes unknown dice are
 * i.i.d. uniform, which is exactly true at the start of a round and is the
 * standard simplifying assumption bots use (no card-counting across
 * rounds -- hands are re-rolled every round anyway).
 */
export function probabilityBidIsTrue(input: BidProbabilityInput): number {
  const { knownHand, bid, unknownDiceCount, onesWild } = input;

  let ownMatches = 0;
  for (const die of knownHand) {
    if (die === bid.face) ownMatches++;
    else if (onesWild && die === 1 && bid.face !== 1) ownMatches++;
  }

  const stillNeeded = bid.quantity - ownMatches;
  if (stillNeeded <= 0) return 1;
  if (unknownDiceCount <= 0) return 0;

  const p = perDieHitProbability(bid.face, onesWild);
  return binomialAtLeast(unknownDiceCount, p, stillNeeded);
}
