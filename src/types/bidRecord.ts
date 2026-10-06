import type { Player } from "../models/player.js";
import type { Bid } from "./bid.js";

export interface BidRecord {
  bidder: Player;
  bid: Bid;
}
