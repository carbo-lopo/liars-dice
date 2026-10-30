import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MS_PER_CHARACTER } from "../hooks/useTypewriter";
import { bidLabel } from "../lib/faceNames";
import { fakeAudio } from "../test/fakeAudio";
import { preferReducedMotion } from "../test/motion";
import { CurrentBidCard } from "./BidCards";

const bid = { quantity: 3, face: 5 } as const;
const TYPING_MS = bidLabel(bid.quantity, bid.face).length * MS_PER_CHARACTER;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("CurrentBidCard", () => {
  it("plays keystrokes while the bid types out, and stops as it finishes", () => {
    const { looping, Wrapper } = fakeAudio();
    render(<CurrentBidCard bid={bid} bidderName="Cora" actorName="You" typing />, { wrapper: Wrapper });
    expect(looping).toEqual(["typing"]);
    act(() => vi.advanceTimersByTime(TYPING_MS - MS_PER_CHARACTER));
    expect(looping).toEqual(["typing"]);
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER));
    expect(looping).toEqual([]);
  });

  it("plays no keystrokes for a bid shown at once", () => {
    const { looping, Wrapper } = fakeAudio();
    render(<CurrentBidCard bid={bid} bidderName="Cora" actorName="You" />, { wrapper: Wrapper });
    expect(looping).toEqual([]);
  });

  it("plays no keystrokes with reduced motion, where the bid appears whole", () => {
    preferReducedMotion();
    const { looping, Wrapper } = fakeAudio();
    render(<CurrentBidCard bid={bid} bidderName="Cora" actorName="You" typing />, { wrapper: Wrapper });
    expect(looping).toEqual([]);
  });

  it("stops the keystrokes if the card goes away mid-bid", () => {
    const { looping, Wrapper } = fakeAudio();
    const view = render(<CurrentBidCard bid={bid} bidderName="Cora" actorName="You" typing />, { wrapper: Wrapper });
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER));
    view.unmount();
    expect(looping).toEqual([]);
  });
});
