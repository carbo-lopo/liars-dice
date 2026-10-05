import type { BotStrategy } from "../../types/botStrategy.js";
import type { PlayerAction } from "../../types/playerAction.js";
import type { PlayerView } from "../../types/playerView.js";
import { jitter, reasonableBid, wantsToCall, type RiskTolerance } from "../candidates.js";

const TOLERANCE: RiskTolerance = {
  comfortLevel: 0.5,
  bluffFloor: 0.2,
  bluffChance: 0.35,
  bluffBoldness: 3,
  callThreshold: 0.3,
  nerve: 0.25,
};

const JITTER = 0.15;

/** Middle-of-the-road thresholds with heavy random variation, so its play is hard to read. */
export class UnpredictableBot implements BotStrategy {
  readonly id = "unpredictable";
  readonly label = "Unpredictable";

  decide(view: PlayerView): PlayerAction {
    const tolerance = jitter(TOLERANCE, JITTER);
    if (wantsToCall(view, tolerance)) return { type: "call" };
    const bid = reasonableBid(view, tolerance);
    return bid ? { type: "bid", bid } : { type: "call" };
  }
}
