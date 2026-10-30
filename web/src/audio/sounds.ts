import bidFalseUrl from "../assets/sounds/bid-false.mp3";
import bidTrueUrl from "../assets/sounds/bid-true.mp3";
import clickUrl from "../assets/sounds/click.mp3";
import clickStrongUrl from "../assets/sounds/click-strong.mp3";
import countedUrl from "../assets/sounds/counted.mp3";
import shake1Url from "../assets/sounds/dice-shake-1.mp3";
import shake2Url from "../assets/sounds/dice-shake-2.mp3";
import shake3Url from "../assets/sounds/dice-shake-3.mp3";
import dieLandUrl from "../assets/sounds/die-land.mp3";
import notCountedUrl from "../assets/sounds/not-counted.mp3";
import stampUrl from "../assets/sounds/stamp.mp3";
import typingUrl from "../assets/sounds/typing.mp3";
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
  /** A revealed die that doesn't count. */
  notCounted: notCountedUrl,
  /** The LIAR! stamp landing. */
  stamp: stampUrl,
  /** The verdict on a reveal: the called bid was true. */
  bidTrue: bidTrueUrl,
  /** The verdict on a reveal: the called bid was a bluff. */
  bidFalse: bidFalseUrl,
  /** Keystrokes, looped while a bot's bid types out. */
  typing: typingUrl,
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

/** How far, in semitones, the first counted die's chime is pitched below the recording. */
export const COUNTED_FIRST_SEMITONES = -8;
/** The highest a counted die's chime goes, in semitones above the recording. */
export const COUNTED_MAX_SEMITONES = 4;

/**
 * The pitch of the chime for a reveal's `index`th counted die (from 0): each one
 * a semitone above the last, up to a ceiling so a big reveal doesn't climb too far.
 */
export function countedSemitones(index: number): number {
  return Math.min(COUNTED_FIRST_SEMITONES + index, COUNTED_MAX_SEMITONES);
}

export const MUSIC_URL = musicUrl;

/** The music sits under the effects. */
export const MUSIC_VOLUME = 0.35;
