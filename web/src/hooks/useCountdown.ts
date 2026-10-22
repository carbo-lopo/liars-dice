import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLatestRef } from "./useLatestRef.js";

/** How often the countdown advances; also how long the bar's shrink transition lasts. */
export const COUNTDOWN_TICK_MS = 100;

/**
 * Counts down `durationMs` while not `paused`, then calls `onDone` once.
 * Returns the fraction left, from 1 down to 0. A null duration means no
 * countdown (the fraction stays at 1); each new duration starts from full.
 */
export function useCountdown(durationMs: number | null, paused: boolean, onDone: () => void): number {
  const [elapsed, setElapsed] = useState(0);
  const onDoneRef = useLatestRef(onDone);
  const finishedRef = useRef(false);

  // Restart from full before paint whenever a countdown begins, ends or changes length.
  useLayoutEffect(() => {
    setElapsed(0);
    finishedRef.current = false;
  }, [durationMs]);

  useEffect(() => {
    if (durationMs === null || paused) return;
    const timer = window.setInterval(() => {
      setElapsed((e) => Math.min(e + COUNTDOWN_TICK_MS, durationMs));
    }, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(timer);
  }, [durationMs, paused]);

  useEffect(() => {
    if (durationMs === null || elapsed < durationMs || finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current();
  }, [durationMs, elapsed, onDoneRef]);

  return durationMs === null ? 1 : 1 - elapsed / durationMs;
}
