import { useEffect, useLayoutEffect, useRef, useState } from "react";

const MS_PER_CHARACTER = 70;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Reveals `text` one character at a time while `active` is true, then calls
 * `onDone` once. When inactive, the full text is shown immediately. Users who
 * ask for reduced motion get the full text at once, and `onDone` still fires.
 */
export function useTypewriter(text: string, active: boolean, onDone: () => void): string {
  const [shown, setShown] = useState(active ? 0 : text.length);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Reset before paint so the finished text never flashes before typing starts.
  useLayoutEffect(() => {
    setShown(active && !prefersReducedMotion() ? 0 : text.length);
  }, [text, active]);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion()) {
      onDoneRef.current();
      return;
    }
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setShown(count);
      if (count >= text.length) {
        window.clearInterval(timer);
        onDoneRef.current();
      }
    }, MS_PER_CHARACTER);
    return () => window.clearInterval(timer);
  }, [text, active]);

  return text.slice(0, shown);
}
