import type { BotStrategy } from "@engine/types/botStrategy.js";
import type { PlayerAction } from "@engine/types/playerAction.js";
import type { PlayerView } from "@engine/types/playerView.js";

/** A bot whose every decision is fixed by the test, so turns play out the same each run. */
function scriptedBot(id: string, decide: (view: PlayerView) => PlayerAction): BotStrategy {
  return { id, label: id, decide };
}

const OPENING_BID: PlayerAction = { type: "bid", bid: { quantity: 1, face: 2 } };

/** Opens with 1 × Two, and calls any bid in front of it. */
export const callsAnyBid = scriptedBot("calls-any-bid", (view) => (view.currentBid ? { type: "call" } : OPENING_BID));

/** Opens with 1 × Two, and otherwise raises the quantity by one on the same face. */
export const raisesByOne = scriptedBot("raises-by-one", (view) =>
  view.currentBid
    ? { type: "bid", bid: { quantity: view.currentBid.quantity + 1, face: view.currentBid.face } }
    : OPENING_BID,
);
