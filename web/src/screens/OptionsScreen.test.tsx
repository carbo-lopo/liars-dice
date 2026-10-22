import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_STORAGE_KEY, SettingsProvider } from "../settings/settings";
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
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual({ autoContinue: false });
  });

  it("explains the setting to screen readers", () => {
    const { toggle } = renderOptions();
    const hint = document.getElementById(toggle().getAttribute("aria-describedby")!);
    expect(hint?.textContent).toMatch(/presses itself/);
  });

  it("goes back when Back is pressed", () => {
    const { onBack } = renderOptions();
    fireEvent.click(screen.getByRole("button", { name: "← Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
