import type { Bid } from "./bid.js";

export type PlayerAction = { type: "bid"; bid: Bid } | { type: "call" };
