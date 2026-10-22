import { onTestFinished, vi } from "vitest";

/**
 * For a test that expects rendering to throw: React logs the error and jsdom
 * reports it as uncaught before the throw reaches the test, which only adds
 * noise. This silences both for the rest of the test.
 */
export function silenceExpectedRenderErrors(): void {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const swallow = (event: ErrorEvent) => event.preventDefault();
  window.addEventListener("error", swallow);
  onTestFinished(() => window.removeEventListener("error", swallow));
}
