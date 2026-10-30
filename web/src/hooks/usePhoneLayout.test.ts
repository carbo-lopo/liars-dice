import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PHONE_MAX_WIDTH, usePhoneLayout } from "./usePhoneLayout";

/** A screen whose width can change, reporting changes the way matchMedia does. */
function resizableScreen(width: number) {
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      const max = Number(/max-width: (\d+)px/.exec(query)?.[1] ?? Infinity);
      return width <= max;
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    resize(next: number) {
      width = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

describe("usePhoneLayout", () => {
  it("is on at phone widths and off above them", () => {
    resizableScreen(PHONE_MAX_WIDTH);
    expect(renderHook(() => usePhoneLayout()).result.current).toBe(true);
    resizableScreen(PHONE_MAX_WIDTH + 1);
    expect(renderHook(() => usePhoneLayout()).result.current).toBe(false);
  });

  it("follows the screen as it's resized or rotated", () => {
    const screen = resizableScreen(390);
    const { result } = renderHook(() => usePhoneLayout());
    expect(result.current).toBe(true);
    screen.resize(844);
    expect(result.current).toBe(false);
    screen.resize(390);
    expect(result.current).toBe(true);
  });

  it("is off where the browser can't tell", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => usePhoneLayout()).result.current).toBe(false);
  });
});
