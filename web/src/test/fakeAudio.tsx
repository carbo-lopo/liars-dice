import type { ReactNode } from "react";
import { vi } from "vitest";
import { SoundProvider } from "../audio/SoundProvider";
import type { MusicPlayer, SoundPlayer } from "../audio/player";
import type { SoundName } from "../audio/sounds";
import { SettingsProvider } from "../settings/settings";
import { StrictWrapper } from "./strictMode";

/** A sound player that records what it was asked to play, instead of making noise. */
export function fakeAudio() {
  const played: SoundName[] = [];
  /** The pitch shift asked for with each entry in `played` (0 when none was given). */
  const semitones: number[] = [];
  const player: SoundPlayer = {
    unlock: vi.fn(),
    play: (name, shift = 0) => {
      played.push(name);
      semitones.push(shift);
    },
  };
  const music = { setPlaying: vi.fn() } satisfies MusicPlayer;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <StrictWrapper>
      <SettingsProvider>
        <SoundProvider player={player} music={music}>
          {children}
        </SoundProvider>
      </SettingsProvider>
    </StrictWrapper>
  );
  return { played, semitones, player, music, Wrapper };
}
