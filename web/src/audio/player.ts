import { MUSIC_URL, MUSIC_VOLUME, SOUND_URLS, type SoundName } from "./sounds.js";

/** Plays sound effects; does nothing until unlocked by a user gesture. */
export interface SoundPlayer {
  /** Call from a user gesture: browsers keep audio off until the first one. */
  unlock(): void;
  /** `semitones` shifts the pitch (and, with it, the speed) from the recording. */
  play(name: SoundName, semitones?: number): void;
}

/** Plays or pauses the looping background music. */
export interface MusicPlayer {
  setPlaying(playing: boolean): void;
}

type AudioContextClass = typeof AudioContext;

function audioContextClass(): AudioContextClass | null {
  if (typeof AudioContext !== "undefined") return AudioContext;
  // Older Safari only has the prefixed constructor.
  return (window as Window & { webkitAudioContext?: AudioContextClass }).webkitAudioContext ?? null;
}

/**
 * Sound effects through the Web Audio API: each file is fetched and decoded
 * once, and every play starts a fresh source, so a sound can overlap itself.
 * Where Web Audio isn't available, it stays silent.
 */
export function createWebAudioPlayer(): SoundPlayer {
  const Context = audioContextClass();
  let context: AudioContext | null = null;
  const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

  const load = (ctx: AudioContext, name: SoundName) => {
    let buffer = buffers.get(name);
    if (!buffer) {
      buffer = fetch(SOUND_URLS[name])
        .then((response) => response.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => null);
      buffers.set(name, buffer);
    }
    return buffer;
  };

  return {
    unlock() {
      if (!Context) return;
      context ??= new Context();
      if (context.state === "suspended") void context.resume();
      for (const name of Object.keys(SOUND_URLS) as SoundName[]) void load(context, name);
    },
    play(name, semitones = 0) {
      const ctx = context;
      if (!ctx) return;
      void load(ctx, name).then((buffer) => {
        if (!buffer) return;
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 2 ** (semitones / 12);
        source.connect(ctx.destination);
        source.start();
      });
    },
  };
}

/** The background track, looping; it is only downloaded once it first plays. */
export function createMusicPlayer(): MusicPlayer {
  let audio: HTMLAudioElement | null = null;
  return {
    setPlaying(playing) {
      if (!playing) {
        audio?.pause();
        return;
      }
      if (!audio) {
        audio = new Audio(MUSIC_URL);
        audio.loop = true;
        audio.volume = MUSIC_VOLUME;
      }
      // Browsers refuse to play before a user gesture; the next unlock tries again.
      audio.play().catch(() => {});
    },
  };
}
