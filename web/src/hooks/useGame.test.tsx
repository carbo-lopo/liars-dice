import { act, renderHook } from "@testing-library/react";
import type { Seat } from "@engine/engine/gameEngine.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callsAnyBid, raisesByOne } from "../test/scriptedBot";
import { StrictWrapper } from "../test/strictMode";
import { DEFAULT_SEATS, THINKING_MAX_MS, useGame, type UseGameApi } from "./useGame";
import { silenceExpectedRenderErrors } from "../test/expectedErrors";

const you: Seat = { name: "You", strategy: null };
const ann: Seat = { name: "Ann", strategy: raisesByOne };
const bo: Seat = { name: "Bo", strategy: callsAnyBid };
const cy: Seat = { name: "Cy", strategy: raisesByOne };

function renderGame(seats: readonly Seat[]) {
  return renderHook(() => useGame(seats), { wrapper: StrictWrapper });
}

/** Makes Math.random repeatable for the rest of the test. */
function seedRandom(seed: number): void {
  let state = seed;
  vi.spyOn(Math, "random").mockImplementation(() => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  });
}

/** Lets the thinking bot act, types its bid out, and presses Continue. */
function playBotTurn(result: { current: UseGameApi }): void {
  act(() => vi.advanceTimersByTime(THINKING_MAX_MS));
  act(() => result.current.finishTyping());
  act(() => result.current.continueAfterBotAction());
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useGame", () => {
  it("starts with the roll and waits for it before anyone acts", () => {
    const { result } = renderGame([ann, you]);
    expect(result.current.phase.kind).toBe("rolling");
    expect(result.current.screen).toBe("main");
    expect(result.current.isYourTurn).toBe(false);

    act(() => vi.advanceTimersByTime(THINKING_MAX_MS * 3));
    expect(result.current.phase.kind).toBe("rolling");
    expect(result.current.view.bidHistory).toHaveLength(0);
  });

  it("gives the player the opening when they sit first", () => {
    const { result } = renderGame([you, ann]);
    act(() => result.current.finishRolling());
    expect(result.current.phase.kind).toBe("yourTurn");
  });

  it("runs a bot's turn: thinking, one bid typed out, then Continue", () => {
    const { result } = renderGame([ann, you]);
    act(() => result.current.finishRolling());
    expect(result.current.phase).toEqual({ kind: "botThinking", bot: "Ann" });
    expect(result.current.thinkingBot).toBe("Ann");

    act(() => vi.advanceTimersByTime(THINKING_MAX_MS));
    expect(result.current.phase).toEqual({ kind: "typingBid", byHuman: false });
    expect(result.current.view.bidHistory.map((r) => r.bidder.name)).toEqual(["Ann"]);

    act(() => result.current.finishTyping());
    expect(result.current.awaitingContinue).toBe(true);

    act(() => result.current.continueAfterBotAction());
    expect(result.current.isYourTurn).toBe(true);
  });

  it("takes turns in seat order, however many bots sit where", () => {
    const seats = [ann, cy, you, bo];
    const { result } = renderGame(seats);
    act(() => result.current.finishRolling());

    expect(result.current.thinkingBot).toBe("Ann");
    playBotTurn(result);
    expect(result.current.thinkingBot).toBe("Cy");
    playBotTurn(result);
    expect(result.current.phase.kind).toBe("yourTurn");
    expect(result.current.view.turnOrder.map((p) => p.name)).toEqual(["You", "Bo", "Ann", "Cy"]);
    expect(result.current.opponents.map((o) => o.name)).toEqual(["Ann", "Cy", "Bo"]);
  });

  it("ignores Continue once the game has already moved on", () => {
    const { result } = renderGame([ann, cy, you]);
    act(() => result.current.finishRolling());
    act(() => vi.advanceTimersByTime(THINKING_MAX_MS));
    act(() => result.current.finishTyping());
    act(() => result.current.continueAfterBotAction());
    expect(result.current.thinkingBot).toBe("Cy");

    // A second press, e.g. a click just after auto-continue, must not restart Cy's thinking.
    act(() => vi.advanceTimersByTime(THINKING_MAX_MS / 2));
    act(() => result.current.continueAfterBotAction());
    act(() => vi.advanceTimersByTime(THINKING_MAX_MS / 2));
    expect(result.current.view.bidHistory.map((r) => r.bidder.name)).toEqual(["Ann", "Cy"]);
  });

  it("types out the player's bid, then the next bot thinks without a Continue", () => {
    const { result } = renderGame([ann, you, cy]);
    act(() => result.current.finishRolling());
    playBotTurn(result);
    const current = result.current.view.currentBid!;

    act(() => result.current.placeBid({ quantity: current.quantity + 1, face: current.face }));
    expect(result.current.phase).toEqual({ kind: "typingBid", byHuman: true });

    act(() => result.current.finishTyping());
    expect(result.current.phase).toEqual({ kind: "botThinking", bot: "Cy" });
  });

  it("rejects an illegal bid with an error and stays on the player's turn", () => {
    const { result } = renderGame([ann, you]);
    act(() => result.current.finishRolling());
    playBotTurn(result);

    act(() => result.current.placeBid({ ...result.current.view.currentBid! }));
    expect(result.current.error).not.toBeNull();
    expect(result.current.phase.kind).toBe("yourTurn");
    expect(result.current.view.bidHistory).toHaveLength(1);
  });

  it("shows the reveal after the player calls, then rolls the next round", () => {
    const { result } = renderGame([ann, you]);
    act(() => result.current.finishRolling());
    playBotTurn(result);

    act(() => result.current.call());
    expect(result.current.screen).toBe("reveal");
    expect(result.current.resolution?.challenger.name).toBe("You");
    expect(result.current.resolution?.bidder.name).toBe("Ann");

    act(() => result.current.continueAfterReveal());
    expect(result.current.phase.kind).toBe("rolling");
    expect(result.current.view.roundNumber).toBe(1);
  });

  it("goes straight to the reveal when a bot calls the player's bid", () => {
    const { result } = renderGame([you, bo]);
    act(() => result.current.finishRolling());
    act(() => result.current.placeBid({ quantity: 1, face: 3 }));
    act(() => result.current.finishTyping());
    expect(result.current.thinkingBot).toBe("Bo");

    act(() => vi.advanceTimersByTime(THINKING_MAX_MS));
    expect(result.current.screen).toBe("reveal");
    expect(result.current.resolution?.challenger.name).toBe("Bo");
  });

  it("cancels a thinking bot's action when the game is restarted", () => {
    const { result } = renderGame([ann, you]);
    act(() => result.current.finishRolling());
    act(() => vi.advanceTimersByTime(THINKING_MAX_MS / 2));

    act(() => result.current.playAgain());
    act(() => vi.advanceTimersByTime(THINKING_MAX_MS * 3));
    expect(result.current.phase.kind).toBe("rolling");
    expect(result.current.view.bidHistory).toHaveLength(0);
  });

  it("refuses a table without exactly one human seat", () => {
    silenceExpectedRenderErrors();
    expect(() => renderHook(() => useGame([ann, bo]))).toThrow(/exactly one human/);
    expect(() => renderHook(() => useGame([you, { name: "Also you", strategy: null }]))).toThrow(/exactly one human/);
  });

  it("plays a whole game with the real bots through to game over", () => {
    seedRandom(42);
    const { result } = renderGame(DEFAULT_SEATS);
    let sawFinalReveal = false;

    for (let step = 0; step < 2000 && result.current.phase.kind !== "gameOver"; step++) {
      const game = result.current;
      switch (game.phase.kind) {
        case "rolling":
          act(() => game.finishRolling());
          break;
        case "botThinking":
          act(() => vi.advanceTimersByTime(THINKING_MAX_MS));
          break;
        case "typingBid":
          act(() => game.finishTyping());
          break;
        case "awaitingContinue":
          act(() => game.continueAfterBotAction());
          break;
        case "yourTurn":
          act(() => (game.view.currentBid ? game.call() : game.placeBid({ quantity: 1, face: 2 })));
          break;
        case "reveal":
          sawFinalReveal = game.phase.gameOverAfter;
          act(() => game.continueAfterReveal());
          break;
      }
    }

    expect(result.current.phase.kind).toBe("gameOver");
    expect(result.current.screen).toBe("gameover");
    expect(sawFinalReveal).toBe(true);
    expect(result.current.result?.loserNames).toHaveLength(DEFAULT_SEATS.length - 1);
  });
});
