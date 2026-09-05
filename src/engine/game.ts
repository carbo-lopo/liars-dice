import type {
  Bid,
  ChallengeResolution,
  Face,
  GameEvent,
  GamePhase,
  GameState,
  Player,
  PlayerKind,
  PersonalityName,
  PlayerView,
} from "../types.js";
import { rollHand, type Rng, defaultRng } from "./dice.js";
import { countActualMatches, isValidRaise, type BidContext } from "./bidding.js";

export const STARTING_DICE = 5;

export interface NewPlayerSpec {
  id: string;
  name: string;
  kind: PlayerKind;
  personality?: PersonalityName;
  /**
   * Test/debug hook: use this exact starting hand instead of rolling one.
   * Dice count is taken from the hand's length. Never set this from real
   * gameplay code -- it exists so engine tests can assert deterministic
   * outcomes without needing to hand-simulate the RNG stream.
   */
  forcedHand?: Face[];
}

export class IllegalActionError extends Error {}

/**
 * Owns all game state and enforces the rules. Nothing outside this class
 * should ever mutate a Player's dice directly -- go through placeBid /
 * challenge so the event log and invariants stay correct.
 */
export class GameEngine {
  private state: GameState;
  private events: GameEvent[] = [];
  private rng: Rng;

  constructor(specs: NewPlayerSpec[], rng: Rng = defaultRng) {
    if (specs.length < 2) {
      throw new Error("Liar's Dice needs at least 2 players.");
    }
    this.rng = rng;
    const players: Player[] = specs.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      personality: s.personality,
      dice: s.forcedHand ? [...s.forcedHand] : rollHand(STARTING_DICE, this.rng),
      eliminated: false,
    }));

    this.state = {
      players,
      currentPlayerIndex: 0,
      currentBid: null,
      bidHistory: [],
      roundNumber: 1,
      phase: "bidding",
      isPalificoRound: false,
      palificoFace: null,
      winnerId: null,
      lastResolution: null,
    };

    this.pushEvent({ type: "game-started", players: clonePlayers(players) });
    this.beginRoundBookkeeping(true);
  }

  // ---------------------------------------------------------------- public

  getPublicSnapshot(): Readonly<GameState> {
    return cloneState(this.state);
  }

  getEventLog(): readonly GameEvent[] {
    return this.events.slice();
  }

  /** Consume-and-clear: useful for a UI polling loop that wants only new events. */
  drainNewEvents(sinceIndex: number): { events: GameEvent[]; nextIndex: number } {
    return { events: this.events.slice(sinceIndex), nextIndex: this.events.length };
  }

  getPlayerView(playerId: string): PlayerView {
    const self = this.requirePlayer(playerId);
    const others = this.state.players
      .filter((p) => p.id !== playerId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        diceCount: p.dice.length,
        eliminated: p.eliminated,
      }));

    return {
      selfId: playerId,
      self: { ...self, dice: [...self.dice] },
      others,
      currentPlayerId: this.state.players[this.state.currentPlayerIndex]!.id,
      currentBid: this.state.currentBid ? { ...this.state.currentBid } : null,
      bidHistory: this.state.bidHistory.map((b) => ({ ...b, bid: { ...b.bid } })),
      roundNumber: this.state.roundNumber,
      phase: this.state.phase,
      isPalificoRound: this.state.isPalificoRound,
      palificoFace: this.state.palificoFace,
      totalDiceInPlay: this.totalDiceInPlay(),
      winnerId: this.state.winnerId,
      lastResolution: this.state.lastResolution,
    };
  }

  getBidContext(): BidContext {
    return {
      totalDiceInPlay: this.totalDiceInPlay(),
      isPalificoRound: this.state.isPalificoRound,
      palificoFace: this.state.palificoFace,
    };
  }

  isPlayersTurn(playerId: string): boolean {
    return this.state.players[this.state.currentPlayerIndex]?.id === playerId;
  }

  placeBid(playerId: string, bid: Bid): GameEvent[] {
    this.assertPhase("bidding");
    this.assertTurn(playerId);

    const validation = isValidRaise(this.state.currentBid, bid, this.getBidContext());
    if (!validation.valid) {
      throw new IllegalActionError(validation.reason ?? "Invalid bid.");
    }

    const isOpeningBidOfPalifico = this.state.isPalificoRound && this.state.currentBid === null;

    const emitted: GameEvent[] = [];
    this.state.currentBid = { ...bid };
    this.state.bidHistory.push({ playerId, bid: { ...bid } });

    if (isOpeningBidOfPalifico) {
      this.state.palificoFace = bid.face;
      emitted.push(this.pushEvent({ type: "palifico-declared", playerId, face: bid.face }));
    }

    emitted.push(this.pushEvent({ type: "bid-placed", playerId, bid: { ...bid } }));

    this.state.currentPlayerIndex = this.nextActiveIndex(this.state.currentPlayerIndex);
    return emitted;
  }

  challenge(playerId: string): GameEvent[] {
    this.assertPhase("bidding");
    this.assertTurn(playerId);

    const bid = this.state.currentBid;
    if (!bid) {
      throw new IllegalActionError("Cannot challenge before any bid has been placed.");
    }
    const bidderRecord = this.state.bidHistory[this.state.bidHistory.length - 1];
    if (!bidderRecord) {
      throw new IllegalActionError("No bid on record to challenge.");
    }
    const bidderId = bidderRecord.playerId;

    const emitted: GameEvent[] = [];
    emitted.push(this.pushEvent({ type: "challenge", challengerId: playerId, bidderId, bid: { ...bid } }));

    const activePlayers = this.activePlayers();
    const hands = activePlayers.map((p) => p.dice);
    const onesWild = !this.state.isPalificoRound;
    const actualCount = countActualMatches(hands, bid, onesWild);

    const bidderWasRight = actualCount >= bid.quantity;
    const loserId = bidderWasRight ? playerId : bidderId;

    const reveal: Record<string, Face[]> = {};
    for (const p of activePlayers) reveal[p.id] = [...p.dice];

    const resolution: ChallengeResolution = {
      challengerId: playerId,
      bidderId,
      finalBid: { ...bid },
      actualCount,
      outcome: bidderWasRight ? "bidder-right" : "bidder-wrong",
      loserId,
      reveal,
      onesWild,
    };
    this.state.lastResolution = resolution;
    emitted.push(this.pushEvent({ type: "reveal", resolution }));

    const loser = this.requirePlayer(loserId);
    loser.dice.pop(); // value doesn't matter -- hands are re-rolled next round
    if (loser.dice.length === 0) {
      loser.eliminated = true;
      emitted.push(this.pushEvent({ type: "player-eliminated", playerId: loser.id }));
    }

    const survivors = this.state.players.filter((p) => !p.eliminated);
    if (survivors.length <= 1) {
      const winner = survivors[0];
      this.state.phase = "game-over";
      this.state.winnerId = winner?.id ?? null;
      if (winner) emitted.push(this.pushEvent({ type: "game-over", winnerId: winner.id }));
      return emitted;
    }

    // Determine who starts the next round: the loser, if they survived;
    // otherwise the next active player after them in seating order.
    const loserIndex = this.state.players.findIndex((p) => p.id === loserId);
    this.state.currentPlayerIndex = loser.eliminated
      ? this.nextActiveIndex(loserIndex)
      : loserIndex;

    this.state.roundNumber += 1;
    this.state.currentBid = null;
    this.state.bidHistory = [];
    this.state.phase = "bidding";

    for (const p of survivors) {
      p.dice = rollHand(p.dice.length, this.rng);
    }

    this.beginRoundBookkeeping(false, emitted);
    return emitted;
  }

  // --------------------------------------------------------------- private

  private beginRoundBookkeeping(isFirstRound: boolean, emitted: GameEvent[] = []) {
    const starter = this.state.players[this.state.currentPlayerIndex]!;
    this.state.isPalificoRound = !isFirstRound && starter.dice.length === 1;
    this.state.palificoFace = null;

    const diceCounts: Record<string, number> = {};
    for (const p of this.state.players) diceCounts[p.id] = p.dice.length;

    emitted.push(
      this.pushEvent({ type: "round-started", roundNumber: this.state.roundNumber, diceCounts }),
    );
  }

  private totalDiceInPlay(): number {
    return this.activePlayers().reduce((sum, p) => sum + p.dice.length, 0);
  }

  private activePlayers(): Player[] {
    return this.state.players.filter((p) => !p.eliminated);
  }

  private nextActiveIndex(fromIndex: number): number {
    const n = this.state.players.length;
    for (let step = 1; step <= n; step++) {
      const idx = (fromIndex + step) % n;
      if (!this.state.players[idx]!.eliminated) return idx;
    }
    throw new Error("No active players remain -- game should already be over.");
  }

  private requirePlayer(playerId: string): Player {
    const p = this.state.players.find((pl) => pl.id === playerId);
    if (!p) throw new IllegalActionError(`Unknown player id: ${playerId}`);
    return p;
  }

  private assertTurn(playerId: string) {
    if (!this.isPlayersTurn(playerId)) {
      throw new IllegalActionError(
        `It is not ${playerId}'s turn (current: ${this.state.players[this.state.currentPlayerIndex]!.id}).`,
      );
    }
  }

  private assertPhase(phase: GamePhase) {
    if (this.state.phase !== phase) {
      throw new IllegalActionError(`Action not allowed in phase '${this.state.phase}'.`);
    }
  }

  private pushEvent(e: GameEvent): GameEvent {
    this.events.push(e);
    return e;
  }
}

function clonePlayers(players: Player[]): Player[] {
  return players.map((p) => ({ ...p, dice: [...p.dice] }));
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: clonePlayers(state.players),
    bidHistory: state.bidHistory.map((b) => ({ ...b, bid: { ...b.bid } })),
    currentBid: state.currentBid ? { ...state.currentBid } : null,
  };
}
