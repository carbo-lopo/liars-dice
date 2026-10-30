import { act, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
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
import { stubPhoneScreen } from "../test/phone";
import { StrictWrapper } from "../test/strictMode";
import { countedSemitones } from "../audio/sounds";
import { fakeAudio } from "../test/fakeAudio";
import { RevealScreen } from "./RevealScreen";

const bot: BotStrategy = { id: "idle", label: "Idle", decide: () => ({ type: "call" }) };

/**
 * Cora bid `quantity` × Fives (4 by default) and Duke called. Hands are listed
 * in turn order (Duke first), and 5 Fives count with wild Aces, so a bid of up
 * to 5 held and Duke loses a die; above that it was a bluff and Cora loses one.
 * Either way the loser still has dice left.
 */
function coraCalledByDuke({ quantity = 4 } = {}): ChallengeResolution {
  const duke = new Player("Duke", [3, 1, 4, 6], bot);
  const cora = new Player("Cora", [5, 2, 1, 6, 3], bot);
  const you = new Player("You", [5, 5, 4, 2, 6]);
  return new ChallengeResolution({
    challenger: duke,
    bidder: cora,
    bid: { quantity, face: 5 },
    actualCount: 5,
    outcome: quantity <= 5 ? "challenger-wrong" : "challenger-right",
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

function renderReveal({
  fastForward = false,
  covered = false,
  quantity = 4,
  wrapper = StrictWrapper,
}: { fastForward?: boolean; covered?: boolean; quantity?: number; wrapper?: ComponentType<{ children: ReactNode }> } = {}) {
  const onContinue = vi.fn();
  const onToggleFastForward = vi.fn();
  const element = (on: boolean, isCovered = covered) => (
    <RevealScreen
      resolution={coraCalledByDuke({ quantity })}
      onContinue={onContinue}
      onQuit={() => {}}
      onRules={() => {}}
      onOptions={() => {}}
      fastForward={on}
      onToggleFastForward={onToggleFastForward}
      covered={isCovered}
    />
  );
  const view = render(element(fastForward), { wrapper });
  return {
    onContinue,
    onToggleFastForward,
    setFastForward: (on: boolean) => view.rerender(element(on)),
    setCovered: (on: boolean) => view.rerender(element(fastForward, on)),
  };
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

  it("holds the reveal while another screen covers it, and gives focus back after", () => {
    const { setCovered } = renderReveal();
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS));
    expect(count()).toBe("1");

    setCovered(true);
    act(() => (document.activeElement as HTMLElement).blur());
    act(() => vi.advanceTimersByTime(60_000));
    expect(count()).toBe("1");
    expect(fastForwardButton()).not.toBeNull();

    setCovered(false);
    expect(document.activeElement).toBe(fastForwardButton());
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS));
    expect(labels()[1]).toBe("Two");
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

  it("on a phone, puts the header buttons in a Menu and still ends with the verdict and Continue", () => {
    stubPhoneScreen();
    const { onContinue } = renderReveal();
    expect(screen.queryByRole("button", { name: "Quit Game" })).toBeNull();
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
    expect(continueButton()).toHaveProperty("disabled", true);

    act(() => vi.advanceTimersByTime(ALL_DICE_MS + VERDICT_MS));
    expect(count()).toBe("5");
    expect(screen.getAllByText(/The bid held\. Duke loses a die\./).length).toBeGreaterThan(0);
    act(() => continueButton().click());
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("chimes for each die that counts, rising in pitch, and plays the other sound for the rest", () => {
    const { played, semitones, Wrapper } = fakeAudio();
    renderReveal({ wrapper: Wrapper });
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS));
    expect(played).toEqual(["counted"]); // Cora's first die is a Five
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS));
    expect(played).toEqual(["counted", "notCounted"]); // a Two doesn't count

    act(() => vi.advanceTimersByTime(ALL_DICE_MS - FIRST_REVEAL_MS - REVEAL_GAP_MS));
    expect(played).toHaveLength(TOTAL_DICE); // every die, and no verdict yet
    expect(played.filter((name) => name === "counted")).toHaveLength(5);
    expect(semitones.filter((_, i) => played[i] === "counted")).toEqual([0, 1, 2, 3, 4].map(countedSemitones));
    expect(semitones.filter((_, i) => played[i] === "notCounted").every((shift) => shift === 0)).toBe(true);
  });

  it("plays the win sound once as the verdict shows a bid that held", () => {
    const { played, Wrapper } = fakeAudio();
    renderReveal({ wrapper: Wrapper });
    act(() => vi.advanceTimersByTime(ALL_DICE_MS + VERDICT_MS - 1));
    expect(played).not.toContain("bidTrue");
    act(() => vi.advanceTimersByTime(60_000));
    expect(played.filter((name) => name === "bidTrue" || name === "bidFalse")).toEqual(["bidTrue"]);
    expect(played.at(-1)).toBe("bidTrue");
  });

  it("plays the lose sound for a bluff", () => {
    const { played, Wrapper } = fakeAudio();
    renderReveal({ wrapper: Wrapper, quantity: 6 });
    act(() => vi.advanceTimersByTime(60_000));
    expect(played.filter((name) => name === "bidTrue" || name === "bidFalse")).toEqual(["bidFalse"]);
  });

  it("plays only the verdict when the reveal is shown at once for reduced motion", () => {
    preferReducedMotion();
    const { played, Wrapper } = fakeAudio();
    renderReveal({ wrapper: Wrapper });
    act(() => vi.advanceTimersByTime(60_000));
    expect(played).toEqual(["bidTrue"]);
  });
});
