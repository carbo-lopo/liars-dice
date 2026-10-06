import type { Bid } from "../types/bid.js";
import type { ChallengeOutcome } from "../types/challengeOutcome.js";
import type { Face } from "../types/face.js";
import type { Player } from "./player.js";

interface RevealedHand {
  player: Player;
  dice: readonly Face[];
}

export class ChallengeResolution {
  readonly challenger: Player;
  readonly bidder: Player;
  readonly bid: Bid;
  readonly actualCount: number;
  readonly outcome: ChallengeOutcome;
  readonly isPalifico: boolean;
  /** Every hand in the round as it was when the call was made, in turn order. */
  readonly reveal: readonly RevealedHand[];

  constructor(fields: Omit<ChallengeResolution, "loser">) {
    this.challenger = fields.challenger;
    this.bidder = fields.bidder;
    this.bid = fields.bid;
    this.actualCount = fields.actualCount;
    this.outcome = fields.outcome;
    this.isPalifico = fields.isPalifico;
    this.reveal = fields.reveal;
  }

  get loser(): Player {
    return this.outcome === "challenger-right" ? this.bidder : this.challenger;
  }
}
