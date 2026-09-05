import type { Face } from "../types.js";

/**
 * Thin wrapper around Math.random so the engine's randomness can be swapped
 * out (e.g. for a seeded RNG in tests or simulations) without touching call
 * sites everywhere.
 */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

export function rollDie(rng: Rng = defaultRng): Face {
  return (Math.floor(rng() * 6) + 1) as Face;
}

export function rollHand(count: number, rng: Rng = defaultRng): Face[] {
  const hand: Face[] = [];
  for (let i = 0; i < count; i++) hand.push(rollDie(rng));
  return hand;
}

/**
 * Deterministic RNG (mulberry32) for reproducible tests/simulations.
 * Not cryptographically secure -- doesn't need to be, it's dice.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
