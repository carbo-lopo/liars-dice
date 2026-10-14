import type { Bid } from "../types/bid.js";
import type { Player } from "./player.js";

export interface BidRecord {
  bidder: Player;
  bid: Bid;
}
