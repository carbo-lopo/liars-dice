/**
 * Core shared types for the Liar's Dice engine.
 *
 * Rule set implemented (see DESIGN.md for the full writeup):
 *  - 3 players, 5 dice each at start.
 *  - 1s are wild (count toward any face bid) EXCEPT during a Palifico round.
 *  - Palifico: when a player starts their turn-to-bid with exactly 1 die
 *    remaining, that round is played with no wild 1s, and every bid that
 *    round must use the same face as the round's first bid (only quantity
 *    may increase).
 *  - Losing a challenge (as bidder or as challenger) costs one die.
 *  - A player with 0 dice is eliminated. Last player with dice wins.
 */

export type Face = 1 | 2 | 3 | 4 | 5 | 6;

export const ALL_FACES: readonly Face[] = [1, 2, 3, 4, 5, 6];

export interface Bid {
  /** How many dice (across all players) are claimed to show `face`. */
  quantity: number;
  face: Face;
}

export type PlayerKind = "human" | "bot";

/**
 * Named archetypes used to parametrize bot decision-making. See
 * src/bots/personality.ts for the tunable numbers behind each name.
 */
export type PersonalityName = "cautious" | "aggressive" | "unpredictable";

export interface Player {
  id: string;
  name: string;
  kind: PlayerKind;
  personality?: PersonalityName; // only set for bots
  dice: Face[]; // current hand, hidden from other players in a real UI
  eliminated: boolean;
}

export interface BidRecord {
  playerId: string;
  bid: Bid;
}

export type RoundOutcomeKind = "bidder-wrong" | "bidder-right";

export interface ChallengeResolution {
  challengerId: string;
  bidderId: string;
  finalBid: Bid;
  actualCount: number;
  outcome: RoundOutcomeKind;
  /** The player who loses a die this round. */
  loserId: string;
  /** Full reveal of every remaining player's hand, for UI/animation use. */
  reveal: Record<string, Face[]>;
  /**
   * Whether 1s counted as wild for this specific resolution (false during a
   * Palifico round). Recorded explicitly rather than left for a UI to infer
   * from the *next* round's `isPalificoRound` -- that flag is already
   * updated for the round that follows by the time this resolution reaches
   * a caller, since starting the next round is part of the same challenge().
   */
  onesWild: boolean;
}

export type GamePhase = "bidding" | "round-resolved" | "game-over";

export interface GameState {
  players: Player[];
  /** Index into `players` of whoever acts next. */
  currentPlayerIndex: number;
  currentBid: Bid | null;
  bidHistory: BidRecord[];
  roundNumber: number;
  phase: GamePhase;
  /** True if the *current* round is being played under Palifico rules. */
  isPalificoRound: boolean;
  /** When Palifico is active, the face every bid this round is locked to. */
  palificoFace: Face | null;
  winnerId: string | null;
  lastResolution: ChallengeResolution | null;
}

/**
 * Structured event log the engine emits as the game progresses. A future UI
 * (or the CLI in the meantime) can consume this stream directly to drive
 * animations/narration without re-deriving "what just happened" from state
 * diffs.
 */
/**
 * What a single player is allowed to see: their own hand in full, but only
 * dice *counts* (never values) for everyone else. Bots and the CLI's
 * "opponent" rendering should only ever consume this, never the raw
 * GameState -- that's what keeps a probability-driven bot honest instead of
 * quietly cheating by reading hidden hands.
 */
export interface OpponentView {
  id: string;
  name: string;
  kind: PlayerKind;
  diceCount: number;
  eliminated: boolean;
}

export interface PlayerView {
  selfId: string;
  self: Player;
  others: OpponentView[];
  currentPlayerId: string;
  currentBid: Bid | null;
  bidHistory: BidRecord[];
  roundNumber: number;
  phase: GamePhase;
  isPalificoRound: boolean;
  palificoFace: Face | null;
  totalDiceInPlay: number;
  winnerId: string | null;
  lastResolution: ChallengeResolution | null;
}

export type GameEvent =
  | { type: "game-started"; players: Player[] }
  | { type: "round-started"; roundNumber: number; diceCounts: Record<string, number> }
  | { type: "palifico-declared"; playerId: string; face: Face }
  | { type: "bid-placed"; playerId: string; bid: Bid }
  | { type: "challenge"; challengerId: string; bidderId: string; bid: Bid }
  | { type: "reveal"; resolution: ChallengeResolution }
  | { type: "player-eliminated"; playerId: string }
  | { type: "game-over"; winnerId: string };
