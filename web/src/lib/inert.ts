/**
 * Props that make an element and everything inside it unreachable by keyboard
 * and hidden from screen readers while `on`. React 18 doesn't know the `inert`
 * attribute, so it's passed through as a plain string attribute.
 */
export function inertWhen(on: boolean): Record<string, string> {
  return on ? { inert: "" } : {};
}
