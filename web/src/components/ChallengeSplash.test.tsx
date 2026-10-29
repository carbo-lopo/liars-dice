import { act, fireEvent, render, screen } from "@testing-library/react";
import { GameEngine } from "@engine/engine/gameEngine.js";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { DiceRevealed } from "@engine/events/gameEvent.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictWrapper } from "../test/strictMode";
import { fakeAudio } from "../test/fakeAudio";
import { ChallengeSplash, STAMP_HIT_MS } from "./ChallengeSplash";

/** A real resolution: `bidder` opens with 2 × Fives and `challenger` calls it. */
function callOn(bidder: { name: string; human: boolean }, challenger: { name: string; human: boolean }) {
  const seat = (p: { name: string; human: boolean }) => ({
    name: p.name,
    strategy: p.human ? null : { id: "idle", label: "Idle", decide: () => ({ type: "call" as const }) },
  });
  const engine = GameEngine.start([seat(bidder), seat(challenger)]);
  engine.bid({ quantity: 2, face: 5 });
  const revealed = engine.call().find((e): e is DiceRevealed => e instanceof DiceRevealed)!;
  return revealed.resolution as ChallengeResolution;
}

const cora = { name: "Cora", human: false };
const duke = { name: "Duke", human: false };
const you = { name: "You", human: true };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ChallengeSplash", () => {
  it("names who called whose bid, without the button in the announcement", () => {
    render(<ChallengeSplash resolution={callOn(cora, duke)} onContinue={() => {}} />);
    const alert = screen.getByRole("alert").textContent;
    expect(alert).toContain("Duke calls Liar on Cora’s bid of 2 × Fives");
    expect(alert).not.toContain("Continue");
  });

  it("speaks to the player when they are the caller or the bidder", () => {
    const { unmount } = render(<ChallengeSplash resolution={callOn(cora, you)} onContinue={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("You call Liar on Cora’s bid");
    unmount();

    render(<ChallengeSplash resolution={callOn(you, duke)} onContinue={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Duke calls Liar on your bid");
  });

  it("focuses Continue once nothing covers it any more", () => {
    const resolution = callOn(cora, duke);
    const { rerender } = render(<ChallengeSplash resolution={resolution} onContinue={() => {}} covered />, {
      wrapper: StrictWrapper,
    });
    expect(document.activeElement).toBe(document.body);

    rerender(<ChallengeSplash resolution={resolution} onContinue={() => {}} covered={false} />);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Continue" }));
  });

  it("waits for Continue however long it stays up, and focuses it", () => {
    const onContinue = vi.fn();
    render(<ChallengeSplash resolution={callOn(cora, duke)} onContinue={onContinue} />, { wrapper: StrictWrapper });
    const button = screen.getByRole("button", { name: "Continue" });
    expect(document.activeElement).toBe(button);

    act(() => vi.advanceTimersByTime(60_000));
    expect(onContinue).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("plays the stamp once, as the stamp hits", () => {
    const { played, Wrapper } = fakeAudio();
    render(<ChallengeSplash resolution={callOn(cora, duke)} onContinue={() => {}} />, { wrapper: Wrapper });
    act(() => vi.advanceTimersByTime(STAMP_HIT_MS - 1));
    expect(played).toEqual([]);
    act(() => vi.advanceTimersByTime(1));
    expect(played).toEqual(["stamp"]);
    act(() => vi.advanceTimersByTime(10_000));
    expect(played).toEqual(["stamp"]);
  });
});
