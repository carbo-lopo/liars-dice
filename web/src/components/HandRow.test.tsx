import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_LANDING_MS, LANDING_GAP_MS, SETTLE_MS } from "../hooks/useDiceRoll";
import { StrictWrapper } from "../test/strictMode";
import { HandRow } from "./HandRow";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const labels = () => screen.getAllByRole("img").map((die) => die.getAttribute("aria-label"));

describe("HandRow", () => {
  it("announces spinning dice as rolling until each one lands", () => {
    const onRolled = vi.fn();
    render(<HandRow dice={[2, 5, 1]} onesWild rolling onRolled={onRolled} />, { wrapper: StrictWrapper });
    expect(labels()).toEqual(["Rolling die", "Rolling die", "Rolling die"]);

    act(() => vi.advanceTimersByTime(FIRST_LANDING_MS));
    expect(labels()).toEqual(["Two", "Rolling die", "Rolling die"]);

    act(() => vi.advanceTimersByTime(LANDING_GAP_MS * 2));
    expect(labels()).toEqual(["Two", "Five", "Ace"]);
    expect(onRolled).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(SETTLE_MS));
    expect(onRolled).toHaveBeenCalledTimes(1);
  });

  it("labels the dice that count toward the selected face, wild Aces included", () => {
    render(<HandRow dice={[5, 2, 1]} selectedFace={5} onesWild />, { wrapper: StrictWrapper });
    expect(labels()).toEqual(["Five, counts toward Fives", "Two", "Ace, counts toward Fives"]);
  });

  it("does not count Aces when they aren't wild", () => {
    render(<HandRow dice={[5, 1]} selectedFace={5} onesWild={false} />, { wrapper: StrictWrapper });
    expect(labels()).toEqual(["Five, counts toward Fives", "Ace"]);
  });
});
