import { useId, type ReactNode } from "react";
import { BackButton } from "../components/BackButton.js";
import { AUTO_CONTINUE_MS } from "../components/ContinueButton.js";
import { TableFrame } from "../components/TableFrame.js";
import { useSettings } from "../settings/settings.js";

export function OptionsScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings } = useSettings();

  return (
    <TableFrame>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, color: "var(--text-primary)" }}>
          Options
        </h1>
        <BackButton onClick={onBack} />
      </div>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Gameplay</h2>
        <SettingSwitch
          label="Auto-continue after bot bids"
          checked={settings.autoContinue}
          onChange={(autoContinue) => updateSettings({ autoContinue })}
        >
          Automatically continue after {AUTO_CONTINUE_MS / 1000} seconds. You can hover over the continue button to
          pause the countdown.
        </SettingSwitch>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Sound</h2>
        <SettingSwitch
          label="Sound effects"
          checked={settings.soundEffects}
          onChange={(soundEffects) => updateSettings({ soundEffects })}
        />
        <SettingSwitch label="Music" checked={settings.music} onChange={(music) => updateSettings({ music })}>
          &ldquo;Vibing Over Venus&rdquo; by Kevin MacLeod (
          <a href="https://incompetech.com" target="_blank" rel="noreferrer" style={linkStyle}>
            incompetech.com
          </a>
          ), licensed under{" "}
          <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" style={linkStyle}>
            Creative Commons: By Attribution 4.0
          </a>
          .
        </SettingSwitch>
      </section>
    </TableFrame>
  );
}

/** A labelled on/off switch with a line of explanation under it. */
function SettingSwitch({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  const hintId = useId();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minHeight: 44 }}>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={children ? hintId : undefined}
          style={{ width: 20, height: 20, margin: 0, accentColor: "var(--gold)", cursor: "pointer" }}
        />
        <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{label}</span>
      </label>
      {children && (
        <p id={hintId} style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
          {children}
        </p>
      )}
    </div>
  );
}

const sectionStyle = {
  background: "var(--panel-bg)",
  border: "1px solid var(--panel-border)",
  borderRadius: 10,
  padding: "16px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
} as const;

const sectionTitleStyle = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 17,
  color: "var(--gold)",
} as const;

const linkStyle = { color: "var(--gold-strong)" } as const;
