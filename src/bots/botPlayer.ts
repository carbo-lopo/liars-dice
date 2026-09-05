import type { Bid, Face, PlayerView } from "../types.js";
import type { Rng } from "../engine/dice.js";
import { generateCandidateBids, type BidContext } from "../engine/bidding.js";
import { probabilityBidIsTrue } from "../engine/probability.js";
import { PERSONALITIES, jitterValue, type PersonalityProfile } from "./personality.js";

export type BotAction = { type: "bid"; bid: Bid } | { type: "challenge" };

interface ScoredCandidate {
  bid: Bid;
  selfEstimatedTruth: number;
}

function ctxFromView(view: PlayerView): BidContext {
  return {
    totalDiceInPlay: view.totalDiceInPlay,
    isPalificoRound: view.isPalificoRound,
    palificoFace: view.palificoFace,
  };
}

function scoreCandidates(view: PlayerView, candidates: Bid[]): ScoredCandidate[] {
  const unknownDiceCount = view.totalDiceInPlay - view.self.dice.length;
  const onesWild = !view.isPalificoRound;
  return candidates.map((bid) => ({
    bid,
    selfEstimatedTruth: probabilityBidIsTrue({
      knownHand: view.self.dice,
      bid,
      unknownDiceCount,
      onesWild,
    }),
  }));
}

/**
 * Picks a "safe" bid (cheapest raise meeting comfortLevel) and, separately,
 * the boldest bid still meeting bluffFloor within bluffBoldness steps past
 * the safe pick. The caller rolls bluffChance to decide which one to use.
 */
function pickSafeAndBoldCandidates(
  scored: ScoredCandidate[],
  profile: PersonalityProfile,
  comfortLevel: number,
  bluffFloor: number,
): { safe: ScoredCandidate | null; bold: ScoredCandidate | null } {
  // scored is expected sorted ascending by "how big a raise" already
  // (generateCandidateBids sorts by quantity then face).
  const safeIndex = scored.findIndex((c) => c.selfEstimatedTruth >= comfortLevel);
  const safe = safeIndex >= 0 ? scored[safeIndex]! : null;

  const viableForBluff = scored.filter((c) => c.selfEstimatedTruth >= bluffFloor);
  if (viableForBluff.length === 0) return { safe, bold: null };

  const startIdx = safeIndex >= 0 ? safeIndex : 0;
  const boldSlice = viableForBluff.filter((c) => {
    const idx = scored.indexOf(c);
    return idx >= startIdx;
  });
  const reach = Math.min(profile.bluffBoldness, Math.max(0, boldSlice.length - 1));
  const bold = boldSlice[reach] ?? boldSlice[boldSlice.length - 1] ?? null;
  return { safe, bold };
}

export function decideBotAction(view: PlayerView, rng: Rng = Math.random): BotAction {
  const personalityName = view.self.personality ?? "cautious";
  const profile = PERSONALITIES[personalityName];
  const ctx = ctxFromView(view);
  const unknownDiceCount = view.totalDiceInPlay - view.self.dice.length;
  const onesWild = !view.isPalificoRound;

  // ---- Opening bid: no current bid to react to. ----
  if (view.currentBid === null) {
    const bid = chooseOpeningBid(view, profile, ctx, rng);
    return { type: "bid", bid };
  }

  const pCurrentTrue = probabilityBidIsTrue({
    knownHand: view.self.dice,
    bid: view.currentBid,
    unknownDiceCount,
    onesWild,
  });

  const challengeThreshold = jitterValue(profile.challengeThreshold, profile.jitter, rng);
  const isSuspicious = pCurrentTrue < challengeThreshold;

  if (isSuspicious) {
    const nerve = jitterValue(profile.nerveToBluffThroughSuspicion, profile.jitter, rng);
    if (rng() >= nerve) {
      return { type: "challenge" };
    }
    // else: swallow the doubt and try to raise through it, below.
  }

  const candidates = generateCandidateBids(view.currentBid, ctx);
  if (candidates.length === 0) {
    // No legal raise exists (bid already at/near the practical ceiling) --
    // forced to call.
    return { type: "challenge" };
  }

  const scored = scoreCandidates(view, candidates);
  const comfortLevel = jitterValue(profile.comfortLevel, profile.jitter, rng);
  const bluffFloor = jitterValue(profile.bluffFloor, profile.jitter, rng);
  const { safe, bold } = pickSafeAndBoldCandidates(scored, profile, comfortLevel, bluffFloor);

  const bluffChance = jitterValue(profile.bluffChance, profile.jitter, rng);
  const wantsToBluff = rng() < bluffChance;

  const chosen = (wantsToBluff && bold ? bold : safe) ?? bold ?? safe;

  if (!chosen) {
    // Nothing on the board is even a plausible bluff -- the honest read is
    // "I don't believe I can raise credibly," which folds into a challenge.
    return { type: "challenge" };
  }

  return { type: "bid", bid: chosen.bid };
}

function chooseOpeningBid(
  view: PlayerView,
  profile: PersonalityProfile,
  ctx: BidContext,
  rng: Rng,
): Bid {
  const hand = view.self.dice;
  const onesWild = !view.isPalificoRound;
  const faces: Face[] = ctx.isPalificoRound ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6];

  const aceCount = hand.filter((d) => d === 1).length;

  let bestFace: Face = 2;
  let bestEffectiveCount = -1;
  for (const face of faces) {
    const raw = hand.filter((d) => d === face).length;
    const effective = face === 1 || !onesWild ? raw : raw + aceCount;
    // Prefer higher effective count; tie-break away from face 1 (more raise
    // headroom later) unless aces are actually where the strength is.
    if (
      effective > bestEffectiveCount ||
      (effective === bestEffectiveCount && bestFace === 1 && face !== 1)
    ) {
      bestEffectiveCount = effective;
      bestFace = face;
    }
  }

  const candidates = generateCandidateBids(null, ctx).filter((b) => b.face === bestFace);
  const scored = scoreCandidates(view, candidates);
  const comfortLevel = jitterValue(profile.comfortLevel, profile.jitter, rng);
  const bluffFloor = jitterValue(profile.bluffFloor, profile.jitter, rng);
  const { safe, bold } = pickSafeAndBoldCandidates(scored, profile, comfortLevel, bluffFloor);

  const bluffChance = jitterValue(profile.bluffChance, profile.jitter, rng);
  const wantsToBluff = rng() < bluffChance;
  const chosen = (wantsToBluff && bold ? bold : safe) ?? bold ?? safe ?? scored[0];

  return chosen!.bid;
}
