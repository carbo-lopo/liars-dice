import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Face } from "@engine/types/face.js";
import { prefersReducedMotion } from "../lib/motion.js";
import { useLatestRef } from "./useLatestRef.js";

/** How often a still-spinning die shows a new random face. */
export const SPIN_FRAME_MS = 200;
/** When the first (leftmost) die lands, counted from the start of the roll. */
export const FIRST_LANDING_MS = 1000;
/** Gap between one die landing and the next. */
export const LANDING_GAP_MS = 400;
/** Pause after the last die lands before the roll counts as finished. */
export const SETTLE_MS = 500;

function randomFaces(count: number): Face[] {
  return Array.from({ length: count }, () => (Math.floor(Math.random() * 6) + 1) as Face);
}

export interface DiceRoll {
  /** How many dice, from the left, have landed on their real value. */
  landed: number;
  /** Random faces to show on the dice that are still spinning. */
  spinFaces: readonly Face[];
}

/**
 * Animates rolling `count` dice while `active` is true: every die spins
 * through random faces, then they land one at a time from left to right, and
 * `onDone` fires once after the last has settled. Users who ask for reduced
 * motion, or a roll of no dice, skip straight to `onDone`.
 */
export function useDiceRoll(count: number, active: boolean, onDone: () => void): DiceRoll {
  const [landed, setLanded] = useState(active ? 0 : count);
  const [spinFaces, setSpinFaces] = useState<Face[]>(() => randomFaces(count));
  const onDoneRef = useLatestRef(onDone);
  // Whether this roll has already finished. StrictMode re-runs effects on
  // mount; this keeps onDone to one call per roll.
  const finishedRef = useRef(false);

  // Reset before paint so the real faces never flash before the roll starts.
  useLayoutEffect(() => {
    setLanded(active && count > 0 && !prefersReducedMotion() ? 0 : count);
  }, [active, count]);

  useEffect(() => {
    if (!active) {
      finishedRef.current = false;
      return;
    }
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onDoneRef.current();
    };
    if (count === 0 || prefersReducedMotion()) {
      finish();
      return;
    }
    const spin = window.setInterval(() => setSpinFaces(randomFaces(count)), SPIN_FRAME_MS);
    const timers = Array.from({ length: count }, (_, i) =>
      window.setTimeout(() => setLanded(i + 1), FIRST_LANDING_MS + i * LANDING_GAP_MS),
    );
    const lastLanding = FIRST_LANDING_MS + (count - 1) * LANDING_GAP_MS;
    timers.push(window.setTimeout(() => window.clearInterval(spin), lastLanding));
    timers.push(window.setTimeout(finish, lastLanding + SETTLE_MS));
    return () => {
      window.clearInterval(spin);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [active, count]);

  return { landed, spinFaces };
}
