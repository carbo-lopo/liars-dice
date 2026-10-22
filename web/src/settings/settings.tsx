import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Player preferences that last between visits. */
export interface Settings {
  /** Bot bids' Continue button presses itself after a countdown. */
  autoContinue: boolean;
}

export const DEFAULT_SETTINGS: Settings = { autoContinue: true };

export const SETTINGS_STORAGE_KEY = "liars-dice.settings";

/** Reads saved settings, falling back to the defaults for anything missing, invalid, or unreadable. */
function loadSettings(): Settings {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");
    if (typeof saved !== "object" || saved === null) return DEFAULT_SETTINGS;
    const { autoContinue } = saved as Partial<Record<keyof Settings, unknown>>;
    return {
      autoContinue: typeof autoContinue === "boolean" ? autoContinue : DEFAULT_SETTINGS.autoContinue,
    };
  } catch {
    // Storage can be blocked (e.g. some private windows); play on with the defaults.
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Not being able to save only means the choice won't outlast this visit.
  }
}

interface SettingsApi {
  settings: Settings;
  updateSettings: (changes: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings);
  // Only a player's own choices are saved, so a setting they never touched
  // keeps following the default if the default changes later.
  const changedRef = useRef(false);

  useEffect(() => {
    if (changedRef.current) saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((changes: Partial<Settings>) => {
    changedRef.current = true;
    setSettings((current) => ({ ...current, ...changes }));
  }, []);

  const api = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsApi {
  const api = useContext(SettingsContext);
  if (!api) throw new Error("useSettings must be used inside a SettingsProvider.");
  return api;
}
