import type { Bid } from "../types/bid.js";
import { ALL_FACES, type Face } from "../types/face.js";

export interface BiddingRules {
  currentBid: Bid | null;
  isPalifico: boolean;
  totalDiceInPlay: number;
}

export type BidValidation = { valid: true } | { valid: false; reason: string };

const VALID: BidValidation = { valid: true };

function invalid(reason: string): BidValidation {
  return { valid: false, reason };
}

/**
 * Smallest quantity allowed when switching from a bid on `fromFace` to a bid
 * on `toFace`. Aces count as two of any other face, so moving onto aces
 * halves the quantity (rounded up) and moving off aces doubles it plus one.
 */
export function minimumNextQuantity(fromQuantity: number, fromFace: Face, toFace: Face): number {
  const fromIsAce = fromFace === 1;
  const toIsAce = toFace === 1;
  if (!fromIsAce && toIsAce) return Math.ceil(fromQuantity / 2);
  if (fromIsAce && !toIsAce) return fromQuantity * 2 + 1;
  return fromQuantity + 1;
}

/**
 * Bids above the dice in play are legal (and always lose), so this only
 * rejects non-positive quantities and absurd input.
 */
function checkQuantity(next: Bid, totalDiceInPlay: number): BidValidation {
  if (!Number.isInteger(next.quantity) || next.quantity < 1) {
    return invalid("Quantity must be a positive integer.");
  }
  if (next.quantity > totalDiceInPlay * 8) {
    return invalid("Quantity is absurdly high.");
  }
  return VALID;
}

export function isValidNormalRaise(previous: Bid | null, next: Bid, totalDiceInPlay: number): BidValidation {
  const quantityCheck = checkQuantity(next, totalDiceInPlay);
  if (!quantityCheck.valid || previous === null) return quantityCheck;

  if (previous.face === next.face) {
    return next.quantity > previous.quantity ? VALID : invalid("Must raise the quantity or the face.");
  }

  const bothNonAce = previous.face !== 1 && next.face !== 1;
  if (bothNonAce && next.quantity === previous.quantity && next.face > previous.face) {
    return VALID;
  }

  const minQuantity = minimumNextQuantity(previous.quantity, previous.face, next.face);
  if (next.quantity >= minQuantity) return VALID;
  return invalid(`Quantity too low for a switch to face ${next.face} (need at least ${minQuantity}).`);
}

/** In a Palifico round the opening bid's face is locked in and only the quantity may rise. */
export function isValidPalificoRaise(previous: Bid | null, next: Bid, totalDiceInPlay: number): BidValidation {
  const quantityCheck = checkQuantity(next, totalDiceInPlay);
  if (!quantityCheck.valid || previous === null) return quantityCheck;

  if (next.face !== previous.face) {
    return invalid(`Palifico round: all bids must stay on face ${previous.face}.`);
  }
  if (next.quantity <= previous.quantity) {
    return invalid("Palifico round: quantity must strictly increase.");
  }
  return VALID;
}

export function isValidRaise(rules: BiddingRules, next: Bid): BidValidation {
  const validate = rules.isPalifico ? isValidPalificoRaise : isValidNormalRaise;
  return validate(rules.currentBid, next, rules.totalDiceInPlay);
}

/**
 * Every legal next bid with a quantity up to `totalDiceInPlay + slack`,
 * cheapest raise first.
 */
export function generateCandidateBids(rules: BiddingRules, slack = 3): Bid[] {
  const lockedFace = rules.isPalifico ? rules.currentBid?.face : undefined;
  const faces = lockedFace === undefined ? ALL_FACES : [lockedFace];
  const maxQuantity = rules.totalDiceInPlay + slack;

  const candidates: Bid[] = [];
  for (const face of faces) {
    for (let quantity = 1; quantity <= maxQuantity; quantity++) {
      const bid: Bid = { quantity, face };
      if (isValidRaise(rules, bid).valid) candidates.push(bid);
    }
  }
  return candidates.sort((a, b) => a.quantity - b.quantity || a.face - b.face);
}

/** How many dice across `hands` count toward `bid`. Outside Palifico, 1s are wild for non-ace bids. */
export function countActualMatches(hands: readonly (readonly Face[])[], bid: Bid, isPalifico: boolean): number {
  let count = 0;
  for (const hand of hands) {
    for (const die of hand) {
      if (die === bid.face || (!isPalifico && die === 1)) count++;
    }
  }
  return count;
}
