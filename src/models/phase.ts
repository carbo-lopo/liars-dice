export type ActionType = "bid" | "call";

export abstract class Phase {
  abstract readonly name: string;
  protected abstract readonly allowedActions: readonly ActionType[];

  allows(action: ActionType): boolean {
    return this.allowedActions.includes(action);
  }
}

/** No bid yet this round; the opening player must bid. */
export class OpeningPhase extends Phase {
  readonly name = "opening";
  protected readonly allowedActions = ["bid"] as const;
}

/** At least one bid is on the table; the current player may raise or call. */
export class BiddingPhase extends Phase {
  readonly name = "bidding";
  protected readonly allowedActions = ["bid", "call"] as const;
}

/** The last bid has been called and the dice counted; the round is over. */
export class CalledPhase extends Phase {
  readonly name = "called";
  protected readonly allowedActions = [] as const;
}
