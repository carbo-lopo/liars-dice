import { useSyncExternalStore } from "react";

/** Screens this wide or narrower, in CSS pixels, get the phone layout. */
export const PHONE_MAX_WIDTH = 640;

const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`;

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia?.(PHONE_QUERY);
  query?.addEventListener?.("change", onChange);
  return () => query?.removeEventListener?.("change", onChange);
}

function isPhoneWidth(): boolean {
  return window.matchMedia?.(PHONE_QUERY).matches ?? false;
}

/** Whether the screen is narrow enough for the phone layout; follows rotation and resizing. */
export function usePhoneLayout(): boolean {
  return useSyncExternalStore(subscribe, isPhoneWidth, () => false);
}
