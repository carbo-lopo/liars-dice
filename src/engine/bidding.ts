import type { Bid, Face } from "../types.js";

export interface BidContext {
  /** Total dice still in play across all remaining players. */
  totalDiceInPlay: number;
  isPalificoRound: boolean;
  /** Set once the first bid of a Palifico round has been placed. */
  palificoFace: Face | null;
}

export interface BidValidation {
  valid: boolean;
  reason?: string;
}

/**
 * The minimum legal quantity for a bid on `toFace` that follows a bid of
 * `fromQuantity` on `fromFace`, under standard wild-aces transition rules:
 *  - non-ace -> ace: aces count double, so the equivalent quantity halves
 *    (rounded up, since you must at least match the "value" of the bid you're
 *    replacing).
 *  - ace -> non-ace: the inverse, doubled plus one to force a genuine raise.
 *  - same regime: ordinary "higher quantity, or same quantity higher face"
 *    rule (face-to-face only meaningful within non-ace faces).
 */
export function minimumNextQuantity(
  fromQuantity: number,
  fromFace: Face,
  toFace: Face,
): number {
  const fromIsAce = fromFace === 1;
  const toIsAce = toFace === 1;

  if (!fromIsAce && !toIsAce) {
    // same-regime raise; quantity strictly greater is always sufficient here.
    // (the "same quantity, higher face" case is handled by the caller via
    // compareBids / isValidRaise, since it doesn't require an *increase* in
    // quantity at all.)
    return fromQuantity + 1;
  }
  if (!fromIsAce && toIsAce) {
    return Math.ceil(fromQuantity / 2);
  }
  if (fromIsAce && !toIsAce) {
    return fromQuantity * 2 + 1;
  }
  // ace -> ace
  return fromQuantity + 1;
}

/**
 * Validates `next` as a legal raise over `previous` (or as a legal opening
 * bid, if `previous` is null) given the round context.
 */
export function isValidRaise(
  previous: Bid | null,
  next: Bid,
  ctx: BidContext,
): BidValidation {
  if (!Number.isInteger(next.quantity) || next.quantity < 1) {
    return { valid: false, reason: "Quantity must be a positive integer." };
  }
  if (!ctx.totalDiceInPlay || next.quantity > ctx.totalDiceInPlay * 8) {
    // Generous sanity ceiling only -- true rules don't cap bids at the dice
    // count (an "impossible" bid is legal, just a guaranteed loss), but we
    // still guard against nonsense input from a broken caller/UI.
    return { valid: false, reason: "Quantity is absurdly high." };
  }

  if (ctx.isPalificoRound) {
    if (previous === null) {
      // Opening bid of a Palifico round: any face, it becomes the lock.
      return { valid: true };
    }
    if (ctx.palificoFace !== null && next.face !== ctx.palificoFace) {
      return {
        valid: false,
        reason: `Palifico round: all bids must stay on face ${ctx.palificoFace}.`,
      };
    }
    if (next.quantity <= previous.quantity) {
      return {
        valid: false,
        reason: "Palifico round: quantity must strictly increase.",
      };
    }
    return { valid: true };
  }

  if (previous === null) {
    return { valid: true };
  }

  if (previous.face === next.face) {
    if (next.quantity > previous.quantity) return { valid: true };
    return { valid: false, reason: "Must raise the quantity or the face." };
  }

  const minQty = minimumNextQuantity(previous.quantity, previous.face, next.face);

  // Same-regime "same quantity, higher face" shortcut (non-ace faces only).
  if (
    previous.face !== 1 &&
    next.face !== 1 &&
    next.quantity === previous.quantity &&
    next.face > previous.face
  ) {
    return { valid: true };
  }

  if (next.quantity >= minQty) return { valid: true };

  return {
    valid: false,
    reason: `Quantity too low for a switch to face ${next.face} (need at least ${minQty}).`,
  };
}

/**
 * Enumerates the legal next bids worth considering. Bounded to
 * `totalDiceInPlay + slack` per face so bots aren't reasoning over
 * astronomically improbable quantities -- a rational agent would never want
 * to bid, say, double the dice on the table, so there's no need to generate
 * (let alone evaluate) those candidates.
 */
export function generateCandidateBids(
  previous: Bid | null,
  ctx: BidContext,
  slack = 3,
): Bid[] {
  const faces: Face[] = ctx.isPalificoRound && ctx.palificoFace !== null
    ? [ctx.palificoFace]
    : [1, 2, 3, 4, 5, 6];
  const maxQty = ctx.totalDiceInPlay + slack;

  const candidates: Bid[] = [];
  for (const face of faces) {
    for (let qty = 1; qty <= maxQty; qty++) {
      const bid: Bid = { quantity: qty, face };
      if (isValidRaise(previous, bid, ctx).valid) candidates.push(bid);
    }
  }
  // Sort by "cheapest raise first" so callers that want the minimal escalation
  // can just take candidates[0].
  candidates.sort((a, b) => a.quantity - b.quantity || a.face - b.face);
  return candidates;
}

/** Counts how many dice across `hands` actually satisfy `bid`. */
export function countActualMatches(
  hands: Face[][],
  bid: Bid,
  onesWild: boolean,
): number {
  let count = 0;
  for (const hand of hands) {
    for (const die of hand) {
      if (die === bid.face) count++;
      else if (onesWild && die === 1 && bid.face !== 1) count++;
    }
  }
  return count;
}
