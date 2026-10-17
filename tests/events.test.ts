import { describe, it, expect } from "vitest";
import { BOT_STRATEGIES } from "../src/bots/roster.js";
import { BidPlaced, LiarCalled, PlayerEliminated } from "../src/events/gameEvent.js";
import { Player } from "../src/models/player.js";

const you = new Player("You", [6]);
const cora = new Player("Cora", [3, 5, 2], BOT_STRATEGIES[0]!);
const bid = { quantity: 2, face: 6 } as const;

describe("event narration", () => {
  it("refers to the human's bid as 'your bid' when a bot calls it", () => {
    expect(new LiarCalled(cora, you, bid).format()).toBe("\nCora calls LIAR on your bid of 2 x [6]!");
  });

  it("names the bot's bid when the human calls it", () => {
    expect(new LiarCalled(you, cora, bid).format()).toBe("\nYou call LIAR on Cora's bid of 2 x [6]!");
  });

  it("conjugates verbs for the human and for bots", () => {
    expect(new BidPlaced(you, bid).format()).toBe("You bid: 2 x [6]");
    expect(new BidPlaced(cora, bid).format()).toBe("Cora bids: 2 x [6]");
    expect(new PlayerEliminated(you).format()).toBe("You are out of dice and eliminated!");
    expect(new PlayerEliminated(cora).format()).toBe("Cora is out of dice and eliminated!");
  });
});
