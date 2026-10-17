import type { BotStrategy } from "../types/botStrategy.js";
import type { Face } from "../types/face.js";

export class Player {
  constructor(
    readonly name: string,
    public dice: Face[],
    /** Null for the human player. */
    readonly strategy: BotStrategy | null = null,
  ) {}

  get isHuman(): boolean {
    return this.strategy === null;
  }

  get diceCount(): number {
    return this.dice.length;
  }

  isEliminated(): boolean {
    return this.dice.length === 0;
  }

  loseDie(): void {
    this.dice.pop();
  }
}
