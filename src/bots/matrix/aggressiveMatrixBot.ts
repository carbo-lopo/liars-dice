import { AbstractMatrixStrategy, type RiskTolerance } from "./matrixStrategy.js";

export class AggressiveMatrixBot extends AbstractMatrixStrategy {
  readonly id = "aggressive";
  readonly label = "Aggressive";

  /** Raises on thin odds, bluffs often, and keeps raising through its own doubts. */
  protected readonly tolerance: RiskTolerance = {
    comfortLevel: 0.45,
    bluffFloor: 0.2,
    bluffChance: 0.45,
    bluffBoldness: 3,
    callThreshold: 0.25,
    chanceToRaiseInsteadOfCalling: 0.35,
  };
  protected readonly jitterAmount = 0.05;
}
