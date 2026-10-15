import {
  BidPlaced,
  DiceRevealed,
  GameOver,
  GameStarted,
  LiarCalled,
  PalificoDeclared,
  PlayerEliminated,
  RoundStarted,
  type GameEvent,
} from "../events/gameEvent.js";
import { Game } from "../models/game.js";
import { Player } from "../models/player.js";
import { NormalRound, PalificoRound, type Round } from "../models/round.js";
import type { Bid } from "../types/bid.js";
import type { BotStrategy } from "../types/botStrategy.js";
import { STARTING_DICE } from "../types/constants.js";
import type { PlayerView } from "../types/playerView.js";
import type { PublicPlayerState } from "../types/publicPlayerState.js";
import { rollHand } from "./dice.js";
import { IllegalActionError } from "../rules/illegalActionError.js";

export interface Seat {
  name: string;
  /** Null for the human player. */
  strategy: BotStrategy | null;
}

function publicStateOf(player: Player): PublicPlayerState {
  return { name: player.name, diceCount: player.diceCount };
}

/** Applies moves to a Game on behalf of whoever's turn it is, and records what happened. */
export class GameEngine {
  /** Every event this engine has produced, oldest first. */
  readonly events: GameEvent[] = [];

  constructor(readonly game: Game) {}

  /** Seats players in the given order, rolls their hands, and opens the first round. */
  static start(seats: readonly Seat[], startingDice = STARTING_DICE): GameEngine {
    if (!Number.isInteger(startingDice) || startingDice < 1) {
      throw new RangeError(`Starting dice must be a positive whole number (got ${startingDice}).`);
    }
    const players = seats.map((s) => new Player(s.name, rollHand(startingDice), s.strategy));
    const engine = new GameEngine(new Game(players));
    engine.record([new GameStarted(players), new RoundStarted(0, engine.game.round.turnOrder)]);
    return engine;
  }

  /** The current player raises to `bid`. */
  bid(bid: Bid): GameEvent[] {
    this.assertInProgress();
    const round = this.game.round;
    const bidder = round.currentPlayer;
    round.placeBid(bid);

    const emitted: GameEvent[] = [];
    if (round instanceof PalificoRound && round.bidHistory.length === 1) {
      emitted.push(new PalificoDeclared(bidder, bid.face));
    }
    emitted.push(new BidPlaced(bidder, { ...bid }));
    return this.record(emitted);
  }

  /** The current player calls the last bid a lie. Starts the next round unless the game is over. */
  call(): GameEvent[] {
    this.assertInProgress();
    const round = this.game.round;
    const resolution = round.call();

    const emitted: GameEvent[] = [
      new LiarCalled(resolution.challenger, resolution.bidder, resolution.bid),
      new DiceRevealed(resolution),
    ];
    if (resolution.loser.isEliminated()) {
      emitted.push(new PlayerEliminated(resolution.loser));
    }

    const winner = this.game.winner;
    if (winner) {
      emitted.push(new GameOver(winner));
    } else {
      emitted.push(this.startNextRound(round));
    }
    return this.record(emitted);
  }

  /** What `player` is allowed to see: their own hand plus public information. */
  viewFor(player: Player): PlayerView {
    const round = this.game.round;
    return {
      self: publicStateOf(player),
      hand: [...player.dice],
      turnOrder: round.turnOrder.map(publicStateOf),
      currentBid: round.currentBid ? { ...round.currentBid } : null,
      bidHistory: round.bidHistory.map((r) => ({ bidder: publicStateOf(r.bidder), bid: { ...r.bid } })),
      roundNumber: round.index,
      isPalifico: round.isPalifico,
      totalDiceInPlay: round.totalDice,
    };
  }

  private startNextRound(previous: Round): RoundStarted {
    const starter = previous.nextStarter();
    const active = this.game.activePlayers;
    for (const player of active) player.dice = rollHand(player.diceCount);

    const starterIndex = active.indexOf(starter);
    const turnOrder = [...active.slice(starterIndex), ...active.slice(0, starterIndex)];
    const index = this.game.round.index + 1;
    this.game.round =
      previous.nextIsPalifico() ? new PalificoRound(index, turnOrder) : new NormalRound(index, turnOrder);
    return new RoundStarted(index, turnOrder);
  }

  private assertInProgress(): void {
    if (this.game.isOver) throw new IllegalActionError("The game is over.");
  }

  private record(events: GameEvent[]): GameEvent[] {
    this.events.push(...events);
    return events;
  }
}
