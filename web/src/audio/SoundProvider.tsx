import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePageVisible } from "../hooks/usePageVisible.js";
import { useLatestRef } from "../hooks/useLatestRef.js";
import { useSettings } from "../settings/settings.js";
import { createMusicPlayer, createWebAudioPlayer, type MusicPlayer, type SoundPlayer } from "./player.js";
import { pickShake, type ShakeName, type SoundName } from "./sounds.js";

interface SoundApi {
  /** Plays an effect, if sound effects are on, optionally shifted in pitch. */
  playSound: (name: SoundName, semitones?: number) => void;
  /** Plays a dice shake, never the same one twice in a row. */
  playShake: () => void;
  /** Loops an effect, if sound effects are on, until the returned function is called. */
  startLoop: (name: SoundName) => () => void;
}

// Without a provider (e.g. a component rendered on its own in a test), everything is silent.
const SoundContext = createContext<SoundApi>({
  playSound: () => {},
  playShake: () => {},
  startLoop: () => () => {},
});

/** Events that count as a user gesture, which browsers require before audio can start. */
const GESTURES = ["pointerdown", "pointerup", "touchend", "click", "keydown"] as const;

export function useSound(): SoundApi {
  return useContext(SoundContext);
}

/**
 * Plays the game's sounds according to the player's settings. Audio starts
 * with the first pointer or key press, as browsers require. Every button press
 * clicks: buttons marked `data-sound="strong"` play the stronger click, and
 * `data-sound="none"` stays quiet. Nothing plays while the page is hidden.
 */
export function SoundProvider({
  children,
  player: givenPlayer,
  music: givenMusic,
}: {
  children: ReactNode;
  /** Replaces the Web Audio player, e.g. in tests. */
  player?: SoundPlayer;
  /** Replaces the background music player, e.g. in tests. */
  music?: MusicPlayer;
}) {
  const { settings } = useSettings();
  const [player] = useState(() => givenPlayer ?? createWebAudioPlayer());
  const [music] = useState(() => givenMusic ?? createMusicPlayer());
  const [unlocked, setUnlocked] = useState(false);
  const pageVisible = usePageVisible();
  // Effects only play while they're on and the page can be seen.
  const effectsOnRef = useLatestRef(settings.soundEffects && pageVisible);
  const musicWantedRef = useLatestRef(settings.music && pageVisible);
  const lastShakeRef = useRef<ShakeName | null>(null);

  useEffect(() => {
    const unlock = () => {
      player.unlock();
      // Some browsers (iOS Safari) only start media from inside the gesture
      // itself, so every press asks; it does nothing once the music is playing.
      if (musicWantedRef.current) music.setPlaying(true);
      setUnlocked(true);
    };
    const click = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest?.("button");
      if (!button || button.disabled || !effectsOnRef.current) return;
      const kind = button.dataset.sound;
      if (kind === "none") return;
      player.play(kind === "strong" ? "clickStrong" : "click");
    };
    // A touch only counts as a gesture once it ends, so the end of a press
    // unlocks as well as its start. Capture runs before React's handlers, while
    // the button is still as it was pressed.
    for (const type of GESTURES) window.addEventListener(type, unlock, true);
    window.addEventListener("click", click, true);
    return () => {
      for (const type of GESTURES) window.removeEventListener(type, unlock, true);
      window.removeEventListener("click", click, true);
    };
  }, [player, music, effectsOnRef, musicWantedRef]);

  useEffect(() => {
    music.setPlaying(settings.music && unlocked && pageVisible);
  }, [music, settings.music, unlocked, pageVisible]);

  // A hidden page holds the effects too, including a loop already playing.
  useEffect(() => player.setSuspended(!pageVisible), [player, pageVisible]);

  // Stop the music if the provider goes away.
  useEffect(() => () => music.setPlaying(false), [music]);

  const api = useMemo<SoundApi>(
    () => ({
      playSound: (name, semitones) => {
        if (effectsOnRef.current) player.play(name, semitones);
      },
      playShake: () => {
        if (!effectsOnRef.current) return;
        const shake = pickShake(lastShakeRef.current);
        lastShakeRef.current = shake;
        player.play(shake);
      },
      startLoop: (name) => (effectsOnRef.current ? player.loop(name) : () => {}),
    }),
    [player, effectsOnRef],
  );

  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}
