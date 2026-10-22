import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, SettingsProvider, useSettings } from "./settings";

const wrapper = ({ children }: { children: ReactNode }) => <SettingsProvider>{children}</SettingsProvider>;
const saved = () => JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");

afterEach(() => {
  window.localStorage.clear();
});

describe("settings", () => {
  it("starts from the defaults when nothing is saved", () => {
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.settings.autoContinue).toBe(true);
  });

  it("saves a change so the next visit starts with it", () => {
    const first = renderHook(() => useSettings(), { wrapper });
    act(() => first.result.current.updateSettings({ autoContinue: false }));
    expect(first.result.current.settings.autoContinue).toBe(false);
    expect(saved()).toEqual({ autoContinue: false });
    first.unmount();

    const next = renderHook(() => useSettings(), { wrapper });
    expect(next.result.current.settings.autoContinue).toBe(false);
  });

  it("ignores saved values that are missing, the wrong type, or not JSON", () => {
    for (const raw of ["{}", '{"autoContinue":"no"}', "not json", "null"]) {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, raw);
      const { result, unmount } = renderHook(() => useSettings(), { wrapper });
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
      unmount();
    }
  });

  it("keeps working with the defaults when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useSettings(), { wrapper });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    act(() => result.current.updateSettings({ autoContinue: false }));
    expect(result.current.settings.autoContinue).toBe(false);
  });

  it("refuses to be used outside a SettingsProvider", () => {
    expect(() => renderHook(() => useSettings())).toThrow(/SettingsProvider/);
  });
});
