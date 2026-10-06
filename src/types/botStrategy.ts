import type { PlayerAction } from "./playerAction.js";
import type { PlayerView } from "./playerView.js";

export interface BotStrategy {
  readonly id: string;
  readonly label: string;
  decide(view: PlayerView): PlayerAction;
}
