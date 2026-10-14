import type { BotStrategy } from "../../types/botStrategy.js";
import type { PlayerAction } from "../../types/playerAction.js";
import type { PlayerView } from "../../types/playerView.js";
import { jitter, reasonableBid, wantsToCall, type RiskTolerance } from "./matrixTactics.js";

/** A bot whose decisions are fully determined by a RiskTolerance, randomly nudged each turn. */
export abstract class AbstractMatrixStrategy implements BotStrategy {
  abstract readonly id: string;
  abstract readonly label: string;

  protected abstract readonly tolerance: RiskTolerance;
  /** How far each probability in `tolerance` may be nudged per decision. */
  protected abstract readonly jitterAmount: number;

  decide(view: PlayerView): PlayerAction {
    const tolerance = jitter(this.tolerance, this.jitterAmount);
    if (wantsToCall(view, tolerance)) return { type: "call" };
    const bid = reasonableBid(view, tolerance);
    return bid ? { type: "bid", bid } : { type: "call" };
  }
}
