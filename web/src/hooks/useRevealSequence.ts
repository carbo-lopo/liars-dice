import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/motion.js";

/** Pause before the first die is turned over. */
export const FIRST_REVEAL_MS = 1200;
/** Gap between one die being turned over and the next. */
export const REVEAL_GAP_MS = 800;
/** Extra pause when the reveal moves on to the next player's hand. */
export const NEXT_HAND_MS = 600;
/** Pause after the last die before the verdict appears. */
export const VERDICT_MS = 1000;

export interface RevealSequence {
  /** How many dice are face up, counting across the hands in order. */
  revealed: number;
  /** Every die is up and the verdict can be shown. */
  verdictShown: boolean;
}

/** How much faster the reveal runs with fast-forward on. */
export const FAST_FORWARD_SPEED = 2;

/**
 * Turns dice face up one at a time while `active`, hand after hand in the
 * order given by `handSizes`, then shows the verdict. Every pause is divided
 * by `speed`; changing it reschedules what's left from the current die. When
 * inactive, or for users who prefer reduced motion, everything is shown at
 * once.
 */
export function useRevealSequence(handSizes: readonly number[], active: boolean, speed = 1): RevealSequence {
  const total = handSizes.reduce((sum, n) => sum + n, 0);
  const sizesKey = handSizes.join(",");
  const animate = active && !prefersReducedMotion();
  const initial = (): RevealSequence =>
    animate ? { revealed: 0, verdictShown: false } : { revealed: total, verdictShown: true };
  const [state, setState] = useState<RevealSequence>(initial);
  // Where the sequence has got to, when the current pause began (`since`) and
  // the speed it has run at since then, so that a speed change keeps the part
  // of the pause already waited instead of starting it again.
  const progressRef = useRef({ state, since: Date.now(), speed });

  const show = (next: RevealSequence) => {
    progressRef.current = { state: next, since: Date.now(), speed: progressRef.current.speed };
    setState(next);
  };

  // Reset before paint so dice never flash face up before the sequence starts.
  useLayoutEffect(() => {
    progressRef.current = { state: initial(), since: Date.now(), speed };
    setState(progressRef.current.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, sizesKey, total]);

  useEffect(() => {
    const progress = progressRef.current;
    if (!animate || progress.state.verdictShown) return;
    // Time already waited toward the next step counts at the speed it was waited at.
    const now = Date.now();
    let waited = (now - progress.since) * progress.speed;
    progressRef.current = { ...progress, since: now, speed };

    const handStarts = new Set(handSizes.map((_, hand) => handSizes.slice(0, hand).reduce((a, n) => a + n, 0)));
    const pauseFor = (step: number) =>
      step === total
        ? VERDICT_MS
        : step === 0
          ? FIRST_REVEAL_MS
          : REVEAL_GAP_MS + (handStarts.has(step) ? NEXT_HAND_MS : 0);
    const timers: number[] = [];
    let at = 0;
    for (let revealed = progress.state.revealed; revealed < total; revealed++) {
      at += Math.max(0, pauseFor(revealed) - waited) / speed;
      waited = 0;
      const next = { revealed: revealed + 1, verdictShown: false };
      timers.push(window.setTimeout(() => show(next), at));
    }
    at += Math.max(0, pauseFor(total) - waited) / speed;
    timers.push(window.setTimeout(() => show({ revealed: total, verdictShown: true }), at));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // handSizes is read through sizesKey so a new array with the same sizes doesn't restart the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, sizesKey, total, speed]);

  return state;
}
