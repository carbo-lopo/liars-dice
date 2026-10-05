import type { BotStrategy } from "../../types/botStrategy.js";
import type { PlayerAction } from "../../types/playerAction.js";
import type { PlayerView } from "../../types/playerView.js";
import { jitter, reasonableBid, wantsToCall, type RiskTolerance } from "../candidates.js";

const TOLERANCE: RiskTolerance = {
  comfortLevel: 0.6,
  bluffFloor: 0.35,
  bluffChance: 0.1,
  bluffBoldness: 1,
  callThreshold: 0.4,
  nerve: 0.05,
};

const JITTER = 0.03;

/** Wants solid odds before bidding, rarely bluffs, and calls as soon as a bid looks shaky. */
export class CautiousBot implements BotStrategy {
  readonly id = "cautious";
  readonly label = "Cautious";

  decide(view: PlayerView): PlayerAction {
    const tolerance = jitter(TOLERANCE, JITTER);
    if (wantsToCall(view, tolerance)) return { type: "call" };
    const bid = reasonableBid(view, tolerance);
    return bid ? { type: "bid", bid } : { type: "call" };
  }
}
