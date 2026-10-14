import { generateCandidateBids } from "../../engine/bidding.js";
import { probabilityBidIsTrue } from "../../engine/probability.js";
import type { Bid } from "../../types/bid.js";
import type { BotStrategy } from "../../types/botStrategy.js";
import { ALL_FACES, type Face } from "../../types/face.js";
import type { PlayerAction } from "../../types/playerAction.js";
import type { PlayerView } from "../../types/playerView.js";

/** How much risk a bot accepts. Every field except `bluffBoldness` is a probability from 0 to 1. */
export interface RiskTolerance {
  /** Minimum chance a bid is true before the bot makes it honestly. */
  comfortLevel: number;
  /** Minimum chance a bid is true before the bot will make it as a bluff. */
  bluffFloor: number;
  /** Chance the bot bluffs instead of making its safest raise. */
  bluffChance: number;
  /** How many raises past the safest one a bluff may reach. */
  bluffBoldness: number;
  /** The bot considers calling when the current bid's chance of being true is below this. */
  callThreshold: number;
  /** Chance the bot raises anyway when it doubts the current bid. */
  chanceToRaiseInsteadOfCalling: number;
}

interface ScoredBid {
  bid: Bid;
  chanceTrue: number;
}

/** A bot whose decisions are fully determined by a RiskTolerance, randomly nudged each turn. */
export abstract class AbstractMatrixStrategy implements BotStrategy {
  abstract readonly id: string;
  abstract readonly label: string;

  protected abstract readonly tolerance: RiskTolerance;
  /** How far each probability in `tolerance` may be nudged per decision. */
  protected abstract readonly jitterAmount: number;

  decide(view: PlayerView): PlayerAction {
    const tolerance = this.jitter();
    if (this.wantsToCall(view, tolerance)) return { type: "call" };
    const bid = this.reasonableBid(view, tolerance);
    return bid ? { type: "bid", bid } : { type: "call" };
  }

  /** `tolerance` with each probability nudged randomly by up to ±`jitterAmount`. */
  protected jitter(): RiskTolerance {
    const nudge = (value: number) =>
      Math.min(1, Math.max(0, value + (Math.random() * 2 - 1) * this.jitterAmount));
    return {
      comfortLevel: nudge(this.tolerance.comfortLevel),
      bluffFloor: nudge(this.tolerance.bluffFloor),
      bluffChance: nudge(this.tolerance.bluffChance),
      bluffBoldness: this.tolerance.bluffBoldness,
      callThreshold: nudge(this.tolerance.callThreshold),
      chanceToRaiseInsteadOfCalling: nudge(this.tolerance.chanceToRaiseInsteadOfCalling),
    };
  }

  /** Whether the bot doubts the current bid enough to call it. */
  protected wantsToCall(view: PlayerView, tolerance: RiskTolerance): boolean {
    if (view.currentBid === null) return false;
    const doubtful = this.chanceTrue(view, view.currentBid) < tolerance.callThreshold;
    return doubtful && Math.random() >= tolerance.chanceToRaiseInsteadOfCalling;
  }

  /**
   * The bid the bot is willing to make, or null when no raise is believable
   * enough. Always returns a bid when opening a round.
   */
  protected reasonableBid(view: PlayerView, tolerance: RiskTolerance): Bid | null {
    const isOpening = view.currentBid === null;
    const candidates = generateCandidateBids(view);
    const pool = isOpening ? candidates.filter((b) => b.face === this.strongestFace(view)) : candidates;

    const scored = pool.map((bid) => ({ bid, chanceTrue: this.chanceTrue(view, bid) }));
    const { safe, bold } = this.pickSafeAndBold(scored, tolerance);
    const chosen = (Math.random() < tolerance.bluffChance && bold) || safe || bold;
    if (chosen) return chosen.bid;
    return isOpening ? (scored[0]?.bid ?? null) : null;
  }

  private chanceTrue(view: PlayerView, bid: Bid): number {
    return probabilityBidIsTrue({
      hand: view.hand,
      bid,
      unknownDiceCount: view.totalDiceInPlay - view.hand.length,
      isPalifico: view.isPalifico,
    });
  }

  /** The face the hand best supports, counting wild 1s when they apply. Ties go to the lowest non-ace face. */
  private strongestFace(view: PlayerView): Face {
    const countFor = (face: Face) =>
      view.hand.filter((d) => d === face || (!view.isPalifico && face !== 1 && d === 1)).length;
    const best = Math.max(...ALL_FACES.map(countFor));
    return ALL_FACES.find((face) => face !== 1 && countFor(face) === best) ?? 1;
  }

  /**
   * `safe` is the cheapest raise meeting `comfortLevel`. `bold` is up to
   * `bluffBoldness` steps further among raises that still meet `bluffFloor`.
   * Expects `scored` ordered cheapest raise first.
   */
  private pickSafeAndBold(
    scored: ScoredBid[],
    tolerance: RiskTolerance,
  ): { safe: ScoredBid | null; bold: ScoredBid | null } {
    const safeIndex = scored.findIndex((c) => c.chanceTrue >= tolerance.comfortLevel);
    const safe = safeIndex >= 0 ? scored[safeIndex]! : null;
    const bluffable = scored.slice(Math.max(safeIndex, 0)).filter((c) => c.chanceTrue >= tolerance.bluffFloor);
    const bold = bluffable[Math.min(tolerance.bluffBoldness, bluffable.length - 1)] ?? null;
    return { safe, bold };
  }
}
