import { act, render, screen } from "@testing-library/react";
import { GameEngine } from "@engine/engine/gameEngine.js";
import type { ChallengeResolution } from "@engine/models/challengeResolution.js";
import { DiceRevealed } from "@engine/events/gameEvent.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictWrapper } from "../test/strictMode";
import { ChallengeSplash, SPLASH_MS } from "./ChallengeSplash";

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

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("ChallengeSplash", () => {
  it("names who called whose bid", () => {
    render(<ChallengeSplash resolution={callOn({ name: "Cora", human: false }, { name: "Duke", human: false })} onDone={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Duke calls Liar on Cora’s bid of 2 × Fives");
  });

  it("speaks to the player when they are the caller or the bidder", () => {
    const { unmount } = render(
      <ChallengeSplash resolution={callOn({ name: "Cora", human: false }, { name: "You", human: true })} onDone={() => {}} />,
    );
    expect(screen.getByRole("alert").textContent).toContain("You call Liar on Cora’s bid");
    unmount();

    render(<ChallengeSplash resolution={callOn({ name: "You", human: true }, { name: "Duke", human: false })} onDone={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Duke calls Liar on your bid");
  });

  it("moves on once after its hold time", () => {
    const onDone = vi.fn();
    render(<ChallengeSplash resolution={callOn({ name: "Cora", human: false }, { name: "Duke", human: false })} onDone={onDone} />, {
      wrapper: StrictWrapper,
    });
    act(() => vi.advanceTimersByTime(SPLASH_MS - 1));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(SPLASH_MS * 3));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
