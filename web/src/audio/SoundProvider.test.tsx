import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS } from "../settings/settings";
import { fakeAudio } from "../test/fakeAudio";
import { useSound } from "./SoundProvider";

afterEach(() => {
  window.localStorage.clear();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
});

function saveSettings(changes: Partial<typeof DEFAULT_SETTINGS>) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...changes }));
}

function renderButtons() {
  const audio = fakeAudio();
  render(
    <div>
      <button type="button">Rules</button>
      <button type="button" data-sound="strong">
        Place Bid
      </button>
      <button type="button" disabled>
        Disabled
      </button>
      <button type="button" data-sound="none">
        Quiet
      </button>
      <span>Not a button</span>
    </div>,
    { wrapper: audio.Wrapper },
  );
  return audio;
}

describe("SoundProvider", () => {
  it("clicks for ordinary buttons and plays the strong click where asked", () => {
    const { played } = renderButtons();
    fireEvent.click(screen.getByText("Rules"));
    fireEvent.click(screen.getByText("Place Bid"));
    expect(played).toEqual(["click", "clickStrong"]);
  });

  it("stays quiet for disabled buttons, silenced buttons and anything else", () => {
    const { played } = renderButtons();
    fireEvent.click(screen.getByText("Disabled"));
    fireEvent.click(screen.getByText("Quiet"));
    fireEvent.click(screen.getByText("Not a button"));
    expect(played).toEqual([]);
  });

  it("plays nothing with sound effects switched off", () => {
    saveSettings({ soundEffects: false });
    const { played, Wrapper } = fakeAudio();
    const { result } = renderHook(() => useSound(), { wrapper: Wrapper });
    act(() => result.current.playSound("stamp"));
    act(() => result.current.playShake());
    render(<button type="button">Rules</button>, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("Rules"));
    expect(played).toEqual([]);
  });

  it("unlocks audio and starts the music on the first press", () => {
    const { player, music } = renderButtons();
    expect(music.setPlaying).not.toHaveBeenLastCalledWith(true);
    fireEvent.pointerDown(screen.getByText("Rules"));
    expect(player.unlock).toHaveBeenCalled();
    expect(music.setPlaying).toHaveBeenLastCalledWith(true);
  });

  it("unlocks from the keyboard too", () => {
    const { player } = renderButtons();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(player.unlock).toHaveBeenCalled();
  });

  it("keeps the music off when it's switched off", () => {
    saveSettings({ music: false });
    const { music } = renderButtons();
    fireEvent.pointerDown(screen.getByText("Rules"));
    expect(music.setPlaying).toHaveBeenLastCalledWith(false);
  });

  it("pauses the music while the page is hidden", () => {
    const { music } = renderButtons();
    fireEvent.pointerDown(screen.getByText("Rules"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(music.setPlaying).toHaveBeenLastCalledWith(false);
  });

  it("stops the music when it goes away", () => {
    const audio = fakeAudio();
    const { unmount } = render(<button type="button">Rules</button>, { wrapper: audio.Wrapper });
    fireEvent.pointerDown(screen.getByText("Rules"));
    unmount();
    expect(audio.music.setPlaying).toHaveBeenLastCalledWith(false);
  });

  it("never plays the same shake twice in a row", () => {
    const { played, Wrapper } = fakeAudio();
    const { result } = renderHook(() => useSound(), { wrapper: Wrapper });
    for (let i = 0; i < 50; i++) act(() => result.current.playShake());
    expect(played).toHaveLength(50);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
  });
});
