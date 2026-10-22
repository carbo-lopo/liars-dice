import type { ReactNode } from "react";

/** The small outlined button used in a screen's header (Rules, Options, Quit Game). */
export function HeaderButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={headerButtonStyle}>
      {children}
    </button>
  );
}

const headerButtonStyle = {
  background: "transparent",
  color: "var(--text-secondary)",
  border: "1px solid var(--panel-border)",
  borderRadius: 8,
  padding: "6px 14px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
} as const;
