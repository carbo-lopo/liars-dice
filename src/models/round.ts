import { countActualMatches, isValidNormalRaise, isValidPalificoRaise, type BidValidation } from "../engine/bidding.js";
import { IllegalActionError } from "../engine/illegalActionError.js";
import type { Bid } from "../types/bid.js";
import type { BidRecord } from "../types/bidRecord.js";
import type { Face } from "../types/face.js";
import { ChallengeResolution } from "./challengeResolution.js";
import { BiddingPhase, CalledPhase, OpeningPhase, type ActionType, type Phase } from "./phase.js";
import type { Player } from "./player.js";

export abstract class Round {
  abstract readonly isPalifico: boolean;

  private turnIndex = 0;
  private readonly bids: BidRecord[] = [];
  private currentPhase: Phase = new OpeningPhase();
  private result: ChallengeResolution | null = null;

  /**
   * @param index 0-indexed round number.
   * @param players Players still in the game, in turn order, starting with whoever opens.
   */
  constructor(
    readonly index: number,
    readonly players: readonly Player[],
  ) {}

  get phase(): Phase {
    return this.currentPhase;
  }

  get currentPlayer(): Player {
    return this.players[this.turnIndex]!;
  }

  /** Players in the order they act, starting with the current player. */
  get turnOrder(): Player[] {
    return [...this.players.slice(this.turnIndex), ...this.players.slice(0, this.turnIndex)];
  }

  get currentBid(): Bid | null {
    return this.bids.at(-1)?.bid ?? null;
  }

  get bidHistory(): readonly BidRecord[] {
    return this.bids;
  }

  get resolution(): ChallengeResolution | null {
    return this.result;
  }

  get totalDice(): number {
    return this.players.reduce((sum, p) => sum + p.diceCount, 0);
  }

  placeBid(bid: Bid): void {
    this.assertAllowed("bid");
    const validation = this.validateBid(bid);
    if (!validation.valid) throw new IllegalActionError(validation.reason);

    this.bids.push({ bidder: this.currentPlayer, bid: { ...bid } });
    this.currentPhase = new BiddingPhase();
    this.turnIndex = (this.turnIndex + 1) % this.players.length;
  }

  /** The current player calls the last bid; counts the dice and takes a die from the loser. */
  call(): ChallengeResolution {
    this.assertAllowed("call");
    const last = this.bids.at(-1)!;
    const actualCount = countActualMatches(this.players.map((p) => p.dice), last.bid, this.isPalifico);

    const resolution = new ChallengeResolution({
      challenger: this.currentPlayer,
      bidder: last.bidder,
      bid: last.bid,
      actualCount,
      outcome: actualCount >= last.bid.quantity ? "challenger-wrong" : "challenger-right",
      isPalifico: this.isPalifico,
      reveal: this.players.map((player) => ({ player, dice: [...player.dice] })),
    });
    resolution.loser.loseDie();

    this.result = resolution;
    this.currentPhase = new CalledPhase();
    return resolution;
  }

  /** Who opens the next round: this round's loser, or the next player after them if they were eliminated. */
  nextStarter(): Player {
    if (!this.result) throw new Error("The round has not been called yet.");
    const loserIndex = this.players.indexOf(this.result.loser);
    for (let step = 0; step < this.players.length; step++) {
      const player = this.players[(loserIndex + step) % this.players.length]!;
      if (!player.isEliminated()) return player;
    }
    throw new Error("Every player has been eliminated.");
  }

  protected abstract validateBid(bid: Bid): BidValidation;

  private assertAllowed(action: ActionType): void {
    if (!this.currentPhase.allows(action)) {
      throw new IllegalActionError(`Cannot ${action} during the ${this.currentPhase.name} phase.`);
    }
  }
}

/** 1s are wild, and bids may change face. */
export class NormalRound extends Round {
  readonly isPalifico = false;

  protected validateBid(bid: Bid): BidValidation {
    return isValidNormalRaise(this.currentBid, bid, this.totalDice);
  }
}

/** Played when the opening player has one die left: 1s are not wild and the opening bid's face is locked. */
export class PalificoRound extends Round {
  readonly isPalifico = true;

  get lockedFace(): Face | null {
    return this.bidHistory[0]?.bid.face ?? null;
  }

  protected validateBid(bid: Bid): BidValidation {
    return isValidPalificoRaise(this.currentBid, bid, this.totalDice);
  }
}
