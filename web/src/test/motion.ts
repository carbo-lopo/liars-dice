import { vi } from "vitest";

/** Makes `prefers-reduced-motion: reduce` match for the rest of the test. */
export function preferReducedMotion(): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string) => ({ matches: query.includes("prefers-reduced-motion: reduce"), media: query }) as MediaQueryList,
  );
}
