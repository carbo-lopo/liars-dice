import type { Face } from "../types/face.js";

export function rollHand(count: number): Face[] {
  return Array.from({ length: count }, () => (Math.floor(Math.random() * 6) + 1) as Face);
}
