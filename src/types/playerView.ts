import type { Bid } from "./bid.js";
import type { Face } from "./face.js";
import type { PublicPlayerState } from "./publicPlayerState.js";

interface PublicBidRecord {
  bidder: PublicPlayerState;
  bid: Bid;
}

/** Everything one player is allowed to know when choosing a move. */
export interface PlayerView {
  self: PublicPlayerState;
  hand: readonly Face[];
  /** Players still in the game, starting with whoever acts now, in turn order. */
  turnOrder: readonly PublicPlayerState[];
  currentBid: Bid | null;
  bidHistory: readonly PublicBidRecord[];
  /** 0-indexed. */
  roundNumber: number;
  isPalifico: boolean;
  totalDiceInPlay: number;
}
