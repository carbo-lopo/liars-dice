import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preferReducedMotion } from "../test/motion";
import { StrictWrapper } from "../test/strictMode";
import { FIRST_REVEAL_MS, NEXT_HAND_MS, REVEAL_GAP_MS, VERDICT_MS, useRevealSequence } from "./useRevealSequence";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function renderSequence(handSizes: number[], active = true) {
  return renderHook(({ speed, paused }) => useRevealSequence(handSizes, active, speed, paused), {
    wrapper: StrictWrapper,
    initialProps: { speed: 1, paused: false },
  });
}

describe("useRevealSequence", () => {
  it("turns dice up one at a time, pausing between hands, then shows the verdict", () => {
    const { result } = renderSequence([2, 1]);
    expect(result.current).toEqual({ revealed: 0, verdictShown: false });

    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS));
    expect(result.current.revealed).toBe(1);
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS));
    expect(result.current.revealed).toBe(2);

    // The second hand waits for the gap plus the pause between hands.
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS));
    expect(result.current.revealed).toBe(2);
    act(() => vi.advanceTimersByTime(NEXT_HAND_MS));
    expect(result.current.revealed).toBe(3);
    expect(result.current.verdictShown).toBe(false);

    act(() => vi.advanceTimersByTime(VERDICT_MS - 1));
    expect(result.current.verdictShown).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toEqual({ revealed: 3, verdictShown: true });
  });

  it("divides every pause by the speed", () => {
    const { result, rerender } = renderSequence([2, 1]);
    rerender({ speed: 2, paused: false });
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS / 2));
    expect(result.current.revealed).toBe(1);
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS / 2 + (REVEAL_GAP_MS + NEXT_HAND_MS) / 2));
    expect(result.current.revealed).toBe(3);
    act(() => vi.advanceTimersByTime(VERDICT_MS / 2));
    expect(result.current.verdictShown).toBe(true);
  });

  it("carries on from the current die when the speed changes part-way", () => {
    const { result, rerender } = renderSequence([3]);
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS + REVEAL_GAP_MS));
    expect(result.current.revealed).toBe(2);

    rerender({ speed: 2, paused: false });
    expect(result.current.revealed).toBe(2);
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS / 2));
    expect(result.current.revealed).toBe(3);
  });

  it("keeps the part of a pause already waited when the speed changes", () => {
    const { result, rerender } = renderSequence([3]);
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS + REVEAL_GAP_MS / 2));
    expect(result.current.revealed).toBe(1);

    // Half the gap is left; at double speed that takes a quarter of it.
    rerender({ speed: 2, paused: false });
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS / 4 - 1));
    expect(result.current.revealed).toBe(1);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.revealed).toBe(2);
  });

  it("holds while paused and resumes with the rest of the pause", () => {
    const { result, rerender } = renderSequence([3]);
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS + REVEAL_GAP_MS / 2));
    expect(result.current.revealed).toBe(1);

    rerender({ speed: 1, paused: true });
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.revealed).toBe(1);

    rerender({ speed: 1, paused: false });
    act(() => vi.advanceTimersByTime(REVEAL_GAP_MS / 2 - 1));
    expect(result.current.revealed).toBe(1);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.revealed).toBe(2);
  });

  it("doesn't start while paused from the beginning", () => {
    const { result, rerender } = renderSequence([2]);
    rerender({ speed: 1, paused: true });
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.revealed).toBe(0);
    rerender({ speed: 2, paused: false });
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS / 2));
    expect(result.current.revealed).toBe(1);
  });

  it("shows everything at once when inactive", () => {
    const { result } = renderSequence([5, 4, 3], false);
    expect(result.current).toEqual({ revealed: 12, verdictShown: true });
  });

  it("shows everything at once for users who prefer reduced motion", () => {
    preferReducedMotion();
    const { result } = renderSequence([5, 4]);
    expect(result.current).toEqual({ revealed: 9, verdictShown: true });
  });

  it("stops when unmounted part-way", () => {
    const { unmount } = renderSequence([3, 3]);
    act(() => vi.advanceTimersByTime(FIRST_REVEAL_MS));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
