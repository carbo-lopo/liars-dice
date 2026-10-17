import { vi } from "vitest";

/**
 * Replaces Math.random with a deterministic generator (mulberry32) so a test
 * plays out identically on every run. Undo with vi.restoreAllMocks().
 */
export function seedMathRandom(seed: number): void {
  let state = seed >>> 0;
  vi.spyOn(Math, "random").mockImplementation(() => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  });
}
