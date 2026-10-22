import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StrictWrapper } from "../test/strictMode";
import { COUNTDOWN_TICK_MS, useCountdown } from "./useCountdown";

const DURATION = 1000;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

function renderCountdown(initial: { durationMs: number | null; paused: boolean }, onDone = vi.fn()) {
  const hook = renderHook(({ durationMs, paused }) => useCountdown(durationMs, paused, onDone), {
    wrapper: StrictWrapper,
    initialProps: initial,
  });
  return { ...hook, onDone };
}

describe("useCountdown", () => {
  it("counts down from full and calls onDone once at the end", () => {
    const { result, onDone } = renderCountdown({ durationMs: DURATION, paused: false });
    expect(result.current).toBe(1);

    act(() => vi.advanceTimersByTime(DURATION / 2));
    expect(result.current).toBeCloseTo(0.5);
    expect(onDone).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(DURATION / 2));
    expect(result.current).toBe(0);
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(DURATION * 3));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("holds while paused and carries on from the same point", () => {
    const { result, rerender, onDone } = renderCountdown({ durationMs: DURATION, paused: false });
    act(() => vi.advanceTimersByTime(300));

    rerender({ durationMs: DURATION, paused: true });
    act(() => vi.advanceTimersByTime(DURATION * 5));
    expect(result.current).toBeCloseTo(0.7);
    expect(onDone).not.toHaveBeenCalled();

    rerender({ durationMs: DURATION, paused: false });
    act(() => vi.advanceTimersByTime(700));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("does nothing without a duration", () => {
    const { result, onDone } = renderCountdown({ durationMs: null, paused: false });
    act(() => vi.advanceTimersByTime(DURATION * 5));
    expect(result.current).toBe(1);
    expect(onDone).not.toHaveBeenCalled();
  });

  it("starts each new countdown from full", () => {
    const { result, rerender, onDone } = renderCountdown({ durationMs: DURATION, paused: false });
    act(() => vi.advanceTimersByTime(DURATION));
    expect(onDone).toHaveBeenCalledTimes(1);

    rerender({ durationMs: null, paused: false });
    rerender({ durationMs: DURATION, paused: false });
    expect(result.current).toBe(1);
    act(() => vi.advanceTimersByTime(DURATION));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("stops when unmounted", () => {
    const { unmount, onDone } = renderCountdown({ durationMs: DURATION, paused: false });
    act(() => vi.advanceTimersByTime(COUNTDOWN_TICK_MS * 2));
    unmount();
    act(() => vi.advanceTimersByTime(DURATION * 2));
    expect(onDone).not.toHaveBeenCalled();
  });
});
