import { formatHand, RoundStarted, type GameEvent } from "../events/gameEvent.js";
import type { Player } from "../models/player.js";
import type { PlayerView } from "../types/playerView.js";

/** Prints each event, plus the human's new hand whenever a round starts. */
export function printEvents(events: readonly GameEvent[], human: Player): void {
  for (const event of events) {
    console.log(event.format());
    if (event instanceof RoundStarted && !human.isEliminated()) {
      console.log(`Your hand: ${formatHand(human.dice)}`);
    }
  }
}

export function printTurnPrompt(view: PlayerView): void {
  const opponents = view.turnOrder.filter((p) => p.name !== view.self.name);
  console.log(`\nYour hand: ${formatHand(view.hand)}`);
  console.log(`Opponents: ${opponents.map((p) => `${p.name} (${p.diceCount} dice)`).join("  |  ")}`);

  if (view.currentBid) {
    console.log(`Current bid: ${view.currentBid.quantity} x [${view.currentBid.face}]`);
  } else {
    console.log("You open the bidding this round.");
  }

  if (view.isPalifico) {
    const lock = view.currentBid
      ? `all bids locked to face [${view.currentBid.face}]`
      : "you set the locked face with your opening bid";
    console.log(`(Palifico: no wild 1s, ${lock})`);
  }
}
