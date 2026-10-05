import { describe, it, expect } from "vitest";
import { parseAction } from "../src/cli/input.js";
import { buildSeats, parsePlayerCount } from "../src/cli/options.js";

describe("parseAction", () => {
  it("accepts bids with or without the word 'bid', and call aliases", () => {
    expect(parseAction("bid 4 5")).toEqual({ ok: true, action: { type: "bid", bid: { quantity: 4, face: 5 } } });
    expect(parseAction("  4   5 ")).toEqual({ ok: true, action: { type: "bid", bid: { quantity: 4, face: 5 } } });
    expect(parseAction("CALL")).toEqual({ ok: true, action: { type: "call" } });
    expect(parseAction("liar")).toEqual({ ok: true, action: { type: "call" } });
  });

  it("explains what is wrong with invalid input", () => {
    for (const raw of ["", "bid", "bid 4", "bid 4 5 6", "raise 4 5"]) {
      expect(parseAction(raw).ok).toBe(false);
    }
    expect(parseAction("bid four 5")).toEqual({ ok: false, error: "Quantity and face must be whole numbers." });
    expect(parseAction("bid -1 5")).toEqual({ ok: false, error: "Quantity and face must be whole numbers." });
    expect(parseAction("bid 4 7")).toEqual({ ok: false, error: "Face must be from 1 to 6." });
    expect(parseAction("bid 0 3")).toEqual({ ok: false, error: "Quantity must be at least 1." });
  });
});

describe("player count", () => {
  it("defaults to 3 and rejects counts outside the supported range", () => {
    expect(parsePlayerCount([])).toBe(3);
    expect(parsePlayerCount(["5"])).toBe(5);
    for (const raw of ["1", "9", "2.5", "many"]) {
      expect(() => parsePlayerCount([raw])).toThrow(RangeError);
    }
  });

  it("seats a bot first, then you, then the remaining bots", () => {
    expect(buildSeats(2).map((s) => s.name)).toEqual(["Cora", "You"]);
    const seats = buildSeats(4);
    expect(seats.map((s) => s.name)).toEqual(["Cora", "You", "Duke", "Ezra"]);
    expect(seats.map((s) => s.strategy?.id ?? null)).toEqual(["cautious", null, "aggressive", "unpredictable"]);
  });
});
