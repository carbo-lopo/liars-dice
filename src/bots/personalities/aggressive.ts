import type { BotStrategy } from "../../types/botStrategy.js";
import type { PlayerAction } from "../../types/playerAction.js";
import type { PlayerView } from "../../types/playerView.js";
import { jitter, reasonableBid, wantsToCall, type RiskTolerance } from "../candidates.js";

const TOLERANCE: RiskTolerance = {
  comfortLevel: 0.45,
  bluffFloor: 0.2,
  bluffChance: 0.45,
  bluffBoldness: 3,
  callThreshold: 0.25,
  chanceToRaiseInsteadOfCalling: 0.35,
};

const JITTER = 0.05;

/** Raises on thin odds, bluffs often, and keeps raising through its own doubts. */
export class AggressiveBot implements BotStrategy {
  readonly id = "aggressive";
  readonly label = "Aggressive";

  decide(view: PlayerView): PlayerAction {
    const tolerance = jitter(TOLERANCE, JITTER);
    if (wantsToCall(view, tolerance)) return { type: "call" };
    const bid = reasonableBid(view, tolerance);
    return bid ? { type: "bid", bid } : { type: "call" };
  }
}
