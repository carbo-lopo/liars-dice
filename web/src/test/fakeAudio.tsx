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
  const player: SoundPlayer = { unlock: vi.fn(), play: (name) => played.push(name) };
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
  return { played, player, music, Wrapper };
}
