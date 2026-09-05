import type { PersonalityName } from "../types.js";

/**
 * Tunable knobs behind each bot archetype. All thresholds are probabilities
 * (0..1) referring to the bot's own honest estimate of "P(this bid is
 * currently true)", computed by src/engine/probability.ts from the bot's own
 * hand plus the unknown dice still in play.
 *
 * The vocabulary:
 *  - comfortLevel: minimum self-estimated truth-probability the bot wants
 *    before placing a bid "for real" (no bluff).
 *  - bluffFloor: absolute floor -- even a deliberate bluff won't go below
 *    this estimated probability. Keeps bluffs "plausible lies" instead of
 *    insane ones a rational opponent would snap-call.
 *  - bluffChance: probability that, when raising, the bot picks a bolder
 *    candidate than its safe pick instead of the safe pick itself.
 *  - bluffBoldness: how many candidate-bids-out (past the safe pick) a bluff
 *    is allowed to reach for.
 *  - challengeThreshold: if the bot's estimate that the *current* bid is
 *    true falls below this, it starts leaning toward calling liar.
 *  - nerveToBluffThroughSuspicion: even when suspicious (above), this is the
 *    chance the bot swallows its doubt and raises anyway instead of
 *    challenging -- i.e. it plays chicken rather than folding information.
 *  - jitter: random noise (+/-) applied to every threshold above, fresh each
 *    decision. This is what makes a personality feel alive turn to turn
 *    instead of a deterministic formula the player can fully solve.
 */
export interface PersonalityProfile {
  name: PersonalityName;
  comfortLevel: number;
  bluffFloor: number;
  bluffChance: number;
  bluffBoldness: number;
  challengeThreshold: number;
  nerveToBluffThroughSuspicion: number;
  jitter: number;
}

export const PERSONALITIES: Record<PersonalityName, PersonalityProfile> = {
  // Risk-averse. Wants real confidence before bidding, calls liar readily
  // the moment the math looks shaky, rarely bluffs and never bluffs hard.
  cautious: {
    name: "cautious",
    comfortLevel: 0.6,
    bluffFloor: 0.35,
    bluffChance: 0.1,
    bluffBoldness: 1,
    challengeThreshold: 0.4,
    nerveToBluffThroughSuspicion: 0.05,
    jitter: 0.03,
  },
  // Applies pressure. Comfortable raising on thinner odds, bluffs often and
  // is willing to keep raising even when it privately suspects the bid on
  // the table (or its own) is shaky, betting the opponent folds first.
  aggressive: {
    name: "aggressive",
    comfortLevel: 0.45,
    bluffFloor: 0.2,
    bluffChance: 0.45,
    bluffBoldness: 3,
    challengeThreshold: 0.25,
    nerveToBluffThroughSuspicion: 0.35,
    jitter: 0.05,
  },
  // Same baseline as a middle-of-the-road player, but every threshold gets
  // heavy random jitter each decision -- some turns it plays cautious, some
  // turns it plays aggressive, and the player can't easily read which.
  unpredictable: {
    name: "unpredictable",
    comfortLevel: 0.5,
    bluffFloor: 0.2,
    bluffChance: 0.35,
    bluffBoldness: 3,
    challengeThreshold: 0.3,
    nerveToBluffThroughSuspicion: 0.25,
    jitter: 0.15,
  },
};

export function jitterValue(base: number, jitter: number, rng: () => number): number {
  const noise = (rng() * 2 - 1) * jitter;
  return Math.min(1, Math.max(0, base + noise));
}
