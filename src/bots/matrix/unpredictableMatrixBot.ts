import { AbstractMatrixStrategy, type RiskTolerance } from "./matrixStrategy.js";

export class UnpredictableMatrixBot extends AbstractMatrixStrategy {
  readonly id = "unpredictable";
  readonly label = "Unpredictable";

  /** Middle-of-the-road thresholds; the large jitterAmount makes its play hard to read. */
  protected readonly tolerance: RiskTolerance = {
    comfortLevel: 0.5,
    bluffFloor: 0.2,
    bluffChance: 0.35,
    bluffBoldness: 3,
    callThreshold: 0.3,
    chanceToRaiseInsteadOfCalling: 0.25,
  };
  protected readonly jitterAmount = 0.15;
}
