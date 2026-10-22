import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preferReducedMotion } from "../test/motion";
import { StrictWrapper } from "../test/strictMode";
import { FIRST_LANDING_MS, LANDING_GAP_MS, SETTLE_MS, SPIN_FRAME_MS, useDiceRoll } from "./useDiceRoll";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useDiceRoll", () => {
  it("lands the dice one at a time, then calls onDone after they settle", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDiceRoll(3, true, onDone), { wrapper: StrictWrapper });
    expect(result.current.landed).toBe(0);

    act(() => vi.advanceTimersByTime(FIRST_LANDING_MS - 1));
    expect(result.current.landed).toBe(0);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.landed).toBe(1);

    act(() => vi.advanceTimersByTime(LANDING_GAP_MS));
    expect(result.current.landed).toBe(2);
    act(() => vi.advanceTimersByTime(LANDING_GAP_MS));
    expect(result.current.landed).toBe(3);

    act(() => vi.advanceTimersByTime(SETTLE_MS - 1));
    expect(onDone).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows new random faces while spinning and stops once the last die lands", () => {
    const { result } = renderHook(() => useDiceRoll(2, true, () => {}), { wrapper: StrictWrapper });
    const first = result.current.spinFaces;
    expect(first).toHaveLength(2);
    expect(first.every((f) => f >= 1 && f <= 6)).toBe(true);

    act(() => vi.advanceTimersByTime(SPIN_FRAME_MS));
    expect(result.current.spinFaces).not.toBe(first);

    act(() => vi.advanceTimersByTime(FIRST_LANDING_MS + LANDING_GAP_MS));
    const settled = result.current.spinFaces;
    act(() => vi.advanceTimersByTime(SPIN_FRAME_MS * 5));
    expect(result.current.spinFaces).toBe(settled);
  });

  it("stops when unmounted mid-roll", () => {
    const onDone = vi.fn();
    const { unmount } = renderHook(() => useDiceRoll(3, true, onDone), { wrapper: StrictWrapper });
    act(() => vi.advanceTimersByTime(FIRST_LANDING_MS));

    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("shows every die landed and never calls onDone when inactive", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDiceRoll(4, false, onDone), { wrapper: StrictWrapper });

    expect(result.current.landed).toBe(4);
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("finishes at once for a roll of no dice", () => {
    const onDone = vi.fn();
    renderHook(() => useDiceRoll(0, true, onDone), { wrapper: StrictWrapper });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("skips the roll for users who prefer reduced motion", () => {
    preferReducedMotion();
    const onDone = vi.fn();
    const { result } = renderHook(() => useDiceRoll(5, true, onDone), { wrapper: StrictWrapper });

    expect(result.current.landed).toBe(5);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
