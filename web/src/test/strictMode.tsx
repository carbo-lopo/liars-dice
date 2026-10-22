import { StrictMode, type ReactNode } from "react";

/**
 * Renders under StrictMode, as the app does. In development StrictMode mounts,
 * unmounts and remounts every component once, so a hook that starts timers on
 * mount must clean them up or they run twice.
 */
export function StrictWrapper({ children }: { children: ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}
