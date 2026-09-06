import type { Face } from "@engine/types.js";

// "Aces" for 1s (they're wild outside Palifico rounds) matches the language
// used throughout the approved mockups; every other face is just its plural.
const PLURAL_NAMES: Record<Face, string> = {
  1: "Aces",
  2: "Twos",
  3: "Threes",
  4: "Fours",
  5: "Fives",
  6: "Sixes",
};

const SINGULAR_NAMES: Record<Face, string> = {
  1: "Ace",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
};

/** Generic category name for a face (e.g. a face-picker button/tooltip) -- always plural. */
export function faceName(face: Face): string {
  return PLURAL_NAMES[face];
}

/** Name to use when the face is attached to a specific count ("1 Five" vs "4 Fives"). */
export function faceNameForCount(face: Face, count: number): string {
  return count === 1 ? SINGULAR_NAMES[face] : PLURAL_NAMES[face];
}

export function bidLabel(quantity: number, face: Face): string {
  return `${quantity} × ${faceNameForCount(face, quantity)}`;
}
