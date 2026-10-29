import { describe, expect, it } from "vitest";
import { SHAKES, pickShake, type ShakeName } from "./sounds";

describe("pickShake", () => {
  it("never repeats the previous shake", () => {
    for (const last of SHAKES) {
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        expect(pickShake(last, () => r)).not.toBe(last);
      }
    }
  });

  it("uses all three shakes over a run, with no two in a row the same", () => {
    let last: ShakeName | null = null;
    const seen = new Set<ShakeName>();
    for (let i = 0; i < 200; i++) {
      const next = pickShake(last);
      expect(next).not.toBe(last);
      seen.add(next);
      last = next;
    }
    expect(seen.size).toBe(3);
  });
});
