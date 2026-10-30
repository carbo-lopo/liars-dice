import { describe, expect, it } from "vitest";
import { COUNTED_FIRST_SEMITONES, COUNTED_MAX_SEMITONES, SHAKES, countedSemitones, pickShake, type ShakeName } from "./sounds";

describe("countedSemitones", () => {
  it("starts below the recording and rises a semitone per counted die", () => {
    expect([0, 1, 2].map(countedSemitones)).toEqual([
      COUNTED_FIRST_SEMITONES,
      COUNTED_FIRST_SEMITONES + 1,
      COUNTED_FIRST_SEMITONES + 2,
    ]);
    expect(COUNTED_FIRST_SEMITONES).toBeLessThan(0);
  });

  it("stops rising at the ceiling", () => {
    const top = COUNTED_MAX_SEMITONES - COUNTED_FIRST_SEMITONES;
    expect(countedSemitones(top)).toBe(COUNTED_MAX_SEMITONES);
    expect(countedSemitones(top + 20)).toBe(COUNTED_MAX_SEMITONES);
  });
});

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
