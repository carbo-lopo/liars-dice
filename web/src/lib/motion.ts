/** Whether the user has asked their system to reduce motion; animations then skip to their end state. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
