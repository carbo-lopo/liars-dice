/** "← Back", top right of a screen opened over another (Rules, Options). */
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={backButtonStyle}>
      &larr; Back
    </button>
  );
}

const backButtonStyle = {
  background: "transparent",
  color: "var(--text-primary)",
  border: "1px solid var(--panel-border)",
  borderRadius: 8,
  padding: "8px 16px",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
} as const;
