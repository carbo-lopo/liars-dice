import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the latest `value`, for timers and other callbacks
 * that outlive the render they were scheduled in. It is updated after each
 * commit rather than during render, so a render React discards never leaks in.
 */
export function useLatestRef<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
