export function RulesButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={rulesButtonStyle}>
      Rules
    </button>
  );
}

const rulesButtonStyle = {
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
