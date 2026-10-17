import type { Face } from "./face.js";

export interface Bid {
  /** How many dice, across every player's hand, are claimed to show `face`. */
  quantity: number;
  face: Face;
}
