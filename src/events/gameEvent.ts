import type { ChallengeResolution } from "../models/challengeResolution.js";
import type { Player } from "../models/player.js";
import type { Bid } from "../types/bid.js";
import type { Face } from "../types/face.js";

/** Present-tense verb agreeing with the player: "You bid" for the human, "Cora bids" for a bot. */
function conjugate(player: Player, action: string): string {
  return player.isHuman ? action : `${action}s`;
}

function formatBid(bid: Bid): string {
  return `${bid.quantity} x [${bid.face}]`;
}

export function formatHand(dice: readonly Face[]): string {
  return `[${dice.join("] [")}]`;
}

export abstract class GameEvent {
  /** One line of narration describing the event. */
  abstract format(): string;
}

export class GameStarted extends GameEvent {
  constructor(readonly seating: readonly Player[]) {
    super();
  }

  format(): string {
    return `Seating order: ${this.seating.map((p) => p.name).join(" -> ")}`;
  }
}

export class RoundStarted extends GameEvent {
  readonly diceCounts: readonly { name: string; diceCount: number }[];

  constructor(
    readonly roundIndex: number,
    turnOrder: readonly Player[],
  ) {
    super();
    this.diceCounts = turnOrder.map((p) => ({ name: p.name, diceCount: p.diceCount }));
  }

  format(): string {
    const counts = this.diceCounts.map((c) => `${c.name}: ${c.diceCount}`).join("  |  ");
    return `\n----- Round ${this.roundIndex + 1} -----\n(${counts})`;
  }
}

export class PalificoDeclared extends GameEvent {
  constructor(
    readonly player: Player,
    readonly face: Face,
  ) {
    super();
  }

  format(): string {
    return `\n*** PALIFICO *** ${this.player.name} ${this.player.isHuman ? "are" : "is"} down to one die -- no wild 1s this round, and every bid must stay on face [${this.face}].`;
  }
}

export class BidPlaced extends GameEvent {
  constructor(
    readonly bidder: Player,
    readonly bid: Bid,
  ) {
    super();
  }

  format(): string {
    return `${this.bidder.name} ${conjugate(this.bidder, "bid")}: ${formatBid(this.bid)}`;
  }
}

export class LiarCalled extends GameEvent {
  constructor(
    readonly challenger: Player,
    readonly bidder: Player,
    readonly bid: Bid,
  ) {
    super();
  }

  format(): string {
    return `\n${this.challenger.name} ${conjugate(this.challenger, "call")} LIAR on ${this.bidder.name}'s bid of ${formatBid(this.bid)}!`;
  }
}

export class DiceRevealed extends GameEvent {
  constructor(readonly resolution: ChallengeResolution) {
    super();
  }

  format(): string {
    const { reveal, outcome, actualCount, loser } = this.resolution;
    const hands = reveal.map((h) => `   ${h.player.name}: ${formatHand(h.dice)}`).join("\n");
    const truth = outcome === "challenger-wrong" ? "TRUE" : "FALSE";
    return `All dice revealed:\n${hands}\nThe bid was ${truth} (actual count: ${actualCount}). ${loser.name} ${conjugate(loser, "lose")} a die.`;
  }
}

export class PlayerEliminated extends GameEvent {
  constructor(readonly player: Player) {
    super();
  }

  format(): string {
    return `${this.player.name} ${this.player.isHuman ? "are" : "is"} out of dice and eliminated!`;
  }
}

export class GameOver extends GameEvent {
  constructor(readonly winner: Player) {
    super();
  }

  format(): string {
    return `\n=== ${this.winner.name} ${conjugate(this.winner, "win")} the game! ===`;
  }
}
