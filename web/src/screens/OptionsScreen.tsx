import { useId } from "react";
import { BackButton } from "../components/BackButton.js";
import { AUTO_CONTINUE_MS } from "../components/ContinueButton.js";
import { TableFrame } from "../components/TableFrame.js";
import { useSettings } from "../settings/settings.js";

export function OptionsScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings } = useSettings();
  const autoContinueHint = useId();

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
        <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minHeight: 44 }}>
          <input
            type="checkbox"
            role="switch"
            checked={settings.autoContinue}
            onChange={(e) => updateSettings({ autoContinue: e.target.checked })}
            aria-describedby={autoContinueHint}
            style={{ width: 20, height: 20, margin: 0, accentColor: "var(--gold)", cursor: "pointer" }}
          />
          <span style={{ fontSize: 15, color: "var(--text-primary)" }}>Auto-continue after bot bids</span>
        </label>
        <p id={autoContinueHint} style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
        Automatically continue after 10 seconds. You can hover over the continue button to pause the countdown.
        </p>
      </section>
    </TableFrame>
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
