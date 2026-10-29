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
});
