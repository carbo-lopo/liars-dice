import { AbstractMatrixStrategy, type RiskTolerance } from "./matrixStrategy.js";

export class CautiousMatrixBot extends AbstractMatrixStrategy {
  readonly id = "cautious";
  readonly label = "Cautious";

  /** Wants solid odds before bidding, rarely bluffs, and calls as soon as a bid looks shaky. */
  protected readonly tolerance: RiskTolerance = {
    comfortLevel: 0.6,
    bluffFloor: 0.35,
    bluffChance: 0.1,
    bluffBoldness: 1,
    callThreshold: 0.4,
    chanceToRaiseInsteadOfCalling: 0.05,
  };
  protected readonly jitterAmount = 0.03;
}
