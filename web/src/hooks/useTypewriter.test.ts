import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { preferReducedMotion } from "../test/motion";
import { StrictWrapper } from "../test/strictMode";
import { MS_PER_CHARACTER, useTypewriter } from "./useTypewriter";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("useTypewriter", () => {
  it("shows the whole text at once when inactive", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useTypewriter("3 × Fives", false, onDone), { wrapper: StrictWrapper });

    expect(result.current).toBe("3 × Fives");
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("types one character per tick and calls onDone once at the end", () => {
    const onDone = vi.fn();
    const text = "3 × Fives";
    const { result } = renderHook(() => useTypewriter(text, true, onDone), { wrapper: StrictWrapper });
    expect(result.current).toBe("");

    for (let i = 1; i <= text.length; i++) {
      act(() => vi.advanceTimersByTime(MS_PER_CHARACTER));
      expect(result.current).toBe(text.slice(0, i));
    }
    expect(onDone).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER * 5));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("stops when unmounted mid-typing", () => {
    const onDone = vi.fn();
    const { unmount } = renderHook(() => useTypewriter("3 × Fives", true, onDone), { wrapper: StrictWrapper });
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER * 2));

    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("starts over when the text changes", () => {
    const { result, rerender } = renderHook(({ text }) => useTypewriter(text, true, () => {}), {
      wrapper: StrictWrapper,
      initialProps: { text: "2 × Twos" },
    });
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER * 3));
    expect(result.current).toBe("2 ×");

    rerender({ text: "4 × Sixes" });
    expect(result.current).toBe("");
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER));
    expect(result.current).toBe("4");
  });

  it("calls the latest onDone even if it changed mid-typing", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ onDone }) => useTypewriter("1 × Ace", true, onDone), {
      wrapper: StrictWrapper,
      initialProps: { onDone: first },
    });
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER * 2));
    rerender({ onDone: second });
    act(() => vi.advanceTimersByTime(MS_PER_CHARACTER * 10));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("skips typing for users who prefer reduced motion", () => {
    preferReducedMotion();
    const onDone = vi.fn();
    const { result } = renderHook(() => useTypewriter("3 × Fives", true, onDone), { wrapper: StrictWrapper });

    expect(result.current).toBe("3 × Fives");
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
