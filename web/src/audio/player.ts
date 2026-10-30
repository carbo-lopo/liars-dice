import { MUSIC_URL, MUSIC_VOLUME, SOUND_URLS, type SoundName } from "./sounds.js";

/** Plays sound effects; does nothing until unlocked by a user gesture. */
export interface SoundPlayer {
  /** Call from a user gesture: browsers keep audio off until the first one. */
  unlock(): void;
  /** `semitones` shifts the pitch (and, with it, the speed) from the recording. */
  play(name: SoundName, semitones?: number): void;
  /** Loops `name` from a random point until the returned function is called, which fades it out. */
  loop(name: SoundName): () => void;
  /** Holds all sound, including any already playing, e.g. while the page is hidden. */
  setSuspended(suspended: boolean): void;
}

/** Plays or pauses the looping background music. */
export interface MusicPlayer {
  setPlaying(playing: boolean): void;
}

/** How long a loop takes to fade out when stopped, so it doesn't end with a click. */
const LOOP_FADE_S = 0.04;

/**
 * Sound effects through the Web Audio API: each file is fetched and decoded
 * once, and every play starts a fresh source, so a sound can overlap itself.
 * Where Web Audio isn't available, it stays silent.
 */
export function createWebAudioPlayer(): SoundPlayer {
  const supported = typeof AudioContext !== "undefined";
  let context: AudioContext | null = null;
  let suspended = false;
  const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

  const load = (ctx: AudioContext, name: SoundName) => {
    let buffer = buffers.get(name);
    if (!buffer) {
      buffer = fetch(SOUND_URLS[name])
        .then((response) => response.arrayBuffer())
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => {
          // Forget the failure, so a later play tries again.
          buffers.delete(name);
          return null;
        });
      buffers.set(name, buffer);
    }
    return buffer;
  };

  return {
    unlock() {
      if (!supported) return;
      context ??= new AudioContext();
      // iOS Safari can also leave it "interrupted", e.g. after a phone call.
      if (context.state !== "running" && !suspended) void context.resume();
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
    loop(name) {
      const ctx = context;
      if (!ctx) return () => {};
      let stopped = false;
      let fadeOut: (() => void) | null = null;
      void load(ctx, name).then((buffer) => {
        // Stopped before the sound had loaded: never start it.
        if (!buffer || stopped) return;
        const gain = ctx.createGain();
        gain.connect(ctx.destination);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.connect(gain);
        source.start(0, Math.random() * buffer.duration);
        fadeOut = () => {
          const now = ctx.currentTime;
          gain.gain.setValueAtTime(gain.gain.value, now);
          gain.gain.linearRampToValueAtTime(0, now + LOOP_FADE_S);
          source.stop(now + LOOP_FADE_S);
        };
      });
      return () => {
        if (stopped) return;
        stopped = true;
        fadeOut?.();
      };
    },
    setSuspended(value) {
      suspended = value;
      if (!context) return;
      void (suspended ? context.suspend() : context.resume());
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
