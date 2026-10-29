import clickUrl from "../assets/sounds/click.mp3";
import clickStrongUrl from "../assets/sounds/click-strong.mp3";
import countedUrl from "../assets/sounds/counted.mp3";
import shake1Url from "../assets/sounds/dice-shake-1.mp3";
import shake2Url from "../assets/sounds/dice-shake-2.mp3";
import shake3Url from "../assets/sounds/dice-shake-3.mp3";
import dieLandUrl from "../assets/sounds/die-land.mp3";
import stampUrl from "../assets/sounds/stamp.mp3";
import musicUrl from "../assets/sounds/vibing-over-venus.mp3";

/** Every sound effect the game plays. Sources and licences are in CREDITS.md. */
export const SOUND_URLS = {
  /** Any ordinary button. */
  click: clickUrl,
  /** Placing a bid or calling Liar. */
  clickStrong: clickStrongUrl,
  /** A die landing at the end of the round's roll. */
  dieLand: dieLandUrl,
  /** A revealed die that counts toward the bid. */
  counted: countedUrl,
  /** The LIAR! stamp landing. */
  stamp: stampUrl,
  shake1: shake1Url,
  shake2: shake2Url,
  shake3: shake3Url,
} as const;

export type SoundName = keyof typeof SOUND_URLS;

/** The dice shakes heard as a round's roll starts. */
export const SHAKES = ["shake1", "shake2", "shake3"] as const satisfies readonly SoundName[];
export type ShakeName = (typeof SHAKES)[number];

/** A shake picked at random, never the same as `last`, so no shake plays twice in a row. */
export function pickShake(last: ShakeName | null, random: () => number = Math.random): ShakeName {
  const options = SHAKES.filter((shake) => shake !== last);
  return options[Math.floor(random() * options.length)] ?? options[0]!;
}

export const MUSIC_URL = musicUrl;

/** The music sits under the effects. */
export const MUSIC_VOLUME = 0.35;
