import { act, render, screen } from "@testing-library/react";
import { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { Player } from "@engine/models/player.js";
import type { BotStrategy } from "@engine/types/botStrategy.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FAST_FORWARD_SPEED,
  FIRST_REVEAL_MS,
  NEXT_HAND_MS,
  REVEAL_GAP_MS,
  VERDICT_MS,
} from "../hooks/useRevealSequence";
import { preferReducedMotion } from "../test/motion";
import { StrictWrapper } from "../test/strictMode";
import { RevealScreen } from "./RevealScreen";

const bot: BotStrategy = { id: "idle", label: "Idle", decide: () => ({ type: "call" }) };

/**
 * Cora bid 4 × Fives and Duke called. Hands are listed in turn order (Duke
 * first), and 5 Fives count with wild Aces, so the bid held and Duke loses a
 * die. Duke still has dice left after losing one.
 */
function coraCalledByDuke(): ChallengeResolution {
  const duke = new Player("Duke", [3, 1, 4, 6], bot);
  const cora = new Player("Cora", [5, 2, 1, 6, 3], bot);
  const you = new Player("You", [5, 5, 4, 2, 6]);
  return new ChallengeResolution({
    challenger: duke,
    bidder: cora,
    bid: { quantity: 4, face: 5 },
    actualCount: 5,
    outcome: "challenger-wrong",
    isPalifico: false,
    reveal: [duke, cora, you].map((player) => ({ player, dice: [...player.dice] })),
  });
}

const TOTAL_DICE = 14;
const labels = () => screen.getAllByRole("img").map((die) => die.getAttribute("aria-label"));
const count = () => screen.getByTestId("reveal-count").textContent;
const continueButton = () => screen.getByRole("button", { name: "Continue" });

/** Time from the first die to the last, with the pauses between hands. */
const ALL_DICE_MS = FIRST_REVEAL_MS + (TOTAL_DICE - 1) * REVEAL_GAP_MS + 2 * NEXT_HAND_MS;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function renderReveal({ fastForward = false } = {}) {
  const onContinue = vi.fn();
  const onToggleFastForward = vi.fn();
  const element = (on: boolean) => (
    <RevealScreen
      resolution={coraCalledByDuke()}
      onContinue={onContinue}
      onQuit={() => {}}
      onRules={() => {}}
      onOptions={() => {}}
      fastForward={on}
      onToggleFastForward={onToggleFastForward}
    />
  );
  const view = render(element(fastForward), { wrapper: StrictWrapper });
  return { onContinue, onToggleFastForward, setFastForward: (on: boolean) => view.rerender(element(on)) };
}

const fastForwardButton = () => screen.queryByRole("button", { name: "Fast forward" });

describe("RevealScreen", () => {
  it("keeps Continue on screen but greyed out until the verdict", () => {
    renderReveal();
    expect(continueButton()).toHaveProperty("disabled", true);
    expect(continueButton().style.visibility).toBe("visible");
    act(() => vi.advanceTimersByTime(ALL_DICE_MS));
    expect(continueButton()).toHaveProperty("disabled", true);
    act(() => vi.advanceTimersByTime(VERDICT_MS));
    expect(continueButton()).toHaveProperty("disabled", false);
  });

  it("offers fast forward during the reveal and removes it with the verdict", () => {
    const { onToggleFastForward } = renderReveal();
    expect(fastForwardButton()?.getAttribute("aria-pressed")).toBe("false");
    act(() => fastForwardButton()!.click());
    expect(onToggleFastForward).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(ALL_DICE_MS + VERDICT_MS));
    expect(fastForwardButton()).toBeNull();
  });

  it("keeps focus on fast forward during the reveal, then moves it to Continue", () => {
    renderReveal();
    expect(document.activeElement).toBe(fastForwardButton());
    act(() => vi.advanceTimersByTime(ALL_DICE_MS + VERDICT_MS));
    expect(fastForwardButton()).toBeNull();
    expect(document.activeElement).toBe(continueButton());
  });

  it("focuses Continue at once for users who prefer reduced motion", () => {
    preferReducedMotion();
    renderReveal();
    expect(fastForwardButton()).toBeNull();
    expect(document.activeElement).toBe(continueButton());
  });

  it("runs twice as fast with fast forward on", () => {
    renderReveal({ fastForward: true });
    expect(fastForwardButton()?.getAttribute("aria-pressed")).toBe("true");
    act(() => vi.advanceTimersByTime((ALL_DICE_MS + VERDICT_MS) / FAST_FORWARD_SPEED));
    expect(count()).toBe("5");
    expect(continueButton()).toHaveProperty("disabled", false);
  });

  it("speeds up the rest of the reveal when fast forward is turned on part-way", () => {
    const { setFastForward } = renderReveal();
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS));
    expect(count()).toBe("1");

    setFastForward(true);
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS / FAST_FORWARD_SPEED));
    expect(labels()[1]).toBe("Two");
  });

  it("starts with every die face down and no verdict", () => {
    renderReveal();
    expect(labels()).toEqual(Array(TOTAL_DICE).fill("Hidden die"));
    expect(count()).toBe("0");
    expect(continueButton()).toHaveProperty("disabled", true);
    expect(screen.queryByText(/The bid held/)).toBeNull();
  });

  it("turns the bidder's hand over first, one die at a time", () => {
    renderReveal();
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS));
    expect(labels().slice(0, 2)).toEqual(["Five, counts toward Fives", "Hidden die"]);
    expect(count()).toBe("1");

    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS * 2));
    expect(labels().slice(0, 3)).toEqual(["Five, counts toward Fives", "Two", "Ace, counts toward Fives"]);
    expect(count()).toBe("2");
  });

  it("says whose dice are being revealed, and when they're all up", () => {
    renderReveal();
    expect(screen.getByText("Revealing Cora’s dice…")).toBeTruthy();
    const yourFirstDie = FIRST_REVEAL_MS + 5 * REVEAL_GAP_MS + NEXT_HAND_MS;
    act(() => vi.advanceTimersByTime(yourFirstDie));
    expect(screen.getByText("Revealing your dice…")).toBeTruthy();

    act(() => vi.advanceTimersByTime(ALL_DICE_MS - yourFirstDie));
    expect(screen.getByText("All dice are up…")).toBeTruthy();
    act(() => vi.advanceTimersByTime(VERDICT_MS));
    expect(screen.queryByText("All dice are up…")).toBeNull();
  });

  it("tells screen readers each hand's total as it finishes", () => {
    renderReveal();
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS + 4 * REVEAL_GAP_MS));
    expect(screen.getByText("Cora: 2 counted.")).toBeTruthy();
  });

  it("ends with the full count, the verdict and Continue", () => {
    const { onContinue } = renderReveal();
    act(() => vi.advanceTimersByTime(ALL_DICE_MS));
    expect(count()).toBe("5");
    expect(screen.getByTestId("reveal-fill").style.width).toBe("100%");
    expect(screen.getByText("+1")).toBeTruthy();
    expect(continueButton()).toHaveProperty("disabled", true);

    act(() => vi.advanceTimersByTime(VERDICT_MS));
    expect(screen.getAllByText("TRUE — 5 fives counted (wild Aces included).").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/The bid held\. Duke loses a die\./).length).toBeGreaterThan(0);
    expect(screen.getByText("− 1 die")).toBeTruthy();

    act(() => continueButton().click());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
