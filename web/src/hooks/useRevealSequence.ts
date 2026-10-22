import { useEffect, useLayoutEffect, useState } from "react";
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

/**
 * Turns dice face up one at a time while `active`, hand after hand in the
 * order given by `handSizes`, then shows the verdict. When inactive, or for
 * users who prefer reduced motion, everything is shown at once.
 */
export function useRevealSequence(handSizes: readonly number[], active: boolean): RevealSequence {
  const total = handSizes.reduce((sum, n) => sum + n, 0);
  const sizesKey = handSizes.join(",");
  const animate = active && !prefersReducedMotion();
  const [state, setState] = useState<RevealSequence>(() =>
    animate ? { revealed: 0, verdictShown: false } : { revealed: total, verdictShown: true },
  );

  // Reset before paint so dice never flash face up before the sequence starts.
  useLayoutEffect(() => {
    setState(animate ? { revealed: 0, verdictShown: false } : { revealed: total, verdictShown: true });
  }, [animate, sizesKey, total]);

  useEffect(() => {
    if (!animate) return;
    const timers: number[] = [];
    let at = FIRST_REVEAL_MS;
    let revealed = 0;
    handSizes.forEach((size, hand) => {
      if (hand > 0) at += NEXT_HAND_MS;
      for (let i = 0; i < size; i++) {
        revealed += 1;
        const count = revealed;
        timers.push(window.setTimeout(() => setState({ revealed: count, verdictShown: false }), at));
        at += REVEAL_GAP_MS;
      }
    });
    const lastReveal = at - REVEAL_GAP_MS;
    timers.push(window.setTimeout(() => setState({ revealed: total, verdictShown: true }), lastReveal + VERDICT_MS));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // handSizes is read through sizesKey so a new array with the same sizes doesn't restart the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, sizesKey, total]);

  return state;
}
