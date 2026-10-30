import { vi } from "vitest";

/** Makes the screen phone-sized for the rest of the test: width media queries match, others don't. */
export function stubPhoneScreen(): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: query.includes("max-width"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}
