import type { GameEvent } from "../events/gameEvent.js";
import { MIN_PLAYERS } from "../types/constants.js";
import type { Player } from "./player.js";
import { NormalRound, type Round } from "./round.js";

export class Game {
  readonly events: GameEvent[] = [];
  round: Round;

  /**
   * @param players Every player, in seating order.
   * @param round The round in progress; defaults to an opening round started by the first active player.
   */
  constructor(
    readonly players: readonly Player[],
    round?: Round,
  ) {
    if (players.length < MIN_PLAYERS) {
      throw new Error(`Liar's Dice needs at least ${MIN_PLAYERS} players.`);
    }
    if (new Set(players.map((p) => p.name)).size !== players.length) {
      throw new Error("Player names must be unique.");
    }
    this.round = round ?? new NormalRound(0, this.activePlayers);
  }

  /** Players with dice left, in seating order. */
  get activePlayers(): Player[] {
    return this.players.filter((p) => !p.isEliminated());
  }

  get winner(): Player | null {
    const active = this.activePlayers;
    if (active.length === 0) {
      throw new Error("Every player has been eliminated, which should be impossible.");
    }
    return active.length === 1 ? active[0]! : null;
  }

  get isOver(): boolean {
    return this.winner !== null;
  }
}
