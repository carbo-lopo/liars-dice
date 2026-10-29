import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTO_CONTINUE_MS } from "../components/ContinueButton";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, SettingsProvider } from "../settings/settings";
import { OptionsScreen } from "./OptionsScreen";

afterEach(() => {
  window.localStorage.clear();
});

function renderOptions() {
  const onBack = vi.fn();
  render(
    <SettingsProvider>
      <OptionsScreen onBack={onBack} />
    </SettingsProvider>,
  );
  return { onBack, toggle: () => screen.getByRole("switch", { name: "Auto-continue after bot bids" }) };
}

describe("OptionsScreen", () => {
  it("shows auto-continue on by default and saves turning it off", () => {
    const { toggle } = renderOptions();
    expect(toggle()).toHaveProperty("checked", true);

    fireEvent.click(toggle());
    expect(toggle()).toHaveProperty("checked", false);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual({ ...DEFAULT_SETTINGS, autoContinue: false });
  });

  it("links the switch to a description that gives the real countdown length", () => {
    const { toggle } = renderOptions();
    const hint = document.getElementById(toggle().getAttribute("aria-describedby")!);
    expect(hint).not.toBeNull();
    expect(hint!.textContent).toContain(`${AUTO_CONTINUE_MS / 1000} seconds`);
  });

  it("goes back when Back is pressed", () => {
    const { onBack } = renderOptions();
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("switches sound effects and music independently, and saves both", () => {
    renderOptions();
    const effects = screen.getByRole("switch", { name: "Sound effects" });
    const music = screen.getByRole("switch", { name: "Music" });
    expect(effects).toHaveProperty("checked", true);
    expect(music).toHaveProperty("checked", true);

    fireEvent.click(music);
    expect(music).toHaveProperty("checked", false);
    expect(effects).toHaveProperty("checked", true);
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual({ ...DEFAULT_SETTINGS, music: false });
  });

  it("credits the music under its switch, with links to the source and the licence", () => {
    renderOptions();
    const music = screen.getByRole("switch", { name: "Music" });
    const credit = document.getElementById(music.getAttribute("aria-describedby")!)!;
    expect(credit.textContent).toContain("“Vibing Over Venus” by Kevin MacLeod");
    const links = [...credit.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toEqual(["https://incompetech.com", "https://creativecommons.org/licenses/by/4.0/"]);
  });
});
